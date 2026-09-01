from typing import Optional, List
from pydantic import BaseModel, Field

class Customer(BaseModel):
    id: str
    merchant_id: str
    name: str = "Demo Customer"
    contact: str = "+919876543210"
    email: str = "customer@example.com"
    opt_out: bool = False
    created_at: str

class CustomerContext(BaseModel):
    customer_id: str
    merchant_id: str = "default_merchant"
    
    # Intent signal inputs (Section 5.3)
    payment_attempt_started: bool = True
    payment_method_selected: bool = True
    checkout_details_completed: bool = True
    is_returning_customer: bool = True
    recent_cart_activity: bool = True
    previous_payment_history_success: bool = True
    customer_session_active: bool = True
    previous_recovery_success: bool = False
    
    # Statistical / Behavioral attributes
    previous_purchase_count: int = 3
    previous_payment_success_rate: float = 0.85
    previous_recovery_count: int = 1
    time_since_failure_minutes: float = 2.0
    contact_count_24h: int = 0
    is_opted_out: bool = False
    
    # Computed scores
    intent_score: float = 0.0
