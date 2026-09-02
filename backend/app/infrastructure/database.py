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

# ----------------- PRD Section 28 Logical Schema -----------------

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

class OrderDB(Base):
    __tablename__ = "orders"
    id = Column(String(64), primary_key=True)
    external_order_id = Column(String(64), unique=True, index=True)
    customer_id = Column(String(64), index=True)
    amount_paise = Column(Integer, nullable=False)
    status = Column(String(32), default="created")
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

class PolicyEvaluationDB(Base):
    __tablename__ = "policy_evaluations"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    action = Column(String(64), nullable=False)
    verdict = Column(String(32), nullable=False)
    rules_json = Column(Text, nullable=False)
    policy_version = Column(String(32), default="v1.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ContactLogDB(Base):
    __tablename__ = "contact_log"
    id = Column(String(64), primary_key=True)
    customer_id = Column(String(64), index=True)
    case_id = Column(String(64), index=True)
    channel = Column(String(32), default="sms") # "sms" | "whatsapp" | "email"
    message_content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RailHealthWindowDB(Base):
    __tablename__ = "rail_health_windows"
    id = Column(String(64), primary_key=True)
    dimension = Column(String(128), index=True) # e.g. "card:hdfc:visa"
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    total_txns = Column(Integer, default=0)
    success_rate = Column(Float, default=1.0)
    failure_rate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class KnowledgeDocumentDB(Base):
    __tablename__ = "knowledge_documents"
    id = Column(String(64), primary_key=True)
    source_type = Column(String(64), nullable=False)
    version = Column(String(32), default="v1.0")
    checksum = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class KnowledgeChunkDB(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(String(64), primary_key=True)
    document_id = Column(String(64), index=True)
    chunk_text = Column(Text, nullable=False)
    embedding_vector = Column(Text, nullable=True) # JSON list or pgvector
    category = Column(String(64), default="general")
    metadata_json = Column(Text, nullable=True)

class ModelRunDB(Base):
    __tablename__ = "model_runs"
    id = Column(String(64), primary_key=True)
    model = Column(String(64), nullable=False)
    version = Column(String(32), nullable=False)
    provider = Column(String(64), nullable=False)
    latency_ms = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    json_valid = Column(Boolean, default=True)
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

class SimulationCaseOutcomeDB(Base):
    __tablename__ = "simulation_case_outcomes"
    id = Column(String(64), primary_key=True)
    run_id = Column(String(64), index=True)
    case_id = Column(String(64), index=True)
    action = Column(String(64), nullable=False)
    outcome = Column(String(32), nullable=False) # "RECOVERED" | "FAILED" | "SUPPRESSED"
    recovered_amount_inr = Column(Float, default=0.0)

class PromiseToPayDB(Base):
    """B2B Receivables & Promise-to-Pay tracking (PRD Section 17)"""
    __tablename__ = "promises_to_pay"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    customer_id = Column(String(64), index=True)
    promised_date = Column(String(32), nullable=False)
    source_channel = Column(String(32), default="WhatsApp") # WhatsApp | email | voice | manual
    raw_text = Column(Text, nullable=False)
    parsed_confidence = Column(Float, default=0.95)
    verified = Column(Boolean, default=True)
    fulfilled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class MandateDB(Base):
    """Recurring subscription & auto-debit recovery context (PRD Section 15)"""
    __tablename__ = "mandates"
    id = Column(String(64), primary_key=True)
    subscription_id = Column(String(64), index=True)
    customer_id = Column(String(64), index=True)
    status = Column(String(32), default="pending") # "active" | "pending" | "halted" | "cancelled"
    retry_state = Column(String(32), default="auto_retry_scheduled")
    next_retry_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ActiveLearningFeedbackDB(Base):
    """Human corrections captured for offline active learning (PRD Section 23 N15)"""
    __tablename__ = "active_learning_feedback"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), index=True)
    original_proposal = Column(String(64), nullable=False)
    human_correction = Column(String(64), nullable=False)
    correction_reason = Column(Text, nullable=True)
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
