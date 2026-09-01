import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain.recovery.models import CaseState, RecoveryAttribution
from ..infrastructure.database import (
    RecoveryCaseDB, InterventionDB, RecoveryAttributionDB,
    AuditEventDB, PaymentAttemptDB
)

class AttributionService:
    """
    Causal Revenue Recovery Attribution Engine based on PRD Section 25.
    Links subsequent successful payments back to the recovery case and preceding intervention.
    """

    @classmethod
    async def handle_payment_success(
        cls,
        session: AsyncSession,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> Optional[str]:
        """
        Handles payment.captured / payment_link.paid / order.paid events and establishes attribution.
        """
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        plink_entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
        order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})
        
        payment_id = payment_entity.get("id") or f"pay_{uuid.uuid4().hex[:10]}"
        order_id = payment_entity.get("order_id") or plink_entity.get("order_id") or order_entity.get("id")
        amount_paise = int(payment_entity.get("amount") or plink_entity.get("amount") or 499900)
        
        # Try to locate existing recovery case by order_id or notes
        case_id = None
        notes = payment_entity.get("notes") or plink_entity.get("notes") or {}
        if "case_id" in notes:
            case_id = notes["case_id"]
        elif order_id:
            case_id = f"case_{order_id.replace('order_', '')}"

        if not case_id:
            return None

        case_db = await session.get(RecoveryCaseDB, case_id)
        if not case_db:
            return None

        # Check if already attributed to prevent duplicate attribution
        stmt = select(RecoveryAttributionDB).where(RecoveryAttributionDB.case_id == case_id)
        res = await session.execute(stmt)
        existing_attr = res.scalar_one_or_none()
        if existing_attr:
            return case_id

        # Find preceding intervention
        int_stmt = select(InterventionDB).where(
            InterventionDB.case_id == case_id,
            InterventionDB.execution_state == "executed"
        ).order_by(InterventionDB.created_at.desc())
        int_res = await session.execute(int_stmt)
        last_intervention = int_res.scalar_one_or_none()

        now_dt = datetime.now(timezone.utc)
        case_created_dt = case_db.created_at.replace(tzinfo=timezone.utc) if (case_db.created_at and case_db.created_at.tzinfo is None) else (case_db.created_at or now_dt)
        time_to_recovery = int((now_dt - case_created_dt).total_seconds())

        # Create Attribution Record
        attr_db = RecoveryAttributionDB(
            id=f"att_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            intervention_id=last_intervention.id if last_intervention else None,
            payment_id=payment_id,
            amount_paise=amount_paise,
            recovered_amount_inr=amount_paise / 100.0,
            time_to_recovery_seconds=max(1, time_to_recovery),
            attribution_window_minutes=60,
            confidence=0.98 if last_intervention else 0.50
        )
        session.add(attr_db)

        # Update case state to RECOVERED
        case_db.state = CaseState.RECOVERED.value
        case_db.active_charge_actions = 0

        # Add payment attempt record for success
        attempt_db = PaymentAttemptDB(
            id=f"att_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            payment_id=payment_id,
            order_id=order_id,
            amount_paise=amount_paise,
            method=payment_entity.get("method", "upi"),
            status="captured",
            raw_error_json=None,
            normalized_failure_json=None
        )
        session.add(attempt_db)

        # Record audit event
        audit = AuditEventDB(
            id=f"aud_{uuid.uuid4().hex[:12]}",
            case_id=case_id,
            event_type="REVENUE_RECOVERED_ATTRIBUTED",
            actor="attribution-engine",
            payload_json=json.dumps({
                "recovered_amount_inr": amount_paise / 100.0,
                "payment_id": payment_id,
                "intervention_id": last_intervention.id if last_intervention else None,
                "time_to_recovery_seconds": time_to_recovery,
                "action_type": last_intervention.action if last_intervention else "ORGANIC"
            })
        )
        session.add(audit)
        await session.commit()

        return case_id

    @classmethod
    async def get_dashboard_metrics(cls, session: AsyncSession) -> Dict[str, Any]:
        """Calculates aggregate merchant KPIs per PRD Section 25.2"""
        # 1. Total cases & Revenue at risk
        cases_res = await session.execute(select(RecoveryCaseDB))
        all_cases = cases_res.scalars().all()
        
        total_cases = len(all_cases)
        revenue_at_risk_inr = sum(c.amount_paise for c in all_cases) / 100.0 if all_cases else 0.0
        
        # 2. Total recovered revenue
        attr_res = await session.execute(select(RecoveryAttributionDB))
        all_attrs = attr_res.scalars().all()
        
        recovered_revenue_inr = sum(a.recovered_amount_inr for a in all_attrs)
        recovered_cases_count = len(all_attrs)
        recovery_rate = (recovered_revenue_inr / max(1.0, revenue_at_risk_inr)) * 100.0
        
        # 3. Time to recovery average
        avg_recovery_time_sec = (
            sum(a.time_to_recovery_seconds for a in all_attrs) / max(1, recovered_cases_count)
            if all_attrs else 0
        )

        # 4. Interventions count & Policy blocks
        int_res = await session.execute(select(InterventionDB))
        all_ints = int_res.scalars().all()
        executed_interventions = [i for i in all_ints if i.execution_state == "executed"]
        blocked_interventions = [i for i in all_ints if i.execution_state == "blocked"]
        
        intervention_rate = (len(executed_interventions) / max(1, total_cases)) * 100.0
        policy_block_rate = (len(blocked_interventions) / max(1, len(all_ints))) * 100.0 if all_ints else 0.0

        # Active open cases count
        active_cases_count = sum(1 for c in all_cases if c.state in [
            CaseState.OPEN.value,
            CaseState.READY_FOR_ACTION.value,
            CaseState.ACTION_PROPOSED.value,
            CaseState.ACTION_EXECUTED.value,
            CaseState.WAITING.value,
            CaseState.ESCALATED.value
        ])

        return {
            "revenue_at_risk_inr": round(revenue_at_risk_inr, 2),
            "recovered_revenue_inr": round(recovered_revenue_inr, 2),
            "recovery_rate_percentage": round(recovery_rate, 2),
            "total_cases_count": total_cases,
            "recovered_cases_count": recovered_cases_count,
            "active_cases_count": active_cases_count,
            "avg_time_to_recovery_minutes": round(avg_recovery_time_sec / 60.0, 1),
            "intervention_rate_percentage": round(intervention_rate, 2),
            "policy_block_rate_percentage": round(policy_block_rate, 2),
            "duplicate_prevention_count": len([i for i in all_ints if "duplicate" in (i.customer_message or "").lower() or "unresolved" in (i.customer_message or "").lower()])
        }
