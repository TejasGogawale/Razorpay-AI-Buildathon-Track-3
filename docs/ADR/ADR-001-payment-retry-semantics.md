# ADR 001: Deterministic Payment Retry Semantics & Rail Degradation Suppression

## Status
Accepted

## Context
Payment failure recovery often suffers from "blind retry loops" where failed transactions are retried on the same degraded banking rail or expired card instrument. In Indian payment ecosystems (UPI, Cards, Netbanking), transient core banking outages at major issuers (e.g. HDFC, SBI) cause severe cascade failures when retried blindly.

## Decision
1. We enforce deterministic error normalization mapping raw Razorpay errors (`code`, `source`, `step`, `reason`) into typed `RetrySemantics` (`SAME_INSTRUMENT_SAFE`, `SAME_INSTRUMENT_UNSAFE`, `DIFFERENT_METHOD_REQUIRED`, `CUSTOMER_FIX_REQUIRED`, `DO_NOT_RETRY`).
2. An Adaptive Rail Health Monitor computes rolling success rates. If a rail drops below 40% success rate with $\ge 30$ observations, all same-rail retries are suppressed.
3. For degraded rails or expired cards, the system routes to a fresh multi-rail checkout primitive: `STANDARD_PAYMENT_LINK`.

## Consequences
- **Positive**: Prevents negative customer experiences and duplicate failure cascades.
- **Positive**: Maximizes recovery probability by redirecting customers to healthy payment rails.
- **Trade-off**: Requires maintaining a rolling health window and fallback link budgets.
