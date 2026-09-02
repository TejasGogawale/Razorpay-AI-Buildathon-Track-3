import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .infrastructure.database import (
    init_db, AsyncSessionLocal, MerchantDB, CustomerDB, PolicyDB,
    RecoveryCaseDB, PaymentAttemptDB, AuditEventDB, RecoveryAttributionDB
)
from .api.v1.routes import router as api_v1_router
from data.generators.synthetic_dataset import generate_synthetic_recovery_dataset
from sqlalchemy import select, func

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    await init_db()
    
    # Seed default merchant, policy and initial diverse cases
    async with AsyncSessionLocal() as session:
        merchant = await session.get(MerchantDB, "default_merchant")
        if not merchant:
            merchant = MerchantDB(
                id="default_merchant",
                name="Enterprise Store Network",
                policy_version="v1.0"
            )
            session.add(merchant)
            
        policy = await session.get(PolicyDB, "pol_v1_default")
        if not policy:
            policy = PolicyDB(
                id="pol_v1_default",
                version="v1.0",
                rules_json="{}",
                is_active=True,
                is_shadow=False
            )
            session.add(policy)

        # Seed initial rich recovery cases if table is sparse
        case_count_res = await session.execute(select(func.count(RecoveryCaseDB.id)))
        total_cases = case_count_res.scalar() or 0
        
        if total_cases < 20:
            sample_cases = generate_synthetic_recovery_dataset(count=45, seed=101)
            for idx, sc in enumerate(sample_cases):
                # Ensure customer exists
                cust = await session.get(CustomerDB, sc["customer_id"])
                if not cust:
                    cust = CustomerDB(
                        id=sc["customer_id"],
                        name=sc.get("customer_name", "Demo Customer"),
                        contact=f"+91{9800000000 + idx}",
                        email=f"customer{idx}@example.com",
                        opt_out=sc["opted_out"]
                    )
                    session.add(cust)

                state_val = "RECOVERED" if idx % 4 == 0 else ("ESCALATED" if sc["amount_inr"] >= 25000 else ("STOPPED" if sc["opted_out"] else "READY_FOR_ACTION"))
                
                case_db = RecoveryCaseDB(
                    id=sc["case_id"],
                    merchant_id="default_merchant",
                    customer_id=sc["customer_id"],
                    order_id=sc["order_id"],
                    domain=sc["domain"],
                    amount_paise=sc["amount_paise"],
                    currency="INR",
                    state=state_val,
                    intent_score=round(random_score(sc["previous_purchase_count"], sc["checkout_progress"]), 1),
                    recovery_opportunity_score=round(random_opportunity(sc["recoverable"], sc["opted_out"]), 1),
                    attempts_count=1 if state_val != "ESCALATED" else 3,
                    contact_count_24h=sc["contact_count_24h"],
                    active_charge_actions=0,
                    latest_failure_reason=sc["failure_reason"],
                    latest_failure_code=sc["failure_code"],
                    payment_method=sc["payment_method"],
                    issuer=sc["issuer_or_rail"],
                    network=sc["network"],
                    customer_opted_out=sc["opted_out"]
                )
                session.add(case_db)

                # Add initial attempt
                attempt_db = PaymentAttemptDB(
                    id=f"att_init_{idx}_{sc['case_id']}",
                    case_id=sc["case_id"],
                    payment_id=f"pay_init_{idx}",
                    order_id=sc["order_id"],
                    amount_paise=sc["amount_paise"],
                    method=sc["payment_method"],
                    status="failed" if state_val != "RECOVERED" else "captured"
                )
                session.add(attempt_db)

                # If recovered, seed attribution
                if state_val == "RECOVERED":
                    attr_db = RecoveryAttributionDB(
                        id=f"att_seed_{idx}",
                        case_id=sc["case_id"],
                        payment_id=f"pay_init_{idx}",
                        amount_paise=sc["amount_paise"],
                        recovered_amount_inr=sc["amount_inr"],
                        time_to_recovery_seconds=340,
                        attribution_window_minutes=60,
                        confidence=0.98
                    )
                    session.add(attr_db)

        await session.commit()
        
    yield

def random_score(prev_p: int, checkout_p: float) -> float:
    base = 50.0 + (prev_p * 3.0) + (checkout_p * 30.0)
    return min(98.0, max(25.0, base))

def random_opportunity(recoverable: bool, opted_out: bool) -> float:
    if not recoverable or opted_out:
        return 0.0
    return round(72.0 + (hash(str(recoverable)) % 24), 1)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic AI Revenue Recovery Decisioning Orchestrator",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Webhook & API v1 routers
app.include_router(api_v1_router, prefix="")
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "llm_provider": settings.get_active_llm_provider()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
