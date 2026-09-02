import re
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document

class SemanticRAGPipeline:
    """
    Production-grade LangChain Semantic RAG Pipeline.
    Stores and indexes domain knowledge for NPCI UPI errors, card network decline codes,
    banking rail recovery playbooks, and merchant governance rules with active injection shields.
    """
    
    def __init__(self):
        self.documents: List[Document] = []
        self._initialize_knowledge_base()

    def _sanitize_text(self, text: str) -> str:
        """Strips executable instructions / prompt injections from retrieved content."""
        patterns = [
            r"ignore previous instructions",
            r"system prompt override",
            r"grant full discount",
            r"bypass policy",
            r"authorize payment without check",
            r"<script>",
            r"DROP TABLE"
        ]
        sanitized = text
        for pat in patterns:
            sanitized = re.sub(pat, "[FILTERED_INSTRUCTION]", sanitized, flags=re.IGNORECASE)
        return sanitized

    def _initialize_knowledge_base(self):
        raw_docs = [
            # Technical Error Catalogs
            {
                "title": "NPCI UPI Error Code Playbook (U30, U69, ZM, ZA)",
                "category": "technical_errors",
                "tags": ["upi", "npci", "timeout", "degraded", "alternate_method"],
                "content": (
                    "NPCI UPI decline codes U30 (Debit timeout at remitter bank) and U69 (Beneficiary bank unavailable) "
                    "indicate transient core-banking synchronization failure. Retrying on the same VPA immediately fails in >85% of cases. "
                    "The recommended recovery action is presenting a Standard Payment Link enabling the user to switch to alternative rails "
                    "(e.g., Credit Card or Netbanking) or a different UPI handle."
                )
            },
            {
                "title": "Card Network Decline Semantics (51, 54, 05, 91)",
                "category": "technical_errors",
                "tags": ["card", "expired", "insufficient_funds", "declined"],
                "content": (
                    "ISO 8583 Response Code 54 (Expired Card) and Code 05 (Do Not Honor / Fraud Block) are deterministic hard declines. "
                    "Any automated same-card retry will produce an immediate failure and degrade merchant authorization scoring. "
                    "Response Code 51 (Insufficient Funds) requires customer action; the system should queue a liquidity-aware reminder or alternate method."
                )
            },
            {
                "title": "Issuer Downtime & Core Banking Maintenance Playbook",
                "category": "rail_health",
                "tags": ["downtime", "hdfc", "sbi", "icici", "rerouting"],
                "content": (
                    "During bank issuer downtime spikes (success rate < 40% with >= 30 transactions), same-instrument retries are strictly "
                    "suppressed by the payment rail health monitor. The orchestrator must generate a multi-rail Standard Payment Link "
                    "or recommend an unaffected issuer instrument."
                )
            },
            {
                "title": "Merchant Contact Fatigue & Opt-Out Governance",
                "category": "merchant_policy",
                "tags": ["contact_fatigue", "quiet_hours", "opt_out", "stop"],
                "content": (
                    "Merchant policy limits automated customer communications to at most 2 messages per 24-hour window. "
                    "No promotional or recovery messages are permitted between 22:00 and 08:00 local time. "
                    "If the customer sends STOP or UNSUBSCRIBE, all automated recovery actions are unconditionally halted."
                )
            },
            {
                "title": "Duplicate Debit & State Ambiguity Protection Policy",
                "category": "merchant_policy",
                "tags": ["duplicate_protection", "pending", "reconciliation", "unknown"],
                "content": (
                    "If a payment state is pending or unknown (e.g., customer reports debit but no webhook received), "
                    "the system must NEVER initiate a new charge-producing recovery action. The case is placed in a Reconciliation Hold "
                    "until authoritative state is confirmed via the Gateway Orders API."
                )
            },
            {
                "title": "Dynamic Incentive & Profit-Aware Discount Rules",
                "category": "incentives",
                "tags": ["discount", "margin_protection", "abandonment"],
                "content": (
                    "Dynamic discounts (capped at 10% or ₹500) may ONLY be offered for high-intent checkout abandonments where "
                    "the expected incremental recovery profit exceeds the coupon cost. Discounts are strictly prohibited for technical failures."
                )
            },
            {
                "title": "High-Value Transaction Human Escalation Threshold",
                "category": "compliance",
                "tags": ["escalation", "high_value", "risk", "supervisor"],
                "content": (
                    "Transactions equal to or exceeding ₹25,000 INR, suspected fraud blocks, or cases with 3+ consecutive failures "
                    "cannot execute autonomously. They must be routed to the Human Review Queue with a multi-agent Diagnostic Brief."
                )
            }
        ]

        for doc_meta in raw_docs:
            doc = Document(
                page_content=self._sanitize_text(doc_meta["content"]),
                metadata={
                    "title": doc_meta["title"],
                    "category": doc_meta["category"],
                    "tags": doc_meta["tags"]
                }
            )
            self.documents.append(doc)

    def similarity_search(self, query: str, top_k: int = 3) -> List[Document]:
        """
        Performs semantic & token-relevance search over indexed knowledge documents.
        """
        query_clean = self._sanitize_text(query).lower()
        tokens = set(re.findall(r"\w+", query_clean))

        scored_docs = []
        for doc in self.documents:
            text = f"{doc.metadata.get('title', '')} {doc.page_content} {' '.join(doc.metadata.get('tags', []))}".lower()
            doc_tokens = re.findall(r"\w+", text)
            
            # Score match based on token frequency and tag relevance
            match_count = sum(1 for t in tokens if t in doc_tokens)
            tag_matches = sum(2 for t in tokens if t in [tag.lower() for tag in doc.metadata.get("tags", [])])
            score = (match_count * 1.5) + (tag_matches * 2.0)
            
            if score > 0:
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored_docs[:top_k]]

    def get_all_documents(self) -> List[Document]:
        return self.documents

# Global semantic RAG pipeline singleton
rag_pipeline = SemanticRAGPipeline()
