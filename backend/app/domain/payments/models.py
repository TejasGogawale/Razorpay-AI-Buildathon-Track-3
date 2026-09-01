from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class PaymentState(str, Enum):
    CAPTURED = "captured"
    AUTHORIZED = "authorized"
    FAILED = "failed"
    PENDING = "pending"
    UNKNOWN = "unknown"
    REFUNDED = "refunded"

class ErrorOwner(str, Enum):
    CUSTOMER = "CUSTOMER"
    INSTRUMENT = "INSTRUMENT"
    ISSUER = "ISSUER"
    GATEWAY = "GATEWAY"
    BUSINESS = "BUSINESS"
    INTERNAL = "INTERNAL"

class ErrorStage(str, Enum):
    INITIATION = "INITIATION"
    AUTHENTICATION = "AUTHENTICATION"
    AUTHORIZATION = "AUTHORIZATION"
    CAPTURE = "CAPTURE"
    UNKNOWN = "UNKNOWN"

class RetrySemantics(str, Enum):
    SAME_INSTRUMENT_SAFE = "SAME_INSTRUMENT_SAFE"
    SAME_INSTRUMENT_UNSAFE = "SAME_INSTRUMENT_UNSAFE"
    DIFFERENT_METHOD_REQUIRED = "DIFFERENT_METHOD_REQUIRED"
    CUSTOMER_FIX_REQUIRED = "CUSTOMER_FIX_REQUIRED"
    DO_NOT_RETRY = "DO_NOT_RETRY"

class RazorpayRawError(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    step: Optional[str] = None
    reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class NormalizedFailure(BaseModel):
    owner: ErrorOwner
    stage: ErrorStage
    reason_code: str
    description: str
    retry_semantics: RetrySemantics
    alternate_method_allowed: bool = True
    customer_action_required: bool = False
    recoverable: bool = True
    confidence: float = 1.0
    evidence: List[str] = Field(default_factory=list)

class PaymentMethod(str, Enum):
    UPI = "upi"
    CARD = "card"
    NETBANKING = "netbanking"
    WALLET = "wallet"
    EMI = "emi"
    UNKNOWN = "unknown"

class PaymentAttempt(BaseModel):
    id: str
    case_id: str
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    amount_paise: int
    currency: str = "INR"
    method: PaymentMethod = PaymentMethod.CARD
    status: PaymentState = PaymentState.FAILED
    raw_error: Optional[RazorpayRawError] = None
    normalized_failure: Optional[NormalizedFailure] = None
    created_at: str
