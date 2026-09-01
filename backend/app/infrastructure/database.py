import json
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    Index, UniqueConstraint, create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from ..core.config import settings

Base = declarative_base()

class MerchantDB(Base):
    __tablename__ = "merchants"
    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    policy_version = Column(String(32), default="v1.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class CustomerDB(Base):
    __tablename__ = "customers"
    id = Column(String(64), primary_key=True)
    merchant_id = Column(String(64), default="default_merchant")
    name = Column(String(128), default="Demo Customer")
    contact = Column(String(32), default="+919876543210")
    email = Column(String(128), default="customer@example.com")
    opt_out = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class EventDB(Base):
    """Raw external events with event_id deduplication constraint (PRD Section 29.1)"""
    __tablename__ = "events"
    event_id = Column(String(128), primary_key=True, unique=True, index=True)
    event_type = Column(String(64), nullable=False)
    payload_json = Column(Text, nullable=False)
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RecoveryCaseDB(Base):
    __tablename__ = "recovery_cases"
    id = Column(String(64), primary_key=True, index=True)
    merchant_id = Column(String(64), default="default_merchant", index=True)
    customer_id = Column(String(64), index=True)
    order_id = Column(String(64), nullable=True, index=True)
    domain = Column(String(32), default="PAYMENT_FAILURE")
    amount_paise = Column(Integer, nullable=False)
    currency = Column(String(8), default="INR")
    state = Column(String(32), default="OPEN", index=True)
    intent_score = Column(Float, default=0.0)
    recovery_opportunity_score = Column(Float, default=0.0)
    attempts_count = Column(Integer, default=0)
    contact_count_24h = Column(Integer, default=0)
    active_charge_actions = Column(Integer, default=0)
    latest_failure_reason = Column(String(256), nullable=True)
    latest_failure_code = Column(String(64), nullable=True)
    payment_method = Column(String(32), nullable=True)
    issuer = Column(String(64), nullable=True)
    network = Column(String(32), nullable=True)
    customer_opted_out = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class PaymentAttemptDB(Base):
    __tablename__ = "payment_attempts"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    payment_id = Column(String(64), nullable=True, unique=True, index=True)
    order_id = Column(String(64), nullable=True)
    amount_paise = Column(Integer, nullable=False)
    method = Column(String(32), default="card")
    status = Column(String(32), default="failed")
    raw_error_json = Column(Text, nullable=True)
    normalized_failure_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class InterventionDB(Base):
    __tablename__ = "interventions"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    action = Column(String(64), nullable=False)
    policy_verdict = Column(String(32), default="allowed")
    execution_state = Column(String(32), default="pending")
    idempotency_key = Column(String(128), unique=True, index=True)
    external_reference_id = Column(String(128), nullable=True)
    payment_link_url = Column(String(256), nullable=True)
    customer_message = Column(Text, nullable=True)
    discount_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    executed_at = Column(DateTime, nullable=True)

class AuditEventDB(Base):
    __tablename__ = "audit_events"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    event_type = Column(String(64), nullable=False)
    actor = Column(String(64), default="system")
    payload_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class PolicyDB(Base):
    __tablename__ = "policies"
    id = Column(String(64), primary_key=True)
    version = Column(String(32), unique=True, index=True)
    rules_json = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    is_shadow = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RecoveryAttributionDB(Base):
    __tablename__ = "recovery_attribution"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    intervention_id = Column(String(64), nullable=True, index=True)
    payment_id = Column(String(64), unique=True, index=True)
    amount_paise = Column(Integer, nullable=False)
    recovered_amount_inr = Column(Float, nullable=False)
    time_to_recovery_seconds = Column(Integer, default=0)
    attribution_window_minutes = Column(Integer, default=60)
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ReviewTaskDB(Base):
    __tablename__ = "review_tasks"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    priority = Column(String(32), default="HIGH")
    status = Column(String(32), default="PENDING") # PENDING | APPROVED | REJECTED | OVERRIDDEN
    reviewer = Column(String(64), nullable=True)
    diagnostic_brief_json = Column(Text, nullable=False)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SimulationRunDB(Base):
    __tablename__ = "simulation_runs"
    id = Column(String(64), primary_key=True)
    run_id = Column(String(64), index=True)
    arm = Column(String(32)) # "no_action" | "static_baseline" | "ai_policy"
    metrics_json = Column(Text, nullable=False)
    total_cases = Column(Integer, default=0)
    recovered_cases = Column(Integer, default=0)
    recovered_revenue = Column(Float, default=0.0)
    incremental_profit = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# Database connection setup
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
