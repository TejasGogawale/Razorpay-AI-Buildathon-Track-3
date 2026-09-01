# Operations Runbook: AI Revenue Recovery Orchestrator

## 1. Webhook Anomaly Handling (PRD Section 3.1 & 29)

### 1.1 Duplicate Webhook Events
- **Detection**: Inbound event ID already exists in the `events` table.
- **System Behavior**: Endpoint returns HTTP 200 with `{"is_new_event": false, "message": "Duplicate event ignored"}`.
- **Verification**: Query `SELECT * FROM events WHERE event_id = '<ID>'`.

### 1.2 Out-of-Order Webhooks (`payment.captured` before `payment.failed`)
- **System Behavior**: `AttributionService` establishes payment state precedence:
  - If a payment is already `captured` or `authorized`, subsequent `payment.failed` events will NOT transition the case to failed or trigger any charge-producing recovery action.
  - Policy Guard enforces `payment_already_captured` rule and blocks duplicate links.

### 1.3 Ambiguous / Missing Payment Webhooks
- **System Behavior**: When a payment state is `PENDING` or `UNKNOWN`, the system triggers Payment State Reconciliation.
- **Guard**: All recovery charge creation (`STANDARD_PAYMENT_LINK`, `CUSTOMER_RETRY`) is strictly BLOCKED until the Razorpay Orders API returns an authoritative outcome.

---

## 2. Payment Rail Degradation Management

### 2.1 Degraded Rail Detection
- When rolling success rate drops below 40% (with $\ge 30$ sample size) or Razorpay publishes an external downtime incident:
  - Rail status transitions to `DEGRADED`.
  - Same-instrument retries are automatically suppressed.
  - Recovery recommendations switch to Standard Payment Links (enabling multi-rail checkout).

### 2.2 Manual Rail Spike / Recovery
- To simulate degradation for testing: `POST /api/v1/rail-health/degrade?method=card&issuer=hdfc`
- To restore healthy baseline: `POST /api/v1/rail-health/restore?method=card&issuer=hdfc`

---

## 3. Opt-Out & Compliance Management

### 3.1 Customer `STOP` Request
- When customer replies with `STOP`, `UNSUBSCRIBE`, or `OPTOUT`:
  - `CustomerDB.opt_out` is set to `true`.
  - All open recovery cases for that customer transition to `STOPPED`.
  - Persistent policy shield prevents any future automated SMS, WhatsApp, or Link generation.
