import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain.recovery.models import (
    RecoveryCase,
    RecoveryDecision,
    ActionEnum,
    CaseState,
    Intervention
)
from ..domain.payments.models import (
    PaymentAttempt,
    PaymentState,
    RazorpayRawError,
    NormalizedFailure
)
from ..domain.policies.models import PolicyVersion
from ..domain.customers.models import CustomerContext
from ..domain.payments.error_taxonomy import ErrorTaxonomyResolver
from ..domain.recovery.state_machine import RecoveryStateMachine
from ..intelligence.scoring.intent import IntentScoringEngine
from ..intelligence.rail_health.monitor import rail_health_monitor
from ..intelligence.decisioning.nba_engine import NextBestActionEngine
from ..intelligence.rag.engine import rag_engine
from ..agents.multi_agent import MultiAgentLayer
from ..policy.guard import PolicyGuard
from ..infrastructure.database import (
    EventDB, RecoveryCaseDB, PaymentAttemptDB,
    InterventionDB, AuditEventDB, CustomerDB, ReviewTaskDB,
    PolicyDB
)
from ..infrastructure.razorpay.client import razorpay_adapter

class RecoveryOrchestratorService:
    """
    Core application service coordinating recovery case lifecycle, deterministic policy guards,
    audit event recording, and Razorpay side-effects.
    """

    @staticmethod
    async def record_audit_event(
        session: AsyncSession,
        case_id: str,
        event_type: str,
        actor: str = "system",
        payload: Dict[str, Any] = None
    ) -> AuditEventDB:
        audit = AuditEventDB(
            id=f"aud_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            event_type=event_type,
            actor=actor,
            payload_json=json.dumps(payload or {})
        )
        session.add(audit)
        return audit

    @classmethod
    async def ingest_razorpay_webhook(
        cls,
        session: AsyncSession,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Ingests and deduplicates inbound Razorpay webhook events per PRD Section 29.1.
        Returns: (is_new_event, message, case_id)
        """
        # 1. Event Deduplication check
        existing_event = await session.get(EventDB, event_id)
        if existing_event:
            return False, "Duplicate event ignored", None

        # 2. Persist raw event
        event_db = EventDB(
            event_id=event_id,
            event_type=event_type,
            payload_json=json.dumps(payload)
        )
        session.add(event_db)
        await session.flush()

        case_id = None
        # Route to appropriate domain handler
        if event_type == "payment.failed":
            case_id = await cls._handle_payment_failed(session, event_id, payload)
        elif event_type in ["payment.captured", "payment_link.paid", "order.paid"]:
            from .attribution_service import AttributionService
            case_id = await AttributionService.handle_payment_success(session, event_id, event_type, payload)

        await session.commit()
        return True, "Webhook processed successfully", case_id

    @classmethod
    async def _handle_payment_failed(
        cls,
        session: AsyncSession,
        event_id: str,
        payload: Dict[str, Any]
    ) -> str:
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        payment_id = payment_entity.get("id", f"pay_{uuid.uuid4().hex[:10]}")
        order_id = payment_entity.get("order_id") or f"order_{uuid.uuid4().hex[:10]}"
        amount_paise = int(payment_entity.get("amount", 499900))
        method = payment_entity.get("method", "card")
        
        # Extract customer info
        contact = payment_entity.get("contact", "+919876543210")
        email = payment_entity.get("email", "customer@example.com")
        customer_id = f"cust_{hashlib_short(contact)}"

        # Check / Create customer
        customer_db = await session.get(CustomerDB, customer_id)
        if not customer_db:
            customer_db = CustomerDB(
                id=customer_id,
                name=payment_entity.get("notes", {}).get("customer_name", "Demo Customer"),
                contact=contact,
                email=email,
                opt_out=False
            )
            session.add(customer_db)
            await session.flush()

        # Extract Raw Error
        raw_err_data = payment_entity.get("error", {}) or {
            "code": payment_entity.get("error_code"),
            "description": payment_entity.get("error_description"),
            "source": payment_entity.get("error_source"),
            "step": payment_entity.get("error_step"),
            "reason": payment_entity.get("error_reason")
        }
        raw_error = RazorpayRawError(**raw_err_data)
        
        # Step 1: Normalize failure
        normalized = ErrorTaxonomyResolver.normalize_error(raw_error)

        # Step 2: Record rail attempt in Rail Health monitor
        issuer = payment_entity.get("issuer") or payment_entity.get("bank") or "hdfc"
        network = payment_entity.get("network") or "visa"
        rail_health_monitor.record_attempt(method=method, issuer=issuer, network=network, is_success=False)

        # Step 3: Find or Create Recovery Case
        case_id = f"case_{order_id.replace('order_', '')}"
        case_db = await session.get(RecoveryCaseDB, case_id)
        
        if not case_db:
            # Build Customer Context
            ctx = CustomerContext(
                customer_id=customer_id,
                payment_attempt_started=True,
                payment_method_selected=True,
                checkout_details_completed=True,
                is_opted_out=customer_db.opt_out
            )
            intent_score = IntentScoringEngine.calculate_intent_score(ctx)
            opp_score = IntentScoringEngine.calculate_recovery_opportunity(
                intent_score=intent_score,
                failure=normalized,
                customer_opted_out=customer_db.opt_out,
                rail_available=not rail_health_monitor.is_degraded(method, issuer, network)
            ).score

            case_db = RecoveryCaseDB(
                id=case_id,
                merchant_id="default_merchant",
                customer_id=customer_id,
                order_id=order_id,
                domain="PAYMENT_FAILURE",
                amount_paise=amount_paise,
                currency="INR",
                state=CaseState.READY_FOR_ACTION.value,
                intent_score=intent_score,
                recovery_opportunity_score=opp_score,
                attempts_count=1,
                contact_count_24h=0,
                active_charge_actions=0,
                latest_failure_reason=normalized.description,
                latest_failure_code=normalized.reason_code,
                payment_method=method,
                issuer=issuer,
                network=network,
                customer_opted_out=customer_db.opt_out
            )
            session.add(case_db)
        else:
            case_db.attempts_count += 1
            case_db.latest_failure_reason = normalized.description
            case_db.latest_failure_code = normalized.reason_code

        # Step 4: Record Payment Attempt
        attempt_db = PaymentAttemptDB(
            id=f"att_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            payment_id=payment_id,
            order_id=order_id,
            amount_paise=amount_paise,
            method=method,
            status="failed",
            raw_error_json=json.dumps(raw_error.model_dump()),
            normalized_failure_json=json.dumps(normalized.model_dump())
        )
        session.add(attempt_db)
        
        await cls.record_audit_event(
            session=session,
            case_id=case_id,
            event_type="PAYMENT_FAILED_INGESTED",
            payload={
                "payment_id": payment_id,
                "amount_inr": amount_paise / 100.0,
                "failure_code": normalized.reason_code,
                "reason": normalized.description,
                "owner": normalized.owner.value,
                "retry_semantics": normalized.retry_semantics.value
            }
        )

        return case_id

    @classmethod
    async def evaluate_case_decision(
        cls,
        session: AsyncSession,
        case_id: str
    ) -> RecoveryDecision:
        """Runs the Next-Best-Action Decision Engine in dry-run mode"""
        case_db = await session.get(RecoveryCaseDB, case_id)
        if not case_db:
            raise ValueError(f"Recovery case {case_id} not found")

        # Reconstruct Domain Object
        case = RecoveryCase(
            id=case_db.id,
            merchant_id=case_db.merchant_id,
            customer_id=case_db.customer_id,
            order_id=case_db.order_id,
            amount_paise=case_db.amount_paise,
            currency=case_db.currency,
            state=CaseState(case_db.state),
            intent_score=case_db.intent_score,
            recovery_opportunity_score=case_db.recovery_opportunity_score,
            attempts_count=case_db.attempts_count,
            contact_count_24h=case_db.contact_count_24h,
            active_charge_actions=case_db.active_charge_actions,
            latest_failure_reason=case_db.latest_failure_reason,
            latest_failure_code=case_db.latest_failure_code,
            payment_method=case_db.payment_method,
            issuer=case_db.issuer,
            network=case_db.network,
            customer_opted_out=case_db.customer_opted_out,
            created_at=case_db.created_at.isoformat(),
            updated_at=case_db.updated_at.isoformat()
        )

        # Construct failure representation
        raw_error = RazorpayRawError(
            code=case_db.latest_failure_code,
            reason=case_db.latest_failure_code,
            description=case_db.latest_failure_reason
        )
        normalized = ErrorTaxonomyResolver.normalize_error(raw_error)

        policy = PolicyVersion(
            id="pol_default",
            version="v1.0",
            max_attempts_per_case=2,
            max_active_charge_actions=1,
            high_value_threshold=10000.0,
            human_review_threshold=25000.0,
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat()
        )

        decision = NextBestActionEngine.evaluate(
            case=case,
            failure=normalized,
            policy=policy,
            current_payment_state=PaymentState.FAILED
        )

        await cls.record_audit_event(
            session=session,
            case_id=case_id,
            event_type="DECISION_EVALUATED",
            payload={
                "recommended_action": decision.recommended_action.value,
                "policy_verdict": decision.policy.verdict,
                "evidence_ids": decision.evidence_ids,
                "rationale": decision.rationale
            }
        )

        return decision

    @classmethod
    async def execute_case_action(
        cls,
        session: AsyncSession,
        case_id: str,
        action_override: Optional[ActionEnum] = None
    ) -> Intervention:
        """
        Executes authorized recovery action with strict idempotency and Razorpay side effect.
        """
        case_db = await session.get(RecoveryCaseDB, case_id)
        if not case_db:
            raise ValueError(f"Recovery case {case_id} not found")

        decision = await cls.evaluate_case_decision(session, case_id)
        action_to_run = action_override or decision.recommended_action
        
        # Re-check policy before execution under transaction
        policy = PolicyVersion(
            id="pol_default",
            version="v1.0",
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat()
        )
        
        # Domain reconstruction for policy check
        case_obj = RecoveryCase(
            id=case_db.id,
            merchant_id=case_db.merchant_id,
            customer_id=case_db.customer_id,
            order_id=case_db.order_id,
            amount_paise=case_db.amount_paise,
            state=CaseState(case_db.state),
            intent_score=case_db.intent_score,
            recovery_opportunity_score=case_db.recovery_opportunity_score,
            attempts_count=case_db.attempts_count,
            contact_count_24h=case_db.contact_count_24h,
            active_charge_actions=case_db.active_charge_actions,
            customer_opted_out=case_db.customer_opted_out,
            created_at=case_db.created_at.isoformat(),
            updated_at=case_db.updated_at.isoformat()
        )
        
        guard_check = PolicyGuard.evaluate_action(
            case=case_obj,
            action=action_to_run,
            policy=policy
        )

        idempotency_key = PolicyGuard.generate_idempotency_key(
            merchant_id=case_db.merchant_id,
            case_id=case_id,
            action=action_to_run,
            policy_version=policy.version
        )

        # Check existing execution with idempotency key
        stmt = select(InterventionDB).where(InterventionDB.idempotency_key == idempotency_key)
        res = await session.execute(stmt)
        existing_intervention = res.scalar_one_or_none()
        if existing_intervention:
            return Intervention(
                id=existing_intervention.id,
                case_id=existing_intervention.case_id,
                action=ActionEnum(existing_intervention.action),
                policy_verdict=existing_intervention.policy_verdict,
                execution_state=existing_intervention.execution_state,
                idempotency_key=existing_intervention.idempotency_key,
                external_reference_id=existing_intervention.external_reference_id,
                payment_link_url=existing_intervention.payment_link_url,
                customer_message=existing_intervention.customer_message,
                discount_amount=existing_intervention.discount_amount,
                created_at=existing_intervention.created_at.isoformat(),
                executed_at=existing_intervention.executed_at.isoformat() if existing_intervention.executed_at else None
            )

        if guard_check.verdict == "blocked":
            intervention_db = InterventionDB(
                id=f"int_{uuid.uuid4().hex[:12]}",
                case_id=case_id,
                action=action_to_run.value,
                policy_verdict="blocked",
                execution_state="blocked",
                idempotency_key=idempotency_key,
                customer_message=f"Action blocked by policy: {guard_check.reason}"
            )
            session.add(intervention_db)
            case_db.state = CaseState.ACTION_BLOCKED.value
            await cls.record_audit_event(
                session=session,
                case_id=case_id,
                event_type="ACTION_BLOCKED_BY_POLICY",
                payload={"action": action_to_run.value, "reason": guard_check.reason}
            )
            await session.commit()
            raise ValueError(f"Action blocked by PolicyGuard: {guard_check.reason}")

        if guard_check.verdict == "escalate" or action_to_run == ActionEnum.ESCALATE_HUMAN:
            # Create review task for human operator
            brief = MultiAgentLayer.generate_escalation_brief(
                case=case_obj,
                failure=ErrorTaxonomyResolver.normalize_error(RazorpayRawError(description=case_db.latest_failure_reason)),
                rail_status="DEGRADED" if rail_health_monitor.is_degraded(case_db.payment_method or "card") else "HEALTHY",
                stopped_reason=guard_check.reason,
                recommended_action=action_to_run
            )
            task_db = ReviewTaskDB(
                id=f"rev_{uuid.uuid4().hex[:12]}",
                case_id=case_id,
                priority="HIGH",
                status="PENDING",
                diagnostic_brief_json=json.dumps(brief.model_dump())
            )
            session.add(task_db)
            case_db.state = CaseState.ESCALATED.value
            await cls.record_audit_event(
                session=session,
                case_id=case_id,
                event_type="ESCALATED_TO_HUMAN_REVIEW",
                payload={"task_id": task_db.id, "reason": guard_check.reason}
            )
            await session.commit()
            
            return Intervention(
                id=task_db.id,
                case_id=case_id,
                action=ActionEnum.ESCALATE_HUMAN,
                policy_verdict="escalate",
                execution_state="pending",
                idempotency_key=idempotency_key,
                customer_message="Escalated to human operator review queue.",
                created_at=datetime.now(timezone.utc).isoformat()
            )

        # Execute Side Effect (Razorpay Standard Payment Link or Retry notification)
        external_id = None
        payment_url = None
        msg_payload = MultiAgentLayer.run_communicator(
            action=action_to_run,
            amount_inr=case_db.amount_paise / 100.0
        )
        
        if action_to_run == ActionEnum.STANDARD_PAYMENT_LINK:
            plink_res = await razorpay_adapter.create_standard_payment_link(
                amount_paise=case_db.amount_paise,
                currency="INR",
                description=f"Recovery checkout for Order #{case_db.order_id}",
                customer_name="Valued Customer",
                customer_contact="+919876543210",
                idempotency_key=idempotency_key,
                notes={"case_id": case_id, "order_id": case_db.order_id or ""}
            )
            external_id = plink_res.get("id")
            payment_url = plink_res.get("short_url")
            msg_payload = MultiAgentLayer.run_communicator(
                action=action_to_run,
                amount_inr=case_db.amount_paise / 100.0,
                payment_link=payment_url
            )
            case_db.active_charge_actions += 1

        case_db.state = CaseState.ACTION_EXECUTED.value
        case_db.contact_count_24h += 1
        now_dt = datetime.now(timezone.utc)
        
        intervention_db = InterventionDB(
            id=f"int_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            action=action_to_run.value,
            policy_verdict="allowed",
            execution_state="executed",
            idempotency_key=idempotency_key,
            external_reference_id=external_id,
            payment_link_url=payment_url,
            customer_message=msg_payload.get("english", ""),
            created_at=now_dt,
            executed_at=now_dt
        )
        session.add(intervention_db)
        
        await cls.record_audit_event(
            session=session,
            case_id=case_id,
            event_type="ACTION_EXECUTED",
            payload={
                "action": action_to_run.value,
                "external_id": external_id,
                "payment_url": payment_url,
                "idempotency_key": idempotency_key
            }
        )
        
        await session.commit()
        
        return Intervention(
            id=intervention_db.id,
            case_id=case_id,
            action=action_to_run,
            policy_verdict="allowed",
            execution_state="executed",
            idempotency_key=idempotency_key,
            external_reference_id=external_id,
            payment_link_url=payment_url,
            customer_message=intervention_db.customer_message,
            created_at=now_dt.isoformat(),
            executed_at=now_dt.isoformat()
        )

    @classmethod
    async def process_opt_out(cls, session: AsyncSession, customer_id: str, trigger_word: str):
        """Executes Section 14.2 STOP Workflow immediately"""
        customer = await session.get(CustomerDB, customer_id)
        if customer:
            customer.opt_out = True
            
        # Update all active cases for this customer
        stmt = select(RecoveryCaseDB).where(
            RecoveryCaseDB.customer_id == customer_id,
            RecoveryCaseDB.state.notin_(["RECOVERED", "STOPPED", "EXPIRED"])
        )
        res = await session.execute(stmt)
        cases = res.scalars().all()
        for c in cases:
            c.customer_opted_out = True
            c.state = CaseState.STOPPED.value
            await cls.record_audit_event(
                session=session,
                case_id=c.id,
                event_type="CUSTOMER_OPT_OUT_STOP_TRIGGERED",
                payload={"trigger_keyword": trigger_word}
            )
            
        await session.commit()

def hashlib_short(val: str) -> str:
    import hashlib
    return hashlib.md5(val.encode()).hexdigest()[:8]
