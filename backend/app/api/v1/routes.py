import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ...infrastructure.database import (
    get_db, RecoveryCaseDB, InterventionDB, AuditEventDB,
    ReviewTaskDB, PolicyDB, CustomerDB, RecoveryAttributionDB
)
from ...domain.recovery.models import ActionEnum, CaseState
from ...application.recovery_service import RecoveryOrchestratorService
from ...application.attribution_service import AttributionService
from ...application.simulation_service import SimulationService
from ...application.scenario_harness import ScenarioRunnerHarness
from ...infrastructure.razorpay.client import razorpay_adapter
from ...intelligence.rail_health.monitor import rail_health_monitor
from ...intelligence.rag.engine import rag_engine
from ...core.config import settings

router = APIRouter()

# ----------------- 1. Webhook Ingestion (PRD 27 & 29.1) -----------------
@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db)
):
    raw_body = await request.body()
    # Verify signature if secret is provided
    if settings.RAZORPAY_WEBHOOK_SECRET and x_razorpay_signature:
        is_valid = razorpay_adapter.verify_webhook_signature(raw_body, x_razorpay_signature)
        if not is_valid and settings.ENVIRONMENT == "production":
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        body_json = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON payload")

    event_id = body_json.get("event_id") or body_json.get("id") or f"evt_{hash(raw_body)}"
    event_type = body_json.get("event", "unknown")

    is_new, msg, case_id = await RecoveryOrchestratorService.ingest_razorpay_webhook(
        session=session,
        event_id=event_id,
        event_type=event_type,
        payload=body_json
    )

    return {"status": "success", "is_new_event": is_new, "message": msg, "case_id": case_id}

# ----------------- 2. Recovery Cases (PRD 27) -----------------
@router.get("/cases")
async def list_cases(
    domain: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    session: AsyncSession = Depends(get_db)
):
    query = select(RecoveryCaseDB).order_by(desc(RecoveryCaseDB.created_at))
    if domain:
        query = query.where(RecoveryCaseDB.domain == domain)
    if state:
        query = query.where(RecoveryCaseDB.state == state)
    if search:
        query = query.where(
            (RecoveryCaseDB.id.ilike(f"%{search}%")) |
            (RecoveryCaseDB.order_id.ilike(f"%{search}%")) |
            (RecoveryCaseDB.customer_id.ilike(f"%{search}%"))
        )
    query = query.limit(limit).offset(offset)
    res = await session.execute(query)
    cases = res.scalars().all()
    
    return [
        {
            "id": c.id,
            "merchant_id": c.merchant_id,
            "customer_id": c.customer_id,
            "order_id": c.order_id,
            "domain": c.domain,
            "amount_inr": c.amount_paise / 100.0,
            "state": c.state,
            "intent_score": c.intent_score,
            "recovery_opportunity_score": c.recovery_opportunity_score,
            "attempts_count": c.attempts_count,
            "latest_failure_reason": c.latest_failure_reason,
            "latest_failure_code": c.latest_failure_code,
            "payment_method": c.payment_method,
            "issuer": c.issuer,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in cases
    ]

@router.get("/cases/{case_id}")
async def get_case_detail(case_id: str, session: AsyncSession = Depends(get_db)):
    case = await session.get(RecoveryCaseDB, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    # Get interventions
    int_res = await session.execute(
        select(InterventionDB).where(InterventionDB.case_id == case_id).order_by(InterventionDB.created_at.desc())
    )
    interventions = int_res.scalars().all()

    # Get attribution
    attr_res = await session.execute(
        select(RecoveryAttributionDB).where(RecoveryAttributionDB.case_id == case_id)
    )
    attribution = attr_res.scalar_one_or_none()

    # Get customer
    customer = await session.get(CustomerDB, case.customer_id)

    # Get Rail status
    rail_metric = rail_health_monitor.get_rail_health(
        method=case.payment_method or "card",
        issuer=case.issuer,
        network=case.network
    )

    # Get latest decision
    decision = await RecoveryOrchestratorService.evaluate_case_decision(session, case_id)

    return {
        "case": {
            "id": case.id,
            "order_id": case.order_id,
            "customer_id": case.customer_id,
            "amount_inr": case.amount_paise / 100.0,
            "currency": case.currency,
            "state": case.state,
            "domain": case.domain,
            "intent_score": case.intent_score,
            "recovery_opportunity_score": case.recovery_opportunity_score,
            "attempts_count": case.attempts_count,
            "latest_failure_reason": case.latest_failure_reason,
            "latest_failure_code": case.latest_failure_code,
            "payment_method": case.payment_method,
            "issuer": case.issuer,
            "network": case.network,
            "customer_opted_out": case.customer_opted_out,
            "created_at": case.created_at.isoformat() if case.created_at else None
        },
        "customer": {
            "name": customer.name if customer else "Demo Customer",
            "contact": customer.contact if customer else "+919876543210",
            "email": customer.email if customer else "customer@example.com",
            "opt_out": customer.opt_out if customer else False
        },
        "rail_health": rail_metric.model_dump(),
        "latest_decision": decision.model_dump(),
        "interventions": [
            {
                "id": i.id,
                "action": i.action,
                "policy_verdict": i.policy_verdict,
                "execution_state": i.execution_state,
                "idempotency_key": i.idempotency_key,
                "external_reference_id": i.external_reference_id,
                "payment_link_url": i.payment_link_url,
                "customer_message": i.customer_message,
                "executed_at": i.executed_at.isoformat() if i.executed_at else None
            }
            for i in interventions
        ],
        "attribution": {
            "id": attribution.id,
            "recovered_amount_inr": attribution.recovered_amount_inr,
            "time_to_recovery_seconds": attribution.time_to_recovery_seconds,
            "confidence": attribution.confidence,
            "created_at": attribution.created_at.isoformat()
        } if attribution else None
    }

@router.get("/cases/{case_id}/timeline")
async def get_case_timeline(case_id: str, session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(AuditEventDB).where(AuditEventDB.case_id == case_id).order_by(AuditEventDB.created_at.asc())
    )
    events = res.scalars().all()
    return [
        {
            "id": e.id,
            "case_id": e.case_id,
            "event_type": e.event_type,
            "actor": e.actor,
            "payload": json.loads(e.payload_json),
            "timestamp": e.created_at.isoformat() if e.created_at else None
        }
        for e in events
    ]

# ----------------- 3. Decision & Execution (PRD 27.1) -----------------
@router.post("/cases/{case_id}/decide")
async def decide_case(case_id: str, session: AsyncSession = Depends(get_db)):
    """Runs Decision Engine in dry-run mode per PRD Section 27.1 contract"""
    decision = await RecoveryOrchestratorService.evaluate_case_decision(session, case_id)
    return {
        "case_id": decision.case_id,
        "decision_id": decision.decision_id,
        "state": decision.state.value,
        "recommended_action": decision.recommended_action.value,
        "candidate_actions": [
            {
                "action": c.action.value,
                "expected_recovery_value": c.expected_recovery_value,
                "eligibility": c.eligibility,
                "reason_codes": c.reason_codes,
                "cost_estimate": c.cost_estimate
            }
            for c in decision.candidate_actions
        ],
        "policy": {
            "verdict": decision.policy.verdict,
            "rules": decision.policy.rules,
            "blocked_rules": decision.policy.blocked_rules,
            "policy_version": decision.policy.policy_version,
            "idempotency_key": decision.policy.idempotency_key
        },
        "evidence_ids": decision.evidence_ids,
        "rationale": decision.rationale
    }

@router.post("/cases/{case_id}/execute")
async def execute_action(
    case_id: str,
    action: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
):
    action_enum = ActionEnum(action) if action else None
    try:
        intervention = await RecoveryOrchestratorService.execute_case_action(
            session=session,
            case_id=case_id,
            action_override=action_enum
        )
        return {"status": "executed", "intervention": intervention.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- 4. Dashboard KPIs & Rail Health (PRD 26 & 27) -----------------
@router.get("/dashboard/metrics")
async def get_metrics(session: AsyncSession = Depends(get_db)):
    metrics = await AttributionService.get_dashboard_metrics(session)
    return metrics

@router.get("/rail-health")
async def get_rail_health():
    rails = rail_health_monitor.list_all_rails()
    return [r.model_dump() for r in rails]

@router.post("/rail-health/degrade")
async def inject_rail_degradation(method: str = "card", issuer: str = "hdfc"):
    rail_health_monitor.inject_degradation_spike(method, issuer)
    return {"status": "degraded", "method": method, "issuer": issuer}

@router.post("/rail-health/restore")
async def restore_rail_health(method: str = "card", issuer: str = "hdfc"):
    rail_health_monitor.restore_rail(method, issuer)
    return {"status": "healthy", "method": method, "issuer": issuer}

# ----------------- 5. Policy Simulation (PRD 24 & 25) -----------------
@router.post("/simulation/run")
async def run_simulation(
    sample_size: int = 5000,
    margin_rate: float = 0.25,
    session: AsyncSession = Depends(get_db)
):
    results = await SimulationService.run_simulation(
        session=session,
        sample_size=sample_size,
        merchant_margin=margin_rate
    )
    return results

# ----------------- 6. Human Review Queue (PRD 19) -----------------
@router.get("/review-queue")
async def get_review_queue(session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(ReviewTaskDB).where(ReviewTaskDB.status == "PENDING").order_by(ReviewTaskDB.created_at.desc())
    )
    tasks = res.scalars().all()
    return [
        {
            "id": t.id,
            "case_id": t.case_id,
            "priority": t.priority,
            "status": t.status,
            "brief": json.loads(t.diagnostic_brief_json),
            "created_at": t.created_at.isoformat()
        }
        for t in tasks
    ]

@router.post("/review-queue/{task_id}/resolve")
async def resolve_review_task(
    task_id: str,
    action: str, # "APPROVE" | "REJECT" | "OVERRIDE"
    override_action: Optional[str] = None,
    notes: str = "",
    session: AsyncSession = Depends(get_db)
):
    task = await session.get(ReviewTaskDB, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Review task not found")
        
    task.status = action.upper()
    task.resolution_notes = notes
    task.reviewer = "Human Operator"
    
    if action == "APPROVE":
        await RecoveryOrchestratorService.execute_case_action(
            session=session,
            case_id=task.case_id
        )
    elif action == "OVERRIDE" and override_action:
        await RecoveryOrchestratorService.execute_case_action(
            session=session,
            case_id=task.case_id,
            action_override=ActionEnum(override_action)
        )
        
    await session.commit()
    return {"status": "resolved", "task_id": task_id, "resolution": action}

# ----------------- 7. RAG Knowledge Explorer (PRD 21) -----------------
@router.get("/knowledge/documents")
async def list_knowledge_chunks():
    return [c.model_dump() for c in rag_engine.chunks]

@router.post("/knowledge/search")
async def search_knowledge(query: str, top_k: int = 4):
    results = rag_engine.search(query, top_k=top_k)
    return [r.model_dump() for r in results]

# ----------------- 8. Scenario Runner & Demo Console (PRD 33 & 37) -----------------
@router.get("/demo/scenarios")
async def list_demo_scenarios():
    with open("data/fixtures/scenarios.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["scenarios"]

@router.post("/demo/scenarios/{scenario_id}/trigger")
async def trigger_demo_scenario(
    scenario_id: str,
    custom_amount: Optional[float] = None,
    session: AsyncSession = Depends(get_db)
):
    try:
        res = await ScenarioRunnerHarness.trigger_scenario(
            session=session,
            scenario_id=scenario_id,
            custom_amount=custom_amount
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/demo/cases/{case_id}/simulate-payment")
async def simulate_case_recovery_payment(case_id: str, session: AsyncSession = Depends(get_db)):
    res = await ScenarioRunnerHarness.simulate_customer_recovery_payment(
        session=session,
        case_id=case_id
    )
    return res
