# ADR 004: Deterministic Policy-as-Code Guard & Duplicate Recovery Shield

## Status
Accepted

## Context
AI agents should propose actions, but must never have unchecked authority over payment execution or customer communications. Over-contacting customers or creating duplicate charges due to network ambiguity leads to severe customer churn and regulatory violations.

## Decision
1. `PolicyGuard` executes as a deterministic middleware between agent proposals and side-effect executors.
2. Hard checks include:
   - Opt-Out / Consent Shield (immediate suppression on `STOP`/`UNSUBSCRIBE`).
   - Payment State Precedence (`CAPTURED`, `AUTHORIZED`, `PENDING/UNKNOWN` states block charge creation).
   - Max Active Charge Actions Cap (at most 1 active recovery charge per case).
   - Contact Fatigue Budget (max 2 messages / 24 hours).
   - Quiet Hours (22:00 - 08:00 local time).
   - High-Value Escalation Thresholds ($\ge ₹25,000$ requires human operator approval).
3. Deterministic Idempotency Key: `hash(merchant_id, case_id, action_type, action_policy_version)`.

## Consequences
- **Positive**: Impossible for an LLM hallucination to double-charge a customer or violate contact limits.
- **Positive**: Complete compliance with merchant risk thresholds.
