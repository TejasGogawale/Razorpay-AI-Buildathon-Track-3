import hashlib
from datetime import datetime, timezone
from typing import Tuple, List, Optional
from ..domain.recovery.models import ActionEnum, RecoveryCase, PolicyDecision
from ..domain.payments.models import PaymentState
from ..domain.policies.models import PolicyVersion, PolicyEvaluationResult
from ..core.config import settings

class PolicyGuard:
    """
    Deterministic Policy-as-Code Guard based on PRD Section 14 and Section 13.1.
    Evaluates hard constraints, contact budgets, quiet hours, idempotency,
    and duplicate recovery protections.
    """
    
    @classmethod
    def generate_idempotency_key(
        cls, 
        merchant_id: str, 
        case_id: str, 
        action: ActionEnum, 
        policy_version: str = "v1.0"
    ) -> str:
        """
        Deterministic idempotency key formula per PRD Section 29.2:
        hash(merchant_id, case_id, action_type, action_policy_version)
        """
        raw_key = f"{merchant_id}:{case_id}:{action.value}:{policy_version}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @classmethod
    def evaluate_action(
        cls,
        case: RecoveryCase,
        action: ActionEnum,
        policy: PolicyVersion,
        current_payment_state: PaymentState = PaymentState.FAILED,
        current_hour: Optional[int] = None
    ) -> PolicyEvaluationResult:
        passed_rules: List[str] = []
        violated_rules: List[str] = []
        
        amount_inr = case.amount_paise / 100.0
        
        # 1. STOP Action Check
        if action == ActionEnum.STOP:
            return PolicyEvaluationResult(
                verdict="allowed",
                passed_rules=["stop_action_always_permitted"],
                violated_rules=[],
                policy_version=policy.version,
                reason="STOP action unconditionally authorized by safety policy."
            )

        # 2. Consent & Opt-out Shield
        if case.customer_opted_out:
            violated_rules.append("customer_opt_out_shield")
            return PolicyEvaluationResult(
                verdict="blocked",
                passed_rules=passed_rules,
                violated_rules=violated_rules,
                policy_version=policy.version,
                reason="Customer has opted out of communication (STOP active). Automated action blocked."
            )
        passed_rules.append("consent_active")

        # 3. Duplicate Recovery & Payment State Precedence Shield
        if current_payment_state == PaymentState.CAPTURED:
            violated_rules.append("payment_already_captured")
            return PolicyEvaluationResult(
                verdict="blocked",
                passed_rules=passed_rules,
                violated_rules=violated_rules,
                policy_version=policy.version,
                reason="Payment is already captured. No recovery action permitted."
            )
            
        if current_payment_state in [PaymentState.PENDING, PaymentState.UNKNOWN]:
            if action in [ActionEnum.STANDARD_PAYMENT_LINK, ActionEnum.CUSTOMER_RETRY, ActionEnum.ALTERNATE_METHOD]:
                violated_rules.append("payment_state_unresolved_no_charge")
                return PolicyEvaluationResult(
                    verdict="blocked",
                    passed_rules=passed_rules,
                    violated_rules=violated_rules,
                    policy_version=policy.version,
                    reason="Original payment state is pending/unresolved. Charge-producing action blocked to prevent duplicate debit."
                )
        passed_rules.append("payment_state_valid_for_recovery")

        # 4. Active Charge-Producing Action Cap
        if action in [ActionEnum.STANDARD_PAYMENT_LINK, ActionEnum.CUSTOMER_RETRY]:
            if case.active_charge_actions >= policy.max_active_charge_actions:
                violated_rules.append("max_active_charge_actions_exceeded")
                return PolicyEvaluationResult(
                    verdict="blocked",
                    passed_rules=passed_rules,
                    violated_rules=violated_rules,
                    policy_version=policy.version,
                    reason=f"Case already has {case.active_charge_actions} active charge-producing action(s)."
                )
        passed_rules.append("active_charge_actions_within_budget")

        # 5. Contact Fatigue Budget
        if action in [ActionEnum.STANDARD_PAYMENT_LINK, ActionEnum.REMINDER, ActionEnum.INCENTIVE]:
            if case.contact_count_24h >= policy.max_messages_24h:
                violated_rules.append("contact_budget_exhausted_24h")
                return PolicyEvaluationResult(
                    verdict="blocked",
                    passed_rules=passed_rules,
                    violated_rules=violated_rules,
                    policy_version=policy.version,
                    reason=f"Customer reached maximum 24h outreach limit ({case.contact_count_24h}/{policy.max_messages_24h})."
                )
        passed_rules.append("contact_budget_ok")

        # 6. Quiet Hours Check
        now_hour = current_hour if current_hour is not None else datetime.now(timezone.utc).hour
        # Default quiet hours: 22 (10 PM) to 8 (8 AM)
        if policy.quiet_hours_start > policy.quiet_hours_end:
            is_quiet = (now_hour >= policy.quiet_hours_start or now_hour < policy.quiet_hours_end)
        else:
            is_quiet = (policy.quiet_hours_start <= now_hour < policy.quiet_hours_end)
            
        if is_quiet and action in [ActionEnum.REMINDER, ActionEnum.INCENTIVE]:
            violated_rules.append("quiet_hours_restriction")
            return PolicyEvaluationResult(
                verdict="blocked",
                passed_rules=passed_rules,
                violated_rules=violated_rules,
                policy_version=policy.version,
                reason="Current time falls in configured quiet hours window (22:00-08:00)."
            )
        passed_rules.append("quiet_hours_ok")

        # 7. High Value / Risk Escalation Threshold
        if amount_inr >= policy.human_review_threshold or case.attempts_count >= 3:
            if action != ActionEnum.ESCALATE_HUMAN:
                violated_rules.append("requires_human_escalation")
                return PolicyEvaluationResult(
                    verdict="escalate",
                    passed_rules=passed_rules,
                    violated_rules=violated_rules,
                    policy_version=policy.version,
                    reason=f"Transaction value (₹{amount_inr:,.2f}) or retry count ({case.attempts_count}) requires human operator sign-off."
                )
        passed_rules.append("risk_thresholds_ok")

        return PolicyEvaluationResult(
            verdict="allowed",
            passed_rules=passed_rules,
            violated_rules=[],
            policy_version=policy.version,
            reason="All policy-as-code guard conditions verified successfully."
        )
