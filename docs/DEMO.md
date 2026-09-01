# AI Revenue Recovery Orchestrator — 5-Minute Demo Script & Guide

Follow this guide to demonstrate the system live to hackathon judges in 5 minutes (PRD Section 37).

---

## 5-Minute Demo Walkthrough

| Time | Demo Action | Judge Takeaway |
|---|---|---|
| **0:00–0:20** | Open Dashboard & Demo Console. Trigger **Scenario 1: Transient Issuer Failure** (₹4,999). | Revenue is immediately at risk. |
| **0:20–0:50** | Show real event ingestion, HMAC verification, and automatic case creation. | Real event-driven architecture with zero latency. |
| **0:50–1:20** | Inspect **Case Detail**: Intent Score (90/100), Error Normalization (`ISSUER_DEGRADED`), and Customer Context. | System understands domain semantics and customer context. |
| **1:20–1:50** | Show **Rail Health**: HDFC Card degradation detected; system rejects blind same-card retry. | Infrastructure-aware recovery prevents futile retries. |
| **1:50–2:30** | Show **Next-Best-Action**: `STANDARD_PAYMENT_LINK` ranked highest by ERV. Policy Guard authorizes. | AI proposes; deterministic policy controls and authorizes. |
| **2:30–3:00** | Click **Execute Action**: Razorpay Payment Link generated with unique idempotency key. | System executes real test-mode side effects. |
| **3:00–3:30** | Click **Simulate Customer Payment**: Triggers `payment.captured` event. | Real money-flow state transition in test mode. |
| **3:30–4:00** | View **Attribution Timeline**: ₹4,999 attributed as recovered revenue in 18 seconds. | Causal measurement, not vanity metrics. |
| **4:00–4:30** | Trigger **Scenario 5 (STOP Opt-Out)** & **Scenario 6 (Charged-but-Uncertain)**. | Agent knows when NOT to act (safety guardrails). |
| **4:30–5:00** | Open **Simulation & ROI**: Replay 5,000 cases comparing No Action vs Static Baseline vs AI Policy. | Scalable, proven ROI uplift (+₹2.4M incremental revenue). |

---

## Closing Statement
> *"We did not build another payment-failure chatbot. We built a next-best-action recovery layer: it understands why a payment failed, understands whether the customer is still trying to buy, checks whether the payment rail is healthy, chooses the least-friction recovery path, executes only within hard policy boundaries, and proves whether the intervention recovered money."*
