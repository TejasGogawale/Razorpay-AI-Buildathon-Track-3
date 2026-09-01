from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CaseState(str, Enum):
    OPEN = "OPEN"
    WAITING_FOR_INFORMATION = "WAITING_FOR_INFORMATION"
    READY_FOR_ACTION = "READY_FOR_ACTION"
    ACTION_PROPOSED = "ACTION_PROPOSED"
    ACTION_BLOCKED = "ACTION_BLOCKED"
    ACTION_EXECUTED = "ACTION_EXECUTED"
    RECOVERED = "RECOVERED"
    FAILED = "FAILED"
    WAITING = "WAITING"
    ESCALATED = "ESCALATED"
    STOPPED = "STOPPED"
    EXPIRED = "EXPIRED"

class RecoveryDomain(str, Enum):
    PAYMENT_FAILURE = "PAYMENT_FAILURE"
    CHECKOUT_ABANDONMENT = "CHECKOUT_ABANDONMENT"
    SUBSCRIPTION_FAILURE = "SUBSCRIPTION_FAILURE"
    B2B_RECEIVABLE = "B2B_RECEIVABLE"

class ActionEnum(str, Enum):
    WAIT = "WAIT"
    CUSTOMER_RETRY = "CUSTOMER_RETRY"
    ALTERNATE_METHOD = "ALTERNATE_METHOD"
    STANDARD_PAYMENT_LINK = "STANDARD_PAYMENT_LINK"
    REMINDER = "REMINDER"
    SCHEDULED_RETRY = "SCHEDULED_RETRY"
    INCENTIVE = "INCENTIVE"
    ESCALATE_HUMAN = "ESCALATE_HUMAN"
    STOP = "STOP"

class ActionCandidate(BaseModel):
    action: ActionEnum
    expected_recovery_value: float
    p_recovery: float = 0.0
    eligibility: str = "eligible" # eligible | blocked | conditional
    reason_codes: List[str] = Field(default_factory=list)
    cost_estimate: float = 0.0
    block_reasons: List[str] = Field(default_factory=list)

class RecoveryOpportunity(BaseModel):
    intent_score: float = 0.0
    failure_recoverability: float = 1.0
    customer_eligibility: float = 1.0
    rail_availability: float = 1.0
    recency_factor: float = 1.0
    score: float = 0.0 # IntentScore * FailureRecoverability * CustomerEligibility * RailAvailability * RecencyFactor

class PolicyDecision(BaseModel):
    verdict: str = "allowed" # allowed | blocked | escalate
    rules: List[str] = Field(default_factory=list)
    blocked_rules: List[str] = Field(default_factory=list)
    policy_version: str = "v1.0"
    idempotency_key: Optional[str] = None

class RecoveryDecision(BaseModel):
    case_id: str
    decision_id: str
    state: CaseState = CaseState.READY_FOR_ACTION
    recommended_action: ActionEnum
    candidate_actions: List[ActionCandidate] = Field(default_factory=list)
    policy: PolicyDecision
    evidence_ids: List[str] = Field(default_factory=list)
    model_provenance: Dict[str, Any] = Field(default_factory=dict)
    rationale: str = ""

class Intervention(BaseModel):
    id: str
    case_id: str
    action: ActionEnum
    policy_verdict: str
    execution_state: str = "pending" # pending | executed | failed | blocked
    idempotency_key: str
    external_reference_id: Optional[str] = None
    payment_link_url: Optional[str] = None
    customer_message: Optional[str] = None
    discount_amount: float = 0.0
    created_at: str
    executed_at: Optional[str] = None

class RecoveryAttribution(BaseModel):
    id: str
    case_id: str
    intervention_id: Optional[str] = None
    payment_id: str
    amount_paise: int
    recovered_amount_inr: float
    time_to_recovery_seconds: int
    attribution_window_minutes: int = 60
    confidence: float = 1.0
    is_agent_assisted: bool = True
    created_at: str

class RecoveryCase(BaseModel):
    id: str
    merchant_id: str
    customer_id: str
    order_id: Optional[str] = None
    domain: RecoveryDomain = RecoveryDomain.PAYMENT_FAILURE
    amount_paise: int
    currency: str = "INR"
    state: CaseState = CaseState.OPEN
    intent_score: float = 0.0
    recovery_opportunity_score: float = 0.0
    attempts_count: int = 0
    contact_count_24h: int = 0
    active_charge_actions: int = 0
    latest_failure_reason: Optional[str] = None
    latest_failure_code: Optional[str] = None
    payment_method: Optional[str] = None
    issuer: Optional[str] = None
    network: Optional[str] = None
    customer_opted_out: bool = False
    created_at: str
    updated_at: str
