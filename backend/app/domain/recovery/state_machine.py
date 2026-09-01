from typing import Tuple, Optional
from .models import CaseState, ActionEnum
from ..payments.models import PaymentState

class RecoveryStateMachine:
    """
    Validates state machine transitions and enforces payment state precedence rules
    defined in PRD Section 8.1 & 8.2.
    """
    
    ALLOWED_TRANSITIONS = {
        CaseState.OPEN: [
            CaseState.WAITING_FOR_INFORMATION,
            CaseState.READY_FOR_ACTION,
            CaseState.ACTION_PROPOSED,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.WAITING_FOR_INFORMATION: [
            CaseState.READY_FOR_ACTION,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.READY_FOR_ACTION: [
            CaseState.ACTION_PROPOSED,
            CaseState.ACTION_BLOCKED,
            CaseState.ACTION_EXECUTED,
            CaseState.ESCALATED,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.ACTION_PROPOSED: [
            CaseState.ACTION_BLOCKED,
            CaseState.ACTION_EXECUTED,
            CaseState.ESCALATED,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.ACTION_BLOCKED: [
            CaseState.READY_FOR_ACTION,
            CaseState.ESCALATED,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.ACTION_EXECUTED: [
            CaseState.RECOVERED,
            CaseState.FAILED,
            CaseState.WAITING,
            CaseState.ESCALATED,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.WAITING: [
            CaseState.READY_FOR_ACTION,
            CaseState.RECOVERED,
            CaseState.FAILED,
            CaseState.ESCALATED,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.ESCALATED: [
            CaseState.READY_FOR_ACTION,
            CaseState.ACTION_EXECUTED,
            CaseState.RECOVERED,
            CaseState.STOPPED,
            CaseState.EXPIRED
        ],
        CaseState.RECOVERED: [], # Terminal
        CaseState.FAILED: [
            CaseState.READY_FOR_ACTION # Can re-evaluate if retry budget permits
        ],
        CaseState.STOPPED: [], # Terminal
        CaseState.EXPIRED: []  # Terminal
    }

    @classmethod
    def can_transition(cls, current_state: CaseState, new_state: CaseState) -> bool:
        if current_state == new_state:
            return True
        allowed = cls.ALLOWED_TRANSITIONS.get(current_state, [])
        return new_state in allowed

    @staticmethod
    def validate_payment_precedence(payment_status: PaymentState, action: Optional[ActionEnum]) -> Tuple[bool, str]:
        """
        Enforces Section 8.2 Payment state precedence rule:
        Rule: Payment state must be resolved from authoritative Razorpay events before a recovery
        action that could create a new payment is allowed.
        """
        if payment_status == PaymentState.CAPTURED:
            if action in [ActionEnum.CUSTOMER_RETRY, ActionEnum.STANDARD_PAYMENT_LINK, ActionEnum.ALTERNATE_METHOD]:
                return False, "Payment is already captured. No new charge-producing recovery action is permitted."
            return True, "Payment is captured."

        if payment_status == PaymentState.AUTHORIZED:
            if action in [ActionEnum.CUSTOMER_RETRY, ActionEnum.STANDARD_PAYMENT_LINK, ActionEnum.ALTERNATE_METHOD]:
                return False, "Payment is in authorized state and may transition to captured. Duplicate charge blocked."
            return True, "Payment authorized."

        if payment_status in [PaymentState.PENDING, PaymentState.UNKNOWN]:
            if action in [ActionEnum.CUSTOMER_RETRY, ActionEnum.STANDARD_PAYMENT_LINK, ActionEnum.ALTERNATE_METHOD]:
                return False, "Payment state is uncertain/pending. Must reconcile with gateway before any charge-producing action."
            return True, "Payment pending/unknown."

        if payment_status == PaymentState.REFUNDED:
            if action in [ActionEnum.CUSTOMER_RETRY, ActionEnum.STANDARD_PAYMENT_LINK, ActionEnum.ALTERNATE_METHOD]:
                return False, "Payment was refunded. No automatic recovery charge allowed."
            return True, "Payment refunded."

        return True, "Payment state permits recovery evaluation."
