from typing import Dict, Any, Tuple
from .models import (
    RazorpayRawError,
    NormalizedFailure,
    ErrorOwner,
    ErrorStage,
    RetrySemantics
)

class ErrorTaxonomyResolver:
    """
    Deterministic failure taxonomy mapper based on PRD Section 9.1 and Razorpay error standards.
    Maps (source, step, reason, code, description) to normalized recovery semantics.
    """
    
    @staticmethod
    def normalize_error(raw_error: RazorpayRawError) -> NormalizedFailure:
        code = (raw_error.code or "").upper()
        source = (raw_error.source or "").lower()
        step = (raw_error.step or "").lower()
        reason = (raw_error.reason or "").lower()
        desc = raw_error.description or ""
        
        # 1. Card Expired
        if "expired" in reason or "card_expired" in code.lower() or "expired" in desc.lower():
            return NormalizedFailure(
                owner=ErrorOwner.INSTRUMENT,
                stage=ErrorStage.AUTHORIZATION if "auth" in step else ErrorStage.INITIATION,
                reason_code="CARD_EXPIRED",
                description="The card used has expired. Same-card retry will fail.",
                retry_semantics=RetrySemantics.DIFFERENT_METHOD_REQUIRED,
                alternate_method_allowed=True,
                customer_action_required=True,
                recoverable=True,
                confidence=0.98,
                evidence=["Razorpay error reason indicates card expiration", f"raw_reason: {reason}"]
            )
            
        # 2. Insufficient Funds / Balance
        if "insufficient" in reason or "insufficient_funds" in code.lower() or "balance" in desc.lower():
            return NormalizedFailure(
                owner=ErrorOwner.CUSTOMER,
                stage=ErrorStage.AUTHORIZATION,
                reason_code="INSUFFICIENT_FUNDS",
                description="Insufficient funds or credit limit on customer account.",
                retry_semantics=RetrySemantics.CUSTOMER_FIX_REQUIRED,
                alternate_method_allowed=True,
                customer_action_required=True,
                recoverable=True,
                confidence=0.95,
                evidence=["Issuer returned insufficient balance code", f"raw_reason: {reason}"]
            )
            
        # 3. Issuer / Bank / Network Technical Error / Downtime
        if (
            source in ["bank", "issuer", "gateway"] or 
            "technical_error" in reason or 
            "downtime" in reason or
            "GATEWAY_ERROR" in code or
            "SERVER_ERROR" in code or
            "issuer_technical_error" in reason or
            "timeout" in desc.lower() or
            "bank_downtime" in reason
        ):
            return NormalizedFailure(
                owner=ErrorOwner.ISSUER if source == "bank" or source == "issuer" else ErrorOwner.GATEWAY,
                stage=ErrorStage.AUTHORIZATION if "auth" in step else ErrorStage.INITIATION,
                reason_code="ISSUER_OR_GATEWAY_DEGRADED",
                description="Transient bank or network failure detected at the issuer/gateway rail.",
                retry_semantics=RetrySemantics.SAME_INSTRUMENT_UNSAFE,
                alternate_method_allowed=True,
                customer_action_required=False,
                recoverable=True,
                confidence=0.92,
                evidence=["Bank/Gateway returned transient server or timeout code", f"source: {source}, reason: {reason}"]
            )
            
        # 4. Risk / Fraud / Policy Block
        if (
            source == "business" or 
            "risk" in reason or 
            "fraud" in reason or 
            "blocked" in reason or
            "security" in desc.lower() or
            "risk_check_failed" in reason
        ):
            return NormalizedFailure(
                owner=ErrorOwner.BUSINESS,
                stage=ErrorStage.INITIATION,
                reason_code="RISK_POLICY_BLOCK",
                description="Payment rejected by internal risk or fraud prevention rules.",
                retry_semantics=RetrySemantics.DO_NOT_RETRY,
                alternate_method_allowed=False,
                customer_action_required=False,
                recoverable=False,
                confidence=0.99,
                evidence=["Risk scoring system marked transaction as suspicious", f"raw_reason: {reason}"]
            )
            
        # 5. Customer Authentication Failed / OTP Timeout / Cancelled
        if (
            "otp" in reason or 
            "authentication" in step or 
            "cancelled" in reason or 
            "user_dropped" in reason or
            "auth_failed" in reason or
            "cancelled" in desc.lower()
        ):
            return NormalizedFailure(
                owner=ErrorOwner.CUSTOMER,
                stage=ErrorStage.AUTHENTICATION,
                reason_code="CUSTOMER_AUTH_FAILED",
                description="Customer cancelled 3D Secure / OTP or session timed out.",
                retry_semantics=RetrySemantics.SAME_INSTRUMENT_SAFE,
                alternate_method_allowed=True,
                customer_action_required=True,
                recoverable=True,
                confidence=0.90,
                evidence=["User did not complete OTP challenge or aborted session", f"step: {step}, reason: {reason}"]
            )
            
        # 6. Invalid Instrument / VPA Details
        if "invalid" in reason or "invalid_vpa" in reason or "invalid_card" in reason:
            return NormalizedFailure(
                owner=ErrorOwner.INSTRUMENT,
                stage=ErrorStage.INITIATION,
                reason_code="INVALID_INSTRUMENT_DETAILS",
                description="Invalid UPI ID or Card details provided.",
                retry_semantics=RetrySemantics.CUSTOMER_FIX_REQUIRED,
                alternate_method_allowed=True,
                customer_action_required=True,
                recoverable=True,
                confidence=0.95,
                evidence=["Details format validation failed at initiation", f"reason: {reason}"]
            )
            
        # Default Fallback for Unclassified / Generic Errors
        return NormalizedFailure(
            owner=ErrorOwner.CUSTOMER if source == "customer" else ErrorOwner.INTERNAL,
            stage=ErrorStage.UNKNOWN,
            reason_code="UNKNOWN_PAYMENT_FAILURE",
            description=desc or "Unclassified payment processing failure.",
            retry_semantics=RetrySemantics.SAME_INSTRUMENT_UNSAFE,
            alternate_method_allowed=True,
            customer_action_required=True,
            recoverable=True,
            confidence=0.60,
            evidence=[f"Unclassified raw error code: {code}, source: {source}"]
        )
