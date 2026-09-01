from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .infrastructure.database import init_db, AsyncSessionLocal, MerchantDB, CustomerDB, PolicyDB
from .api.v1.routes import router as api_v1_router
from sqlalchemy import select

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    await init_db()
    
    # Seed default merchant and policy
    async with AsyncSessionLocal() as session:
        merchant = await session.get(MerchantDB, "default_merchant")
        if not merchant:
            merchant = MerchantDB(
                id="default_merchant",
                name="Razorpay Enterprise Store",
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
            
        await session.commit()
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic AI Revenue Recovery Decisioning Orchestrator for Razorpay AI Buildathon Track 03",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in local dev
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
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
