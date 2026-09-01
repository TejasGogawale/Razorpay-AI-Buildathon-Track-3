from typing import List, Dict, Any, Tuple
from ...domain.recovery.models import ActionEnum, ActionCandidate
from ...domain.payments.models import NormalizedFailure, RetrySemantics

class ERVScoringEngine:
    """
    Computes Expected Recovery Value (ERV) and action-specific candidate ranking
    per PRD Section 10.1, 10.2, and Section 18.
    """
    
    BASE_INTERVENTION_COSTS = {
        ActionEnum.WAIT: 0.0,
        ActionEnum.CUSTOMER_RETRY: 1.0,        # SMS / Push cost
        ActionEnum.ALTERNATE_METHOD: 1.5,
        ActionEnum.STANDARD_PAYMENT_LINK: 2.0,  # Link API + SMS/WhatsApp dispatch
        ActionEnum.REMINDER: 1.0,
        ActionEnum.SCHEDULED_RETRY: 0.5,
        ActionEnum.INCENTIVE: 5.0,             # Outreach + voucher processing
        ActionEnum.ESCALATE_HUMAN: 50.0,        # Human agent operational cost
        ActionEnum.STOP: 0.0
    }

    @classmethod
    def evaluate_candidates(
        cls,
        amount_inr: float,
        intent_score: float,
        failure: NormalizedFailure,
        is_rail_degraded: bool,
        customer_opted_out: bool,
        attempts_count: int,
        contact_count_24h: int,
        allow_incentives: bool = False,
        merchant_margin_rate: float = 0.25 # 25% default gross margin
    ) -> List[ActionCandidate]:
        candidates: List[ActionCandidate] = []
        norm_intent = min(1.0, max(0.0, intent_score / 100.0))
        
        # 1. STOP candidate (always present)
        candidates.append(ActionCandidate(
            action=ActionEnum.STOP,
            expected_recovery_value=0.0,
            p_recovery=0.0,
            eligibility="eligible" if (customer_opted_out or not failure.recoverable) else "conditional",
            reason_codes=["OPT_OUT" if customer_opted_out else ("NON_RECOVERABLE" if not failure.recoverable else "BASELINE_STOP")],
            cost_estimate=0.0
        ))
        
        # If opted out or non-recoverable, all active recovery actions are blocked
        if customer_opted_out:
            return candidates

        # 2. STANDARD_PAYMENT_LINK
        p_link = 0.75 * norm_intent
        if is_rail_degraded:
            p_link = 0.85 * norm_intent # Payment link lets customer pick healthy rails
        if failure.retry_semantics == RetrySemantics.DIFFERENT_METHOD_REQUIRED:
            p_link = 0.80 * norm_intent
            
        link_cost = cls.BASE_INTERVENTION_COSTS[ActionEnum.STANDARD_PAYMENT_LINK]
        erv_link = (amount_inr * p_link) - link_cost
        
        link_reasons = ["FRESH_CHECKOUT_PATH", "HIGH_INTENT"]
        if is_rail_degraded:
            link_reasons.append("RAIL_DEGRADATION_REROUTE")
        if failure.retry_semantics == RetrySemantics.DIFFERENT_METHOD_REQUIRED:
            link_reasons.append("INSTRUMENT_EXPIRED_OR_INVALID")
            
        candidates.append(ActionCandidate(
            action=ActionEnum.STANDARD_PAYMENT_LINK,
            expected_recovery_value=round(max(0.0, erv_link), 2),
            p_recovery=round(p_link, 3),
            eligibility="eligible" if failure.recoverable else "blocked",
            reason_codes=link_reasons,
            cost_estimate=link_cost
        ))

        # 3. ALTERNATE_METHOD
        p_alt = 0.70 * norm_intent
        alt_cost = cls.BASE_INTERVENTION_COSTS[ActionEnum.ALTERNATE_METHOD]
        erv_alt = (amount_inr * p_alt) - alt_cost
        candidates.append(ActionCandidate(
            action=ActionEnum.ALTERNATE_METHOD,
            expected_recovery_value=round(max(0.0, erv_alt), 2),
            p_recovery=round(p_alt, 3),
            eligibility="eligible" if failure.alternate_method_allowed else "blocked",
            reason_codes=["ALTERNATE_PAYMENT_INSTRUMENT"],
            cost_estimate=alt_cost
        ))

        # 4. CUSTOMER_RETRY (Same instrument)
        retry_eligible = "eligible"
        retry_reasons = ["SAME_INSTRUMENT_RETRY"]
        block_reasons = []
        
        if is_rail_degraded:
            retry_eligible = "blocked"
            block_reasons.append("ISSUER_OR_RAIL_DEGRADED")
        if failure.retry_semantics in [RetrySemantics.SAME_INSTRUMENT_UNSAFE, RetrySemantics.DIFFERENT_METHOD_REQUIRED, RetrySemantics.DO_NOT_RETRY]:
            retry_eligible = "blocked"
            block_reasons.append(f"UNSAFE_RETRY_SEMANTICS_{failure.retry_semantics}")
        if attempts_count >= 2:
            retry_eligible = "blocked"
            block_reasons.append("RETRY_BUDGET_EXHAUSTED")
            
        p_retry = 0.65 * norm_intent if retry_eligible == "eligible" else 0.05
        retry_cost = cls.BASE_INTERVENTION_COSTS[ActionEnum.CUSTOMER_RETRY]
        erv_retry = (amount_inr * p_retry) - retry_cost if retry_eligible == "eligible" else 0.0
        
        candidates.append(ActionCandidate(
            action=ActionEnum.CUSTOMER_RETRY,
            expected_recovery_value=round(max(0.0, erv_retry), 2),
            p_recovery=round(p_retry, 3),
            eligibility=retry_eligible,
            reason_codes=retry_reasons,
            block_reasons=block_reasons,
            cost_estimate=retry_cost
        ))

        # 5. WAIT (e.g. transient outage settling)
        p_wait = 0.40 * norm_intent if is_rail_degraded else 0.15 * norm_intent
        erv_wait = amount_inr * p_wait
        candidates.append(ActionCandidate(
            action=ActionEnum.WAIT,
            expected_recovery_value=round(max(0.0, erv_wait), 2),
            p_recovery=round(p_wait, 3),
            eligibility="eligible",
            reason_codes=["TRANSIENT_WAIT_COOLDOWN" if is_rail_degraded else "OBSERVATION_HOLD"],
            cost_estimate=0.0
        ))

        # 6. ESCALATE_HUMAN
        is_high_risk = (amount_inr >= 25000.0 or attempts_count >= 3 or not failure.recoverable)
        p_human = 0.85 * norm_intent
        human_cost = cls.BASE_INTERVENTION_COSTS[ActionEnum.ESCALATE_HUMAN]
        erv_human = (amount_inr * p_human) - human_cost
        candidates.append(ActionCandidate(
            action=ActionEnum.ESCALATE_HUMAN,
            expected_recovery_value=round(max(0.0, erv_human), 2),
            p_recovery=round(p_human, 3),
            eligibility="eligible" if is_high_risk else "conditional",
            reason_codes=["HIGH_VALUE_OR_HIGH_AMBIGUITY" if is_high_risk else "MANUAL_SUPERVISION"],
            cost_estimate=human_cost
        ))

        # 7. INCENTIVE (Dynamic profit-aware coupon)
        if allow_incentives and norm_intent > 0.6 and failure.recoverable:
            # Check Section 18 Expected Incremental Profit formula
            p_with_inc = min(0.95, p_link + 0.15)
            discount_amount = min(500.0, amount_inr * 0.05) # 5% bounded discount
            margin_after = (amount_inr - discount_amount) * merchant_margin_rate
            margin_before = amount_inr * merchant_margin_rate
            
            incremental_profit = (p_with_inc * margin_after) - (p_link * margin_before) - 5.0
            
            if incremental_profit > 10.0:
                erv_inc = (amount_inr * p_with_inc) - discount_amount - 5.0
                candidates.append(ActionCandidate(
                    action=ActionEnum.INCENTIVE,
                    expected_recovery_value=round(max(0.0, erv_inc), 2),
                    p_recovery=round(p_with_inc, 3),
                    eligibility="eligible",
                    reason_codes=["POSITIVE_INCREMENTAL_MARGIN", "BOUNDED_DISCOUNT_APPROVED"],
                    cost_estimate=discount_amount + 5.0
                ))

        # Rank candidates descending by Expected Recovery Value among eligible actions
        candidates.sort(key=lambda c: (1 if c.eligibility == "eligible" else 0, c.expected_recovery_value), reverse=True)
        return candidates
