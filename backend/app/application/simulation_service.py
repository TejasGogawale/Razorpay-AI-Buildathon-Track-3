import json
import uuid
import sys
import os
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from data.generators.synthetic_dataset import generate_synthetic_recovery_dataset
from ..infrastructure.database import SimulationRunDB

class SimulationService:
    """
    Policy Simulator and Shadow Mode Replay Engine based on PRD Section 24 & 25.
    Compares No Action vs Static Baseline vs AI Policy against 5,000 deterministic cases.
    """
    
    @classmethod
    async def run_simulation(
        cls,
        session: AsyncSession,
        sample_size: int = 5000,
        merchant_margin: float = 0.25
    ) -> Dict[str, Any]:
        run_id = f"sim_run_{uuid.uuid4().hex[:10]}"
        dataset = generate_synthetic_recovery_dataset(count=sample_size, seed=42)

        total_cases = len(dataset)
        total_revenue_at_risk = sum(c["amount_inr"] for c in dataset)

        # 1. Arm: NO ACTION
        no_action_recovered_cases = sum(1 for c in dataset if c["simulated_outcomes"]["NO_ACTION"])
        no_action_recovered_revenue = sum(c["amount_inr"] for c in dataset if c["simulated_outcomes"]["NO_ACTION"])
        no_action_profit = no_action_recovered_revenue * merchant_margin

        # 2. Arm: STATIC BASELINE (Blind retries, no rail health, fixed outreach)
        static_recovered_cases = sum(1 for c in dataset if c["simulated_outcomes"]["STATIC_BASELINE"])
        static_recovered_revenue = sum(c["amount_inr"] for c in dataset if c["simulated_outcomes"]["STATIC_BASELINE"])
        static_cost = total_cases * 1.5 # Fixed outreach cost across all cases
        static_profit = (static_recovered_revenue * merchant_margin) - static_cost

        # 3. Arm: AI POLICY (Context-aware NBA + Rail Health + Policy Guard)
        ai_recovered_cases = sum(1 for c in dataset if c["simulated_outcomes"]["AI_POLICY"])
        ai_recovered_revenue = sum(c["amount_inr"] for c in dataset if c["simulated_outcomes"]["AI_POLICY"])
        ai_interventions_count = sum(1 for c in dataset if c["recoverable"] and not c["opted_out"])
        ai_cost = ai_interventions_count * 2.0
        ai_profit = (ai_recovered_revenue * merchant_margin) - ai_cost

        # Comparative Uplift
        incremental_revenue = ai_recovered_revenue - static_recovered_revenue
        incremental_profit = ai_profit - static_profit
        futile_actions_suppressed = sum(1 for c in dataset if c["rail_degraded"] or not c["recoverable"] or c["opted_out"])
        policy_blocks_count = sum(1 for c in dataset if c["opted_out"] or not c["recoverable"])

        total_recoverable_revenue = sum(c["amount_inr"] for c in dataset if c["recoverable"] and not c["opted_out"])
        total_lost_revenue = sum(c["amount_inr"] for c in dataset if not c["recoverable"] or c["opted_out"])

        # Customer behavioral pattern breakdown for simulation
        behavioral_breakdown = {}
        for c in dataset:
            arch = c.get("customer_archetype") or c.get("customer_psychology_archetype") or "Loyal Repeat Buyer"
            if arch not in behavioral_breakdown:
                behavioral_breakdown[arch] = {
                    "archetype": arch,
                    "total_volume_inr": 0.0,
                    "recoverable_volume_inr": 0.0,
                    "lost_volume_inr": 0.0,
                    "ai_recovered_volume_inr": 0.0,
                    "cases_count": 0
                }
            amt = c["amount_inr"]
            behavioral_breakdown[arch]["total_volume_inr"] += amt
            behavioral_breakdown[arch]["cases_count"] += 1
            if c["recoverable"] and not c["opted_out"]:
                behavioral_breakdown[arch]["recoverable_volume_inr"] += amt
            else:
                behavioral_breakdown[arch]["lost_volume_inr"] += amt
            if c["simulated_outcomes"]["AI_POLICY"]:
                behavioral_breakdown[arch]["ai_recovered_volume_inr"] += amt

        behavioral_list = []
        for arch, d in behavioral_breakdown.items():
            tot = max(1.0, d["total_volume_inr"])
            d["recoverable_pct"] = round((d["recoverable_volume_inr"] / tot) * 100, 1)
            d["lost_pct"] = round((d["lost_volume_inr"] / tot) * 100, 1)
            d["ai_recovery_pct"] = round((d["ai_recovered_volume_inr"] / tot) * 100, 1)
            d["total_volume_inr"] = round(d["total_volume_inr"], 2)
            d["recoverable_volume_inr"] = round(d["recoverable_volume_inr"], 2)
            d["lost_volume_inr"] = round(d["lost_volume_inr"], 2)
            d["ai_recovered_volume_inr"] = round(d["ai_recovered_volume_inr"], 2)
            behavioral_list.append(d)
        behavioral_list.sort(key=lambda x: x["total_volume_inr"], reverse=True)

        results = {
            "run_id": run_id,
            "sample_size": total_cases,
            "revenue_at_risk_inr": round(total_revenue_at_risk, 2),
            "recoverable_revenue_inr": round(total_recoverable_revenue, 2),
            "lost_revenue_inr": round(total_lost_revenue, 2),
            "customer_behavioral_patterns": behavioral_list,
            "arms": {
                "no_action": {
                    "name": "No Action (Organic)",
                    "recovered_cases": no_action_recovered_cases,
                    "recovered_revenue_inr": round(no_action_recovered_revenue, 2),
                    "recovery_rate_pct": round((no_action_recovered_revenue / total_revenue_at_risk) * 100.0, 2),
                    "profit_inr": round(no_action_profit, 2),
                    "intervention_cost_inr": 0.0
                },
                "static_baseline": {
                    "name": "Static Baseline (Blind Retries)",
                    "recovered_cases": static_recovered_cases,
                    "recovered_revenue_inr": round(static_recovered_revenue, 2),
                    "recovery_rate_pct": round((static_recovered_revenue / total_revenue_at_risk) * 100.0, 2),
                    "profit_inr": round(static_profit, 2),
                    "intervention_cost_inr": round(static_cost, 2)
                },
                "ai_policy": {
                    "name": "AI Policy Orchestrator",
                    "recovered_cases": ai_recovered_cases,
                    "recovered_revenue_inr": round(ai_recovered_revenue, 2),
                    "recovery_rate_pct": round((ai_recovered_revenue / total_revenue_at_risk) * 100.0, 2),
                    "profit_inr": round(ai_profit, 2),
                    "intervention_cost_inr": round(ai_cost, 2)
                }
            },
            "uplift": {
                "incremental_revenue_inr": round(incremental_revenue, 2),
                "incremental_profit_inr": round(incremental_profit, 2),
                "revenue_uplift_pct": round((incremental_revenue / max(1.0, static_recovered_revenue)) * 100.0, 2),
                "profit_uplift_pct": round((incremental_profit / max(1.0, static_profit)) * 100.0, 2),
                "futile_actions_suppressed": futile_actions_suppressed,
                "policy_blocks_enforced": policy_blocks_count
            },
            "is_simulation_labeled": True,
            "disclaimer": "Simulation results generated on 5,000 seeded synthetic cases. Actual test-mode recoveries are tracked separately in the dashboard."
        }

        # Store simulation run record
        sim_db = SimulationRunDB(
            id=run_id,
            run_id=run_id,
            arm="comparative_eval",
            metrics_json=json.dumps(results),
            total_cases=total_cases,
            recovered_cases=ai_recovered_cases,
            recovered_revenue=ai_recovered_revenue,
            incremental_profit=incremental_profit
        )
        session.add(sim_db)
        await session.commit()

        return results
