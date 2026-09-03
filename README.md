# RecoverOS: AI Revenue Recovery Orchestrator
**Razorpay AI Buildathon — Track 03: AI Revenue Recovery**

> An enterprise-grade, failure-aware, context-aware revenue recovery decisioning orchestrator that transforms payment declines and checkout abandonment into captured revenue through machine learning, customer psychology profiling, and deterministic policy guardrails.

---

## 🎯 Executive Summary & Core Philosophy

Most payment recovery tools ask: *"What failed?"* and blindly spam customers with generic retry links.  
**RecoverOS** asks the enterprise-grade question:  
> **"Given why this transaction failed, the customer's psychological profile and abandonment risk, real-time banking rail health, and deterministic compliance policies—what is the exact Next-Best Action (NBA) that maximizes Expected Recovery Value (ERV) without risking duplicate debits or customer fatigue?"**

---

## 🏗️ System Architecture

```
                                  [ CUSTOMER / CHECKOUT TERMINAL ]
                         Web • Mobile • Shopify • WooCommerce • Custom React
                                                  │
                ┌─────────────────────────────────┴─────────────────────────────────┐
                ▼                                                                   ▼
       [ RAZORPAY WEBHOOKS ]                                           [ CLIENT-SIDE TELEMETRY ]
  payment.failed • order.paid • mandate.halted                       Dwell Time • Hesitation • Method Switch
                │                                                                   │
                └─────────────────────────────────┬─────────────────────────────────┘
                                                  ▼
                         +──────────────────────────────────────────────────+
                         |       RECOVEROS REVENUE ORCHESTRATION ENGINE     |
                         +──────────────────────────────────────────────────+
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
       [ 1. DIAGNOSTICIAN ]              [ 2. ML & PSYCHOLOGY ]            [ 3. RAIL TELEMETRY ]
    Hybrid BM25 + Semantic RAG           RandomForest Classifier (20k)        Rolling Health Monitor
    • Bank Error Taxonomy                • 6 Psychology Archetypes            • HDFC / SBI / ICICI Outages
    • Ownership & Retry Semantics        • Checkout Abandonment Risk          • Success Rate Degradation
                │                                 │                                 │
                └─────────────────────────────────┼─────────────────────────────────┘
                                                  ▼
                                      [ 4. STRATEGIST AGENT ]
                                Expected Recovery Value (ERV) Engine
                             ERV = P(Recovery) × (Amount × Margin) - Cost
                                                  │
                                                  ▼
                                    [ 5. POLICY CRITIC & GUARD ]
                                  Deterministic Safety Boundaries
                             • Zero Duplicate Debits (Idempotency Key)
                             • DND / WhatsApp Opt-Out Compliance
                             • Contact Fatigue: Max 2 msgs / 24h
                             • Quiet Hours: 22:00 – 08:00 IST
                             • High-Value Human Review Escalation (≥ ₹25k)
                                                  │
                                                  ▼
                                   [ 6. MULTI-CHANNEL EXECUTOR ]
         ┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
         ▼                              ▼                              ▼                              ▼
  [ 1-Tap WhatsApp UPI ]     [ In-App AI Concierge ]       [ Smart Dunning Retry ]      [ Human Review Queue ]
   Direct Intent Deep-Link     Bilingual Voice & Text       Off-Peak Automated Hold       High-Value Triage
```

---

## 🚀 Key Architectural Pillars

### 1. 20,000-Case Machine Learning & Psychology Dataset
RecoverOS is powered by an empirical 20,000-case dataset (`data/customer_recovery_and_behavioral_dataset.csv`) comprising 45 engineered features covering transaction history, device contexts, session telemetry, and psychological profiles:
* **Trained Classifier**: `RandomForestClassifier` (`n_estimators=100`, `max_depth=12`, `random_state=42`)
* **Evaluation Metrics**:
  * **ROC-AUC**: **0.7537**
  * **Accuracy**: **71.3%**
  * **Precision**: **0.728** | **Recall**: **0.694**
* **Model Artifacts**: Exported and dynamically loaded via `joblib` (`backend/app/intelligence/ml/recovery_rf_model.joblib`).

### 2. Customer Psychology & Behavioral Profiling
Instead of treating all customers identically, RecoverOS classifies buyers into **6 psychological archetypes** to select optimal intervention strategies:

| Archetype | Share | Recoverable % | Lost % | Frequent Abandonment | Optimal Recovery Policy |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **⭐ Loyal Repeat Buyer** | 60.8% | **80.9%** | 19.1% | 0.0% | VIP priority alternate payment link with 0% discount. |
| **🛒 Window Shopper Abandoner** | 18.1% | **78.3%** | 21.7% | 4.6% | Limited-time 24h Stock Hold Reservation alert with scarcity push. |
| **⚡ Friction-Averse 1-Tap Speed** | 9.9% | **79.7%** | 20.3% | 21.3% | Instant 1-Tap WhatsApp UPI Intent link (bypasses card redirect). |
| **🛡️ Anxious & Security Conscious** | 6.0% | **98.4%** | 1.6% | 23.6% | Bilingual Voice & Text Reassurance confirming zero double-debit. |
| **🎯 Chronic Deal Hunter** | 3.5% | **79.1%** | 20.9% | 100.0% | Bounded 5% recovery incentive with countdown timer. |
| **🛍️ First-Time Skeptical** | 1.7% | **78.4%** | 21.6% | 65.3% | Razorpay Verified Trust Badges and 24h order hold comfort. |

### 3. Recoverable vs. Lost Revenue Economics
Our attribution telemetry categorizes gross failed payment volume into addressable vs. unrecoverable revenue:
* **Gross Revenue at Risk**: **₹200,917,365**
* **Recoverable Revenue**: **₹163,199,602 (81.2%)** — High recovery propensity addressable by AI policy.
* **Permanently Lost Revenue**: **₹37,717,763 (18.8%)** — Intentionally suppressed to prevent fee penalties, chargebacks, and compliance violations:
  1. *Bank Core Technical Glitches*: ₹13.33M (35.4%)
  2. *Session Distraction & Timeouts*: ₹9.30M (24.6%)
  3. *Price Shock at Shipping/Taxes*: ₹6.79M (18.0%)
  4. *Window Shopping Comparison Exits*: ₹6.24M (16.6%)
  5. *Instrument Input Errors & Expired Cards*: ₹1.16M (3.1%)

### 4. Deterministic Policy-as-Code Guardrails
Machine learning proposes candidate actions; deterministic policy enforces hard safety:
* **Duplicate Recovery Prevention**: Idempotency locks prevent double-charging if a customer pays through another window.
* **Consent & Anti-Spam**: Immediate suppression if the customer replies `STOP` or has DND enabled.
* **Fatigue Limiter**: Strict limit of $\le 2$ recovery touches per 24 hours.
* **Quiet Hours Enforcement**: No automated messaging between 22:00 and 08:00 IST.
* **High-Value Escalation**: Transactions $\ge ₹25,000$ route to human agent review.

### 5. Multi-Agent LangGraph Reasoning Loop
Specialized evaluating agents collaborate before any action executes:
1. **Diagnostician Agent**: Retrieves decline evidence via BM25 + dense semantic RAG.
2. **Strategist Agent**: Computes Expected Recovery Value (ERV) and selects optimal channel.
3. **Policy Critic Agent**: Validates safety constraints and margin thresholds.
4. **Supervisor Evaluator**: Achieves multi-agent consensus before triggering external APIs.

---

## 💻 Interactive Features & User Interface

### 💳 Interactive Payment Gateway (`/checkout`)
A realistic, workable payment terminal for testing failure detection and recovery:
* **Card Payment with Real Validation**:
  * Entering an expired date (e.g., `08/24`) flags an inline validation error and triggers an authentic `CARD_EXPIRED` decline.
  * Entering an HDFC card (`4532...`) simulates a transient bank downtime spike (`ISSUER_TECHNICAL_ERROR`).
  * Entering a valid test card launches an authentic **3D Secure OTP Modal**.
* **Instant UPI with Dynamic QR**:
  * Real-time SVG UPI QR Code with validity countdown timer.
  * Copyable VPA (`recoveros@razorpay`) and 1-tap "Simulate Scanned & Paid" button.
* **Netbanking with Direct Official Bank Links**:
  * Direct links to official portals: HDFC, SBI, ICICI, Axis, Kotak, and PNB.
  * Interactive modal to test bank redirect and session callbacks.
* **Always-On Conversational AI Concierge**:
  * Resilient RAG engine providing instant answers in **English and Hinglish**.
  * Bilingual text-to-speech audio synthesis (🔊 `EN Voice` / 🗣️ `Hinglish Voice`).

### 📊 Overview Dashboard (`/`)
* **4 Synchronized KPI Cards**: Revenue at Risk, Recoverable Revenue (81.2%), Lost Revenue (18.8%), and Recovered Revenue.
* **Customer Behavioral Dynamics Section**:
  * Macro dual progress bar comparing recoverable vs. lost revenue.
  * Interactive 6-archetype selector with deep-dive diagnostics.
  * Grouped bar chart comparing recoverable vs. lost volume across archetypes.
  * Primary abandonment trigger breakdown cards.
* **Live Recovery Queue**: Real-time triage with intent scores and diagnostic briefs.

### 🎮 Monte Carlo Policy Simulator (`/simulation`)
* Replays 1,000 to 20,000 synthetic failure cases across three arms:
  1. **No Action (Organic)**
  2. **Static Baseline (Blind Retries)**
  3. **AI Policy Orchestrator**
* Evaluates financial yield, net merchant profit, futile actions suppressed, and behavioral archetype yields.

### 🔌 Enterprise Integration Hub (`/integration`)
Complete implementation blueprints and an **Interactive Enterprise ROI Calculator** allowing companies to model monthly revenue recovery gains based on their GMV.

---

## 🏢 How Any Company Can Implement RecoverOS

RecoverOS supports 4 modular deployment tiers:

| Deployment Tier | Best For | Setup Time | How It Works |
| :--- | :--- | :---: | :--- |
| **Tier 1: Zero-Code Webhook** | Shopify, WooCommerce, Standard Razorpay | **2 min** | Forward `payment.failed` and `order.paid` webhooks from Razorpay Dashboard. |
| **Tier 2: Drop-in React SDK** | Next.js, React, Mobile Apps | **5 min** | Drop `<AutonomousRecoveryWidget />` into checkout for real-time dwell tracking. |
| **Tier 3: Headless Backend SDK** | Custom Engineering (Python/Node) | **15 min** | Call `engine.evaluate_payment_failure()` via Python, Node.js, or REST API. |
| **Tier 4: Self-Hosted Sidecar** | Banks, Fintechs, NBFCs (PCI-DSS) | **30 min** | Deploy pre-configured `docker-compose.yml` within your private AWS/GCP VPC. |

---

## 📂 Repository Structure

```
d:\Razorpay/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes.py            # REST API endpoints & Webhooks
│   │   ├── application/
│   │   │   ├── attribution_service.py  # Causal attribution & behavioral metrics
│   │   │   ├── orchestrator_service.py # Next-Best Action decision engine
│   │   │   └── simulation_service.py   # Monte Carlo policy simulation service
│   │   ├── domain/recovery/            # Error taxonomy, states, models
│   │   ├── infrastructure/             # Database models, Razorpay client adapter
│   │   ├── intelligence/
│   │   │   ├── ml/                     # Trained RandomForest model & scaler
│   │   │   ├── rag/                    # Self-Correcting RAG engine
│   │   │   └── rail_health_monitor.py  # Real-time bank health tracker
│   │   └── policy/                     # Deterministic Policy-as-Code Guard
│   └── tests/                          # 12 Mandatory PRD test cases
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Overview Dashboard & Behavioral Analytics
│   │   ├── checkout/page.tsx           # Interactive Payment Terminal & AI Concierge
│   │   ├── simulation/page.tsx         # Monte Carlo Policy Simulator
│   │   ├── integration/page.tsx        # Enterprise Deployment Hub & ROI Calculator
│   │   ├── cases/page.tsx              # Ingested Recovery Worklist
│   │   ├── policies/page.tsx           # Policy Center & Rule Configuration
│   │   └── scenarios/page.tsx          # Interactive Demo Scenario Runner
│   ├── components/                     # Reusable UI components (Navbar, Charts)
│   └── lib/api.ts                      # Frontend API client
├── data/
│   ├── customer_recovery_and_behavioral_dataset.csv  # 20k-case behavioral dataset
│   └── generators/                                   # Data generation scripts
├── docs/                               # Architecture decision records & guides
└── README.md
```

---

## ⚡ Quickstart Guide

### Prerequisites
* **Python 3.10+**
* **Node.js 18+ & npm**
* **Git**

### 1. Backend Setup
```bash
# Navigate to project root
cd d:\Razorpay

# Install backend dependencies
pip install -r backend/requirements.txt

# Run the mandatory PRD test suite (12 tests)
python -m pytest backend/tests/test_mandatory_suite.py -v

# Start the FastAPI server on port 8000
python -m uvicorn backend.app.main:app --port 8000 --reload
```
* Backend will be live at: **`http://localhost:8000`**
* Interactive Swagger Docs: **`http://localhost:8000/docs`**

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
* Frontend will be live at: **`http://localhost:3000`**

---

## 🧪 Testing & Verification

### Running Automated Test Suite
```bash
# Run all unit and integration tests
pytest backend/tests/ -v
```

### Testing Key API Endpoints
```bash
# 1. Fetch Dashboard Metrics with Customer Behavioral Analytics
curl http://localhost:8000/api/v1/dashboard/metrics

# 2. Query the AI Recovery Concierge Chat
curl -X POST http://localhost:8000/api/v1/checkout/chat \
  -H "Content-Type: application/json" \
  -d '{"case_id":"test_1","user_message":"Will I get charged twice?","order_amount_inr":4999,"payment_method":"card","issuer":"hdfc"}'

# 3. Run Monte Carlo Simulation (1,000 cases)
curl -X POST "http://localhost:8000/api/v1/simulation/run?sample_size=1000&margin_rate=0.25"
```

---

## 🛡️ Security, Privacy & Compliance

* **RBI Compliance**: Adheres to Reserve Bank of India e-mandate guidelines and quiet-hours notifications.
* **PCI-DSS Friendly**: Operates purely on tokenized payment IDs, masked card metadata (`last4`, `issuer`), and normalized error codes. No raw PAN or CVV is ever logged or stored.
* **Consent First**: Automatically honors WhatsApp/SMS opt-outs (`STOP`) and customer DND registries.

---

## 🏆 Hackathon Alignment: Razorpay AI Buildathon (Track 3)

| Requirement | Implementation in RecoverOS |
| :--- | :--- |
| **Failure-Aware Taxonomy** | Structured error normalization with retry semantics in `backend/app/domain/recovery/`. |
| **Intelligent Decisioning** | Trained ML model (`RandomForestClassifier`, 20k cases) + Expected Recovery Value (ERV) engine. |
| **Deterministic Policy Guard** | Policy-as-Code enforcing DND, duplicate prevention, quiet hours, and human review. |
| **Multi-Agent Evaluation** | LangGraph state graph evaluating diagnosis, strategy, and policy consensus. |
| **Interactive Terminal** | Workable Checkout Gateway (`/checkout`) with dynamic UPI QR, netbanking, and card validation. |
| **Causal Attribution** | Automatic revenue linking on subsequent `order.paid` / `payment.captured` webhooks. |

---

## 📄 License
This project is developed for the **Razorpay AI Buildathon (Track 03: AI Revenue Recovery)**.
Distributed under the Apache 2.0 License.
