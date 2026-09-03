import uuid
import json
import os
import csv
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

    _cached_behavioral_data = None

    @classmethod
    def _get_cached_behavioral_revenue_patterns(cls) -> Dict[str, Any]:
        if cls._cached_behavioral_data:
            return cls._cached_behavioral_data

        csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "customer_recovery_and_behavioral_dataset.csv"))
        if not os.path.exists(csv_path):
            return {}

        archs = {}
        triggers = {}
        total_vol = 0.0
        total_recoverable = 0.0
        total_lost = 0.0

        ARCHETYPE_METADATA = {
            "Loyal Repeat Buyer": {
                "desc": "VIP customers with high historical LTV and habitual checkout cadence. Losses are almost purely technical bank switch outages.",
                "strategy": "Frictionless Priority Alternate Payment Link (Zero discount needed)."
            },
            "Window Shopper Abandoner": {
                "desc": "Casual browsers checking total landed costs and fees. Highest cart drop-off volume without urgency incentives.",
                "strategy": "Limited-time 24h Stock Hold Reservation alert with scarcity push."
            },
            "Friction-Averse 1-Tap Speed": {
                "desc": "Mobile shoppers with high intent but zero tolerance for gateway redirects or slow bank pages.",
                "strategy": "Instant 1-Tap WhatsApp UPI Intent Deep-Link."
            },
            "Anxious & Security Conscious": {
                "desc": "Customers with prolonged hesitation dwell times fearing double-deduction. 98%+ recoverable when reassured.",
                "strategy": "Bilingual Voice & Text Reassurance confirming zero deduction."
            },
            "Chronic Deal Hunter": {
                "desc": "Frequent cart abandoners seeking coupons and promotional codes. High abandonment rate without incentive.",
                "strategy": "Bounded 5% Recovery Incentive & Stock Hold Countdown."
            },
            "First-Time Skeptical": {
                "desc": "New customers with trust deficits at payment authorization. Suspicious of unfamiliar gateways.",
                "strategy": "Razorpay Verified Trust Badges and 24h order hold comfort."
            }
        }

        try:
            with open(csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    amt = float(r.get("amount_inr", 0))
                    total_vol += amt
                    arch = r.get("customer_psychology_archetype", "Unknown")
                    is_rec = (r.get("is_recoverable") == "True" and r.get("opted_out_dnd") == "False")
                    frequent_abandon = (r.get("frequently_abandons_checkout") == "True")
                    trig = r.get("primary_abandonment_trigger", "other")

                    if arch not in archs:
                        archs[arch] = {
                            "archetype": arch,
                            "total_volume_inr": 0.0,
                            "recoverable_volume_inr": 0.0,
                            "lost_volume_inr": 0.0,
                            "recovered_volume_inr": 0.0,
                            "cases_count": 0,
                            "frequent_abandon_cases_count": 0,
                            "description": ARCHETYPE_METADATA.get(arch, {}).get("desc", ""),
                            "optimal_strategy": ARCHETYPE_METADATA.get(arch, {}).get("strategy", "")
                        }

                    archs[arch]["total_volume_inr"] += amt
                    archs[arch]["cases_count"] += 1
                    if frequent_abandon:
                        archs[arch]["frequent_abandon_cases_count"] += 1

                    if is_rec:
                        archs[arch]["recoverable_volume_inr"] += amt
                        total_recoverable += amt
                    else:
                        archs[arch]["lost_volume_inr"] += amt
                        total_lost += amt
                        triggers[trig] = triggers.get(trig, 0.0) + amt

                    if r.get("ground_truth_recovered_ai_policy") == "True":
                        archs[arch]["recovered_volume_inr"] += amt

            archetype_list = []
            for arch, data in archs.items():
                tot = max(1.0, data["total_volume_inr"])
                data["recoverable_pct"] = round((data["recoverable_volume_inr"] / tot) * 100, 1)
                data["lost_pct"] = round((data["lost_volume_inr"] / tot) * 100, 1)
                data["frequent_abandonment_rate_pct"] = round((data["frequent_abandon_cases_count"] / max(1, data["cases_count"])) * 100, 1)
                data["total_volume_inr"] = round(data["total_volume_inr"], 2)
                data["recoverable_volume_inr"] = round(data["recoverable_volume_inr"], 2)
                data["lost_volume_inr"] = round(data["lost_volume_inr"], 2)
                data["recovered_volume_inr"] = round(data["recovered_volume_inr"], 2)
                archetype_list.append(data)

            archetype_list.sort(key=lambda x: x["total_volume_inr"], reverse=True)

            triggers_list = [
                {"trigger": k, "lost_volume_inr": round(v, 2), "percentage": round((v / max(1.0, total_lost)) * 100, 1)}
                for k, v in sorted(triggers.items(), key=lambda x: x[1], reverse=True)
            ]

            cls._cached_behavioral_data = {
                "total_at_risk_volume_inr": round(total_vol, 2),
                "total_recoverable_revenue_inr": round(total_recoverable, 2),
                "total_lost_revenue_inr": round(total_lost, 2),
                "overall_recoverable_rate_pct": round((total_recoverable / max(1.0, total_vol)) * 100, 1),
                "overall_lost_rate_pct": round((total_lost / max(1.0, total_vol)) * 100, 1),
                "archetypes": archetype_list,
                "abandonment_triggers": triggers_list
            }
        except Exception as e:
            print(f"[AttributionService] Note loading behavioral revenue CSV: {e}")
            cls._cached_behavioral_data = {}

        return cls._cached_behavioral_data or {}

    @classmethod
    async def get_dashboard_metrics(cls, session: AsyncSession) -> Dict[str, Any]:
        """Calculates aggregate merchant KPIs per PRD Section 25.2 with Customer Behavioral Revenue breakdown"""
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

        # 5. Recoverable vs Permanently Lost Revenue from Live Cases
        live_recoverable_cases = [c for c in all_cases if c.state != "STOPPED" and c.state != "NON_RECOVERABLE"]
        live_lost_cases = [c for c in all_cases if c.state == "STOPPED" or c.state == "NON_RECOVERABLE"]
        
        live_recoverable_inr = sum(c.amount_paise for c in live_recoverable_cases) / 100.0 if live_recoverable_cases else 0.0
        live_lost_inr = sum(c.amount_paise for c in live_lost_cases) / 100.0 if live_lost_cases else 0.0

        # 6. Customer Behavioral Revenue Patterns
        behavioral_patterns = cls._get_cached_behavioral_revenue_patterns()

        return {
            "revenue_at_risk_inr": round(revenue_at_risk_inr, 2),
            "recovered_revenue_inr": round(recovered_revenue_inr, 2),
            "recoverable_revenue_inr": round(live_recoverable_inr, 2),
            "lost_revenue_inr": round(live_lost_inr, 2),
            "recovery_rate_percentage": round(recovery_rate, 2),
            "total_cases_count": total_cases,
            "recovered_cases_count": recovered_cases_count,
            "active_cases_count": active_cases_count,
            "avg_time_to_recovery_minutes": round(avg_recovery_time_sec / 60.0, 1),
            "intervention_rate_percentage": round(intervention_rate, 2),
            "policy_block_rate_percentage": round(policy_block_rate, 2),
            "duplicate_prevention_count": len([i for i in all_ints if "duplicate" in (i.customer_message or "").lower() or "unresolved" in (i.customer_message or "").lower()]),
            "customer_behavioral_revenue": behavioral_patterns
        }

