# AI Revenue Recovery Orchestrator — API Documentation

Comprehensive REST API Specification for the AI Revenue Recovery Orchestrator (Razorpay AI Buildathon Track 03).

Base URL: `http://localhost:8000/api/v1` (or `http://localhost:8000`)

---

## 1. Webhook Ingestion

### `POST /webhooks/razorpay`
Verified Razorpay event ingestion endpoint with HMAC SHA256 signature verification and event-id deduplication.

**Headers:**
- `X-Razorpay-Signature`: HMAC SHA256 hex digest of the raw request body.

**Request Body:** Standard Razorpay Webhook Event JSON
```json
{
  "entity": "event",
  "account_id": "acc_mock_merchant",
  "event": "payment.failed",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test_12345",
        "order_id": "order_test_67890",
        "amount": 499900,
        "currency": "INR",
        "status": "failed",
        "method": "card",
        "issuer": "hdfc",
        "network": "visa",
        "error_code": "BAD_REQUEST_ERROR",
        "error_source": "issuer",
        "error_step": "payment_authorization",
        "error_reason": "issuer_technical_error",
        "error_description": "Bank servers timed out"
      }
    }
  }
}
```

**Response:**
```json
{
  "status": "success",
  "is_new_event": true,
  "message": "Webhook processed successfully",
  "case_id": "case_test_67890"
}
```

---

## 2. Recovery Cases

### `GET /api/v1/cases`
Query parameters: `domain`, `state`, `search`, `limit`, `offset`

### `GET /api/v1/cases/{id}`
Returns full case detail including Customer Context, Rail Health, Decision, Interventions, Attribution, and Policy Verdicts.

### `GET /api/v1/cases/{id}/timeline`
Returns complete immutable chronological audit trail of all actions and state transitions.

---

## 3. Decision & Execution Engine

### `POST /api/v1/cases/{id}/decide`
Executes Next-Best-Action Decision Engine in dry-run mode.

**Response Schema (PRD 27.1):**
```json
{
  "case_id": "case_test_67890",
  "decision_id": "dec_8f294ab1",
  "state": "READY_FOR_ACTION",
  "recommended_action": "STANDARD_PAYMENT_LINK",
  "candidate_actions": [
    {
      "action": "STANDARD_PAYMENT_LINK",
      "expected_recovery_value": 3747.25,
      "eligibility": "eligible",
      "reason_codes": ["FRESH_CHECKOUT_PATH", "HIGH_INTENT", "RAIL_DEGRADATION_REROUTE"],
      "cost_estimate": 2.0
    }
  ],
  "policy": {
    "verdict": "allowed",
    "rules": ["consent_active", "payment_state_valid_for_recovery", "contact_budget_ok"],
    "blocked_rules": [],
    "policy_version": "v1.0",
    "idempotency_key": "9d8e...f32"
  },
  "evidence_ids": ["doc_rzp_02"],
  "rationale": "Intent score: 90.0/100. Rail health monitor flagged issuer degradation..."
}
```

### `POST /api/v1/cases/{id}/execute`
Executes approved recovery action with strict idempotency and Razorpay side-effects.

---

## 4. Payment Rail Health

### `GET /api/v1/rail-health`
Returns live health metrics, baselines, and status (`HEALTHY`, `DEGRADED`, `RECOVERING`) across UPI, Cards, and Netbanking.

### `POST /api/v1/rail-health/degrade`
Simulates a downtime spike on a specific rail (e.g. `method=card&issuer=hdfc`).

### `POST /api/v1/rail-health/restore`
Restores rail health back to baseline.

---

## 5. Policy Simulation & Evaluation

### `POST /api/v1/simulation/run`
Replays 5,000 seeded synthetic cases across:
1. `no_action`
2. `static_baseline`
3. `ai_policy`

Computes incremental recovered revenue, incremental profit, and futile action suppression counts.

---

## 6. Human Review Queue

### `GET /api/v1/review-queue`
Returns pending escalation tasks with multi-agent Diagnostic Briefs.

### `POST /api/v1/review-queue/{task_id}/resolve`
Body: `{"action": "APPROVE" | "REJECT" | "OVERRIDE", "override_action": "STANDARD_PAYMENT_LINK", "notes": "Approved by supervisor"}`
