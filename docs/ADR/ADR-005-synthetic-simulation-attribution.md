# ADR 005: Seeded Synthetic Simulation & Causal Revenue Attribution

## Status
Accepted

## Context
Merchants require clear proof that an AI recovery orchestrator yields positive ROI over static rules without confusing simulated benchmarks with observed production money.

## Decision
1. A seeded deterministic synthetic dataset generator produces 5,000 cases representing payment failures (60%), abandonments (15%), subscriptions (15%), and B2B invoices (10%).
2. The simulator compares three distinct arms:
   - **No Action**: Pure organic recovery baseline.
   - **Static Baseline**: Blind retry and generic reminders.
   - **AI Policy**: Context-aware next-best-action with rail rerouting and profit-aware dynamic incentives.
3. Strict separation of concerns: Simulation results are visibly labeled as "Policy Simulation", while live Test Mode captures are recorded as "Observed Demo Recoveries" with exact time-to-recovery and causal intervention linkage.

## Consequences
- **Positive**: Transparent, honest, and reproducible evaluation for judges and enterprise stakeholders.
- **Positive**: Direct measurement of incremental revenue and incremental profit.
