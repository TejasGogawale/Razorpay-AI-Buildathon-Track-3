# ADR 002: Provider-Agnostic Model Gateway & Zero Mandatory API Spend

## Status
Accepted

## Context
Production payment recovery requires high availability, strict schema compliance, low latency, and zero dependency on paid proprietary LLM APIs for core decisioning.

## Decision
1. Implement a unified `ModelGateway` interface (`generate_structured`, `generate_text`, `health`).
2. Prioritize local open-weights models served via Ollama (`qwen3:8b`, `gemma3:4b`, `mistral-small`).
3. Include an embedded local deterministic domain template engine as the foundational fallback tier.
4. If Ollama or cloud providers are unreachable, the system executes deterministic domain logic with zero latency penalty and zero failure rate.

## Consequences
- **Positive**: 100% offline capability and zero mandatory API spend.
- **Positive**: Resilient against LLM outages, rate limits, and network partitions.
- **Positive**: Every decision records model name, version, provider, and latency provenance.
