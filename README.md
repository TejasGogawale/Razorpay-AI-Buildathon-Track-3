# AI Revenue Recovery Orchestrator
**Razorpay AI Buildathon — Track 03: AI Revenue Recovery**

An enterprise-grade, failure-aware, context-aware revenue recovery decisioning orchestrator for Razorpay merchants.

---

## 🎯 Core Product Statement
Most payment-recovery systems answer the question: *"What failed?"*  
The Orchestrator answers the much more valuable question:  
**"Given why this failed, what we know about this customer, what is happening to the payment rail, and what actions are allowed by deterministic policy, what should happen next?"**

---

## 🚀 Key Features

1. **Failure-Aware Error Taxonomy**: Normalizes Razorpay errors into structured ownership, stages, and retry semantics.
2. **Interpretable Customer Intent Scoring**: 0–100 behavioral scoring based on progression, recency, and purchase history.
3. **Adaptive Payment-Rail Health**: Tracks rolling success rates across UPI, Cards (HDFC, SBI, ICICI, Axis), and Netbanking; automatically suppresses futile same-rail retries during outages.
4. **Deterministic Policy-as-Code Guard**: Hard boundaries enforce consent (STOP opt-out), contact fatigue (max 2 messages/24h), quiet hours (22:00–08:00), duplicate-recovery shields, and high-value human escalation ($\ge ₹25,000$).
5. **Expected Recovery Value (ERV) Engine**: Ranks candidate actions by net expected financial recovery taking intervention and incentive costs into account.
6. **Load-Bearing Hybrid RAG**: BM25 + dense semantic retrieval grounded in Razorpay error catalogs and merchant policies with prompt-injection defenses.
7. **Causal Revenue Attribution**: Directly attributes subsequent successful captures (`payment_link.paid`, `payment.captured`) to preceding interventions within configured time windows.
8. **5,000-Case Seeded Policy Simulator**: Rigorously compares No Action vs. Static Baseline vs. AI Policy with clear simulation labeling.
9. **Zero Mandatory API Spend**: Provider-neutral Model Gateway supporting local Ollama models (`qwen3:8b`, `gemma3:4b`, `mistral-small`) with deterministic template fallbacks.

---

## 📂 Repository Structure

```
revenue-recovery-orchestrator/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST API endpoints & Webhooks
│   │   ├── domain/          # State machines, Error taxonomy, Policies
│   │   ├── application/     # Recovery service, Attribution, Simulation
│   │   ├── infrastructure/  # Razorpay client, Database, Event store
│   │   ├── intelligence/    # Scoring, Rail health, Hybrid RAG, Model Gateway
│   │   ├── agents/          # Multi-agent reasoning layer
│   │   └── policy/          # Deterministic Policy-as-Code Guard
│   └── tests/               # 12 Mandatory PRD test cases
├── frontend/                # Next.js 14+ / React / Tailwind CSS Dashboard
├── data/
│   ├── generators/          # 5,000 synthetic cases generator
│   └── fixtures/            # 10 Replayable demo & failure scenarios
├── docs/
│   ├── ADR/                 # 5 Architecture Decision Records
│   ├── API.md               # REST API reference
│   ├── DEMO.md              # 5-minute hackathon demo script
│   └── RUNBOOK.md           # Operational runbook
└── infra/
    └── docker-compose.yml   # PostgreSQL + pgvector + Redis
```

---

## ⚡ Quickstart

### 1. Backend
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run mandatory test suite (12 tests)
python -m pytest backend/tests/test_mandatory_suite.py -v

# Start FastAPI backend
python -m uvicorn backend.app.main:app --port 8000 --reload
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to access the interactive dashboard, scenario runner, and policy simulator.
