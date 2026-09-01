from typing import Dict, Any
from ...domain.customers.models import CustomerContext
from ...domain.recovery.models import RecoveryOpportunity
from ...domain.payments.models import NormalizedFailure

class IntentScoringEngine:
    """
    Computes an interpretable customer-intent signal and recovery-opportunity score
    based on PRD Section 5.3 and 10.1.
    """
    
    DEFAULT_WEIGHTS = {
        "payment_attempt_started": 25,
        "payment_method_selected": 15,
        "checkout_details_completed": 15,
        "is_returning_customer": 10,
        "recent_cart_activity": 10,
        "previous_payment_history_success": 10,
        "customer_session_active": 10,
        "previous_recovery_success": 5,
    }

    @classmethod
    def calculate_intent_score(
        cls, 
        context: CustomerContext, 
        custom_weights: Dict[str, int] = None
    ) -> float:
        weights = custom_weights or cls.DEFAULT_WEIGHTS
        score = 0
        
        if context.payment_attempt_started:
            score += weights.get("payment_attempt_started", 25)
        if context.payment_method_selected:
            score += weights.get("payment_method_selected", 15)
        if context.checkout_details_completed:
            score += weights.get("checkout_details_completed", 15)
        if context.is_returning_customer:
            score += weights.get("is_returning_customer", 10)
        if context.recent_cart_activity:
            score += weights.get("recent_cart_activity", 10)
        if context.previous_payment_history_success:
            score += weights.get("previous_payment_history_success", 10)
        if context.customer_session_active:
            score += weights.get("customer_session_active", 10)
        if context.previous_recovery_success:
            score += weights.get("previous_recovery_success", 5)
            
        # Ensure score is bounded between 0 and 100
        return min(100.0, max(0.0, float(score)))

    @classmethod
    def calculate_recovery_opportunity(
        cls,
        intent_score: float,
        failure: NormalizedFailure,
        customer_opted_out: bool = False,
        rail_available: bool = True,
        time_since_failure_minutes: float = 2.0
    ) -> RecoveryOpportunity:
        # Failure Recoverability factor (0.0 to 1.0)
        failure_recoverability = 1.0 if failure.recoverable else 0.0
        
        # Customer Eligibility factor
        customer_eligibility = 0.0 if customer_opted_out else 1.0
        
        # Rail Availability factor
        rail_availability = 1.0 if rail_available else 0.4
        
        # Recency Decay Factor (e.g., half-life exponential decay)
        # Fast action within 15 min preserves > 90% opportunity
        recency_factor = max(0.2, 1.0 - (time_since_failure_minutes / 180.0))
        
        # Compound formula per PRD 10.1
        opportunity_score = (
            (intent_score / 100.0) *
            failure_recoverability *
            customer_eligibility *
            rail_availability *
            recency_factor *
            100.0
        )
        
        return RecoveryOpportunity(
            intent_score=round(intent_score, 1),
            failure_recoverability=round(failure_recoverability, 2),
            customer_eligibility=round(customer_eligibility, 2),
            rail_availability=round(rail_availability, 2),
            recency_factor=round(recency_factor, 2),
            score=round(opportunity_score, 1)
        )
