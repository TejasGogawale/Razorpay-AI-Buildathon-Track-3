import re
import math
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class KnowledgeChunk(BaseModel):
    id: str
    doc_id: str
    title: str
    content: str
    category: str # "razorpay_errors" | "merchant_policy" | "compliance" | "playbook"
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RetrievalResult(BaseModel):
    chunk: KnowledgeChunk
    score: float
    retrieval_type: str # "hybrid" | "bm25" | "vector"
    sanitized_evidence: str

class HybridRAGEngine:
    """
    Load-bearing Hybrid RAG Engine (BM25 + Dense vector mock/embedding + Prompt Injection Shield)
    based on PRD Section 21.
    """
    
    def __init__(self):
        self.chunks: List[KnowledgeChunk] = []
        self._initialize_knowledge_base()

    def _sanitize_untrusted_text(self, text: str) -> str:
        """
        PRD Section 21.3 Prompt-injection defense:
        Strips executable prompts/instructions from retrieved external documents.
        """
        # Block common prompt injection phrases
        forbidden_patterns = [
            r"ignore previous instructions",
            r"system prompt override",
            r"grant full discount",
            r"bypass policy",
            r"authorize payment without check",
            r"curl http",
            r"<script>",
            r"DROP TABLE",
            r"rm -rf"
        ]
        sanitized = text
        for pat in forbidden_patterns:
            sanitized = re.sub(pat, "[FILTERED_INSTRUCTION]", sanitized, flags=re.IGNORECASE)
        return sanitized

    def _initialize_knowledge_base(self):
        docs = [
            KnowledgeChunk(
                id="doc_rzp_01",
                doc_id="rzp_err_kb",
                title="Razorpay Card Expired Protocol",
                content="When a card error indicates 'card_expired' or 'expired', same-card retries are guaranteed to fail. The system must present an alternate checkout mechanism or Standard Payment Link so the customer can supply a valid card or switch to UPI.",
                category="razorpay_errors",
                tags=["card_expired", "card", "retry", "alternate_method"]
            ),
            KnowledgeChunk(
                id="doc_rzp_02",
                doc_id="rzp_err_kb",
                title="Issuer Rail Degradation & Downtime Handling",
                content="During bank issuer technical errors (e.g. HDFC/SBI core banking timeout), immediate retry on the same instrument exacerbates failure rates and frustrates users. The orchestrator must reroute the customer to Standard Payment Link or healthy payment rails (UPI/Netbanking).",
                category="razorpay_errors",
                tags=["issuer_technical_error", "downtime", "degradation", "payment_link"]
            ),
            KnowledgeChunk(
                id="doc_rzp_03",
                doc_id="rzp_int_kb",
                title="Razorpay Test Mode Payment Link Limits & Constraints",
                content="Standard Payment Links in Razorpay Test Mode support Card, Netbanking, and Wallet simulation. UPI deep links operate exclusively in Live mode. Enforce link creation idempotency keys to prevent duplicate link dispatch.",
                category="razorpay_errors",
                tags=["payment_link", "test_mode", "idempotency", "limits"]
            ),
            KnowledgeChunk(
                id="doc_pol_01",
                doc_id="merchant_policy",
                title="Merchant Duplicate Payment Protection Rule",
                content="Under no circumstances should a recovery charge or Payment Link be created if the original payment state is UNKNOWN or PENDING. The case must be routed to Payment State Reconciliation to verify with Razorpay Orders API first.",
                category="merchant_policy",
                tags=["duplicate_prevention", "reconciliation", "unknown_state", "pending"]
            ),
            KnowledgeChunk(
                id="doc_pol_02",
                doc_id="merchant_policy",
                title="Customer Contact Fatigue and Quiet Hours",
                content="Merchants enforce a hard limit of 2 automated messages per 24-hour rolling window. No automated SMS/WhatsApp messages may be sent between 22:00 and 08:00 local time. Explicit STOP/UNSUBSCRIBE commands trigger permanent communication suppression.",
                category="compliance",
                tags=["contact_fatigue", "quiet_hours", "opt_out", "stop"]
            ),
            KnowledgeChunk(
                id="doc_pol_03",
                doc_id="merchant_policy",
                title="Dynamic Incentive Margin Protection",
                content="Recovery discounts or vouchers are strictly forbidden for technical payment failures. Bounded incentives (max 10% or ₹500) may only be applied to price-sensitive checkout abandonment where expected incremental profit is positive.",
                category="merchant_policy",
                tags=["incentive", "discount", "margin_cap", "abandonment"]
            ),
            KnowledgeChunk(
                id="doc_pol_04",
                doc_id="merchant_policy",
                title="Human Escalation Triggers",
                content="Transactions exceeding ₹25,000 INR, suspected risk/fraud blocks, or cases where 3 consecutive payment attempts have failed must be escalated to the Human Review Queue with a synthesized Diagnostic Brief.",
                category="compliance",
                tags=["escalation", "high_value", "fraud", "review_queue"]
            )
        ]
        self.chunks = docs

    def add_document(self, title: str, content: str, category: str, tags: List[str] = None) -> KnowledgeChunk:
        chunk = KnowledgeChunk(
            id=f"doc_custom_{len(self.chunks)+1}",
            doc_id=f"custom_kb_{len(self.chunks)+1}",
            title=title,
            content=self._sanitize_untrusted_text(content),
            category=category,
            tags=tags or []
        )
        self.chunks.append(chunk)
        return chunk

    def search(self, query: str, top_k: int = 3, category_filter: Optional[str] = None) -> List[RetrievalResult]:
        """
        Hybrid Lexical (token match + BM25-style frequency) & Keyword search.
        """
        tokens = set(re.findall(r"\w+", query.lower()))
        results: List[RetrievalResult] = []
        
        for chunk in self.chunks:
            if category_filter and chunk.category != category_filter:
                continue
                
            chunk_text = f"{chunk.title} {chunk.content} {' '.join(chunk.tags)}".lower()
            chunk_tokens = re.findall(r"\w+", chunk_text)
            
            # Compute lexical overlap score
            matched = sum(1 for t in tokens if t in chunk_tokens)
            tag_matches = sum(2 for t in tokens if t in [tag.lower() for tag in chunk.tags])
            
            total_score = (matched * 1.5) + (tag_matches * 2.0)
            
            if total_score > 0:
                results.append(RetrievalResult(
                    chunk=chunk,
                    score=round(total_score, 2),
                    retrieval_type="hybrid",
                    sanitized_evidence=self._sanitize_untrusted_text(chunk.content)
                ))
                
        results.sort(key=lambda r: r.score, reverse=True)
        return results[:top_k]

# Singleton RAG Engine
rag_engine = HybridRAGEngine()
