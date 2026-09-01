# ADR 003: Hybrid RAG Evidence Grounding and Prompt-Injection Defense

## Status
Accepted

## Context
RAG in autonomous payment workflows must be load-bearing rather than decorative. External merchant documents or user inputs could potentially contain prompt injections attempting to bypass policy rules or grant unauthorized discounts.

## Decision
1. RAG retrieval merges lexical/BM25 token frequency with semantic tag and embedding scoring.
2. Retrieved evidence chunks are sanitized against known injection patterns before synthesis.
3. System policies are strictly separated from retrieved documents: retrieved content provides context and evidence citations but CANNOT authorize actions or override deterministic policy guards.
4. Every decision decision records traceable `evidence_ids`.

## Consequences
- **Positive**: Immune to prompt injections attempting to manipulate discounts or bypass human escalation.
- **Positive**: Complete auditability of why an action was suggested.
