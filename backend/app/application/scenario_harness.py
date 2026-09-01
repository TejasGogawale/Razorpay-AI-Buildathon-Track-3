import json
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .recovery_service import RecoveryOrchestratorService
from .attribution_service import AttributionService
from ..intelligence.rail_health.monitor import rail_health_monitor
from ..domain.recovery.models import ActionEnum

class ScenarioRunnerHarness:
    """
    Deterministic Demo & Failure Injection Harness based on PRD Section 33.
    Replays scenarios with production-like execution boundaries.
    """

    @classmethod
    async def trigger_scenario(
        cls,
        session: AsyncSession,
        scenario_id: str,
        custom_amount: Optional[float] = None
    ) -> Dict[str, Any]:
        with open("data/fixtures/scenarios.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            
        scenario = next((s for s in data["scenarios"] if s["id"] == scenario_id), None)
        if not scenario:
            raise ValueError(f"Scenario {scenario_id} not found")

        amount_inr = custom_amount or scenario.get("amount_inr", 4999.0)
        amount_paise = int(amount_inr * 100)
        
        # 1. Handle Rail Degradation Spike scenario
        if scenario_id == "rail_degradation_spike":
            rail_health_monitor.inject_degradation_spike(
                method=scenario.get("method", "upi"),
                issuer=scenario.get("issuer", "sbi")
            )
            return {
                "scenario_id": scenario_id,
                "status": "degradation_injected",
                "message": f"Rail health spike injected for {scenario.get('method')} on {scenario.get('issuer')}. Success rate dropped to 10% (DEGRADED).",
                "rail_status": "DEGRADED"
            }

        # 2. Handle Customer STOP Opt-Out scenario
        if scenario_id == "customer_opt_out_stop":
            test_cust_id = f"cust_demo_stop_{uuid.uuid4().hex[:6]}"
            await RecoveryOrchestratorService.process_opt_out(
                session=session,
                customer_id=test_cust_id,
                trigger_word="STOP"
            )
            return {
                "scenario_id": scenario_id,
                "status": "opt_out_processed",
                "customer_id": test_cust_id,
                "message": "STOP received. Customer communication shield permanently activated. All automated recovery actions blocked.",
                "policy_verdict": "blocked"
            }

        # 3. Handle Standard Payment Failure / Ambiguity Webhooks
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        order_id = f"order_{uuid.uuid4().hex[:10]}"
        payment_id = f"pay_{uuid.uuid4().hex[:10]}"
        
        # Build standard Razorpay webhook payload
        payload = {
            "entity": "event",
            "account_id": "acc_mock_merchant",
            "event": scenario.get("event_type", "payment.failed"),
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "order_id": order_id,
                        "amount": amount_paise,
                        "currency": "INR",
                        "status": scenario.get("payment_state", "failed"),
                        "method": scenario.get("method", "card"),
                        "issuer": scenario.get("issuer", "hdfc"),
                        "network": scenario.get("network", "visa"),
                        "contact": "+919876543210",
                        "email": "customer@example.com",
                        "error_code": scenario.get("error", {}).get("code"),
                        "error_description": scenario.get("error", {}).get("description"),
                        "error_source": scenario.get("error", {}).get("source"),
                        "error_step": scenario.get("error", {}).get("step"),
                        "error_reason": scenario.get("error", {}).get("reason"),
                        "notes": {
                            "customer_name": "Demo Shopper",
                            "order_id": order_id
                        }
                    }
                }
            },
            "created_at": 1725000000
        }

        # Ingest webhook through application service
        is_new, msg, case_id = await RecoveryOrchestratorService.ingest_razorpay_webhook(
            session=session,
            event_id=event_id,
            event_type=payload["event"],
            payload=payload
        )

        # Run decision engine
        decision = await RecoveryOrchestratorService.evaluate_case_decision(session, case_id)
        
        # Execute action if allowed by policy
        intervention = None
        if decision.policy.verdict == "allowed" and decision.recommended_action != ActionEnum.STOP:
            intervention = await RecoveryOrchestratorService.execute_case_action(
                session=session,
                case_id=case_id
            )

        return {
            "scenario_id": scenario_id,
            "case_id": case_id,
            "order_id": order_id,
            "payment_id": payment_id,
            "amount_inr": amount_inr,
            "decision": decision.model_dump(),
            "intervention": intervention.model_dump() if intervention else None,
            "policy_verdict": decision.policy.verdict,
            "recommended_action": decision.recommended_action.value
        }

    @classmethod
    async def simulate_customer_recovery_payment(
        cls,
        session: AsyncSession,
        case_id: str
    ) -> Dict[str, Any]:
        """Simulates customer completing payment via recovery link to demonstrate full loop attribution"""
        event_id = f"evt_success_{uuid.uuid4().hex[:10]}"
        pay_id = f"pay_rec_{uuid.uuid4().hex[:10]}"
        
        payload = {
            "entity": "event",
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": pay_id,
                        "order_id": f"order_{case_id.replace('case_', '')}",
                        "amount": 499900,
                        "currency": "INR",
                        "status": "captured",
                        "method": "upi",
                        "notes": {"case_id": case_id}
                    }
                }
            }
        }
        
        is_new, msg, cid = await RecoveryOrchestratorService.ingest_razorpay_webhook(
            session=session,
            event_id=event_id,
            event_type="payment.captured",
            payload=payload
        )
        
        return {
            "status": "payment_captured",
            "case_id": case_id,
            "payment_id": pay_id,
            "message": "Payment captured event processed and attributed to recovery case."
        }
