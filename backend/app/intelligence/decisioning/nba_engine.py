import uuid
from typing import List, Dict, Any, Optional
from ...domain.recovery.models import (
    RecoveryCase,
    RecoveryDecision,
    ActionEnum,
    ActionCandidate,
    CaseState,
    PolicyDecision
)
from ...domain.payments.models import NormalizedFailure, PaymentState, RetrySemantics
from ...domain.policies.models import PolicyVersion
from ..scoring.erv import ERVScoringEngine
from ..rail_health.monitor import rail_health_monitor
from ..rag.engine import rag_engine
from ...policy.guard import PolicyGuard

class NextBestActionEngine:
    """
    Deterministic Next-Best-Action Decision Engine based on PRD Section 11.
    Implements the 11-step decision ordering with hard policy gating and RAG evidence grounding.
    """
    
    @classmethod
    def evaluate(
        cls,
        case: RecoveryCase,
        failure: NormalizedFailure,
        policy: PolicyVersion,
        current_payment_state: PaymentState = PaymentState.FAILED
    ) -> RecoveryDecision:
        amount_inr = case.amount_paise / 100.0
        decision_id = f"dec_{uuid.uuid4().hex[:12]}"
        
        # Check Payment Rail Health
        is_rail_degraded = rail_health_monitor.is_degraded(
            method=case.payment_method or "card",
            issuer=case.issuer,
            network=case.network
        )
        
        # Step 1: Is payment state unresolved / pending?
        if current_payment_state in [PaymentState.PENDING, PaymentState.UNKNOWN]:
            candidate = ActionCandidate(
                action=ActionEnum.WAIT,
                expected_recovery_value=0.0,
                p_recovery=0.1,
                eligibility="eligible",
                reason_codes=["PAYMENT_STATE_PENDING", "RECONCILIATION_REQUIRED_DO_NOT_CHARGE"],
                cost_estimate=0.0
            )
            return RecoveryDecision(
                case_id=case.id,
                decision_id=decision_id,
                state=CaseState.WAITING,
                recommended_action=ActionEnum.WAIT,
                candidate_actions=[candidate],
                policy=PolicyDecision(
                    verdict="allowed",
                    rules=["reconciliation_hold"],
                    policy_version=policy.version
                ),
                evidence_ids=["doc_pol_01"],
                rationale="Payment state is unresolved. Automatic charge actions are halted pending reconciliation."
            )

        # Step 2: Is customer opted out?
        if case.customer_opted_out:
            candidate = ActionCandidate(
                action=ActionEnum.STOP,
                expected_recovery_value=0.0,
                p_recovery=0.0,
                eligibility="eligible",
                reason_codes=["CUSTOMER_OPTED_OUT", "PERMANENT_COMMUNICATION_SHIELD"],
                cost_estimate=0.0
            )
            return RecoveryDecision(
                case_id=case.id,
                decision_id=decision_id,
                state=CaseState.STOPPED,
                recommended_action=ActionEnum.STOP,
                candidate_actions=[candidate],
                policy=PolicyDecision(
                    verdict="allowed",
                    rules=["opt_out_shield"],
                    policy_version=policy.version
                ),
                evidence_ids=["doc_pol_02"],
                rationale="Customer opted out. All automated interventions suppressed."
            )

        # Step 3: Is payment already captured?
        if current_payment_state == PaymentState.CAPTURED:
            candidate = ActionCandidate(
                action=ActionEnum.STOP,
                expected_recovery_value=0.0,
                p_recovery=1.0,
                eligibility="eligible",
                reason_codes=["PAYMENT_ALREADY_CAPTURED", "CASE_COMPLETE"],
                cost_estimate=0.0
            )
            return RecoveryDecision(
                case_id=case.id,
                decision_id=decision_id,
                state=CaseState.RECOVERED,
                recommended_action=ActionEnum.STOP,
                candidate_actions=[candidate],
                policy=PolicyDecision(
                    verdict="allowed",
                    rules=["payment_captured_terminal"],
                    policy_version=policy.version
                ),
                evidence_ids=[],
                rationale="Payment is already captured. Recovery case is completed."
            )

        # Step 4, 5, 6, 7, 8: Generate & Rank Candidate Actions by ERV
        candidates = ERVScoringEngine.evaluate_candidates(
            amount_inr=amount_inr,
            intent_score=case.intent_score,
            failure=failure,
            is_rail_degraded=is_rail_degraded,
            customer_opted_out=case.customer_opted_out,
            attempts_count=case.attempts_count,
            contact_count_24h=case.contact_count_24h,
            allow_incentives=policy.incentive_enabled
        )

        # Step 9: Iterate through ranked candidate actions and apply deterministic PolicyGuard
        selected_action = ActionEnum.STOP
        selected_policy_result = None
        
        for cand in candidates:
            if cand.eligibility != "eligible":
                continue
                
            guard_eval = PolicyGuard.evaluate_action(
                case=case,
                action=cand.action,
                policy=policy,
                current_payment_state=current_payment_state
            )
            
            if guard_eval.verdict == "allowed":
                selected_action = cand.action
                selected_policy_result = guard_eval
                break
            elif guard_eval.verdict == "escalate":
                selected_action = ActionEnum.ESCALATE_HUMAN
                selected_policy_result = guard_eval
                break

        if not selected_policy_result:
            # Fallback to STOP if all candidates blocked
            selected_action = ActionEnum.STOP
            selected_policy_result = PolicyGuard.evaluate_action(case, ActionEnum.STOP, policy)

        # Step 10: RAG Evidence Attachment
        rag_search_query = f"{failure.reason_code} {selected_action.value} recovery"
        rag_results = rag_engine.search(rag_search_query, top_k=2)
        evidence_ids = [r.chunk.id for r in rag_results]

        # Formulate rationale
        rationale_parts = [
            f"Intent score: {case.intent_score}/100.",
            f"Failure cause: {failure.reason_code} ({failure.description}).",
        ]
        if is_rail_degraded:
            rationale_parts.append("Rail health monitor flagged issuer/rail degradation; same-rail retry suppressed.")
        if selected_action == ActionEnum.STANDARD_PAYMENT_LINK:
            rationale_parts.append("Selected Standard Payment Link to offer fresh multi-rail checkout path.")
        elif selected_action == ActionEnum.CUSTOMER_RETRY:
            rationale_parts.append("Instrument and rail healthy; safe for in-app retry.")
        elif selected_action == ActionEnum.ESCALATE_HUMAN:
            rationale_parts.append(f"Escalated to human operator: {selected_policy_result.reason}")

        return RecoveryDecision(
            case_id=case.id,
            decision_id=decision_id,
            state=CaseState.READY_FOR_ACTION,
            recommended_action=selected_action,
            candidate_actions=candidates,
            policy=PolicyDecision(
                verdict=selected_policy_result.verdict,
                rules=selected_policy_result.passed_rules,
                blocked_rules=selected_policy_result.violated_rules,
                policy_version=policy.version,
                idempotency_key=PolicyGuard.generate_idempotency_key(
                    merchant_id=case.merchant_id,
                    case_id=case.id,
                    action=selected_action,
                    policy_version=policy.version
                )
            ),
            evidence_ids=evidence_ids,
            model_provenance={
                "engine": "Deterministic NBA Engine v1.0",
                "rail_degraded": is_rail_degraded,
                "amount_inr": amount_inr,
                "policy_version": policy.version
            },
            rationale=" ".join(rationale_parts)
        )
