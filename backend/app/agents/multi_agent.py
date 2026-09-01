from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from ..domain.recovery.models import ActionEnum, RecoveryCase
from ..domain.payments.models import NormalizedFailure, PaymentState
from ..domain.customers.models import CustomerContext
from ..intelligence.models.gateway import model_gateway
from ..intelligence.rag.engine import rag_engine

class AgentProposal(BaseModel):
    case_id: str
    proposed_action: ActionEnum
    reason_codes: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    customer_message: Optional[str] = None
    hinglish_message: Optional[str] = None
    diagnostic_summary: str = ""
    confidence: float = 0.95

class DiagnosticBrief(BaseModel):
    case_id: str
    customer_id: str
    amount_inr: float
    order_id: Optional[str] = None
    failure_source: str
    failure_step: str
    failure_reason: str
    payment_state: str
    rail_health_status: str
    intent_score: float
    recovery_opportunity: float
    actions_attempted_count: int
    why_automation_stopped: str
    recommended_next_action: ActionEnum
    evidence_citations: List[str] = Field(default_factory=list)

class MultiAgentLayer:
    """
    Multi-Agent Reasoning Layer based on PRD Section 20.
    Bounded agents operate as reasoning assistants with strict schema boundaries.
    PolicyGuard acts as the independent authority.
    """
    
    @staticmethod
    def run_diagnostician(failure: NormalizedFailure, raw_description: str) -> Dict[str, Any]:
        """Diagnostician: Interprets ambiguous text and matches evidence."""
        rag_results = rag_engine.search(f"{failure.reason_code} {failure.description} {raw_description}", top_k=2)
        evidence_ids = [r.chunk.id for r in rag_results]
        citations = [f"[{r.chunk.title}]: {r.chunk.content[:120]}..." for r in rag_results]
        
        return {
            "root_cause": failure.description,
            "owner": failure.owner,
            "evidence_ids": evidence_ids,
            "citations": citations,
            "recoverable": failure.recoverable
        }

    @staticmethod
    def run_communicator(action: ActionEnum, amount_inr: float, payment_link: Optional[str] = None) -> Dict[str, str]:
        """Communicator: Drafts empathetic, bounded recovery copy in English & Hinglish."""
        formatted_amount = f"₹{amount_inr:,.2f}"
        
        if action == ActionEnum.STANDARD_PAYMENT_LINK:
            en = f"Hi! We noticed your recent payment of {formatted_amount} couldn't be completed. You can safely finish your order using this secure link: {payment_link or '[Link]'}"
            hi = f"Namaste! Aapka {formatted_amount} ka payment complete nahi ho paya tha. Aap bina kisi issue ke is link se payment poora kar sakte hain: {payment_link or '[Link]'}"
        elif action == ActionEnum.CUSTOMER_RETRY:
            en = f"Hi! Your payment of {formatted_amount} was interrupted. Please retry in your app or browser to complete your purchase."
            hi = f"Namaste! Aapka {formatted_amount} ka payment interrupt ho gaya tha. Kripya retry karke apna order confirm karein."
        elif action == ActionEnum.REMINDER:
            en = f"Hi! Your items ({formatted_amount}) are saved in your cart. Complete your purchase now to secure your items."
            hi = f"Namaste! Aapka order ({formatted_amount}) cart mein save hai. Jaldi hi complete karein aur apna saman secure karein."
        elif action == ActionEnum.INCENTIVE:
            en = f"Exclusive offer! Complete your pending order of {formatted_amount} now and enjoy an instant ₹100 discount at checkout."
            hi = f"Khaas offer! Apna {formatted_amount} ka pending order abhi complete karein aur paayein ₹100 ki instant discount."
        else:
            en = ""
            hi = ""
            
        return {"english": en, "hinglish": hi}

    @staticmethod
    def generate_escalation_brief(
        case: RecoveryCase,
        failure: NormalizedFailure,
        rail_status: str,
        stopped_reason: str,
        recommended_action: ActionEnum
    ) -> DiagnosticBrief:
        """Escalation Brief Agent: Synthesizes high-fidelity briefing for human review queue."""
        rag_evidence = rag_engine.search(f"{failure.reason_code} human review policy", top_k=2)
        citations = [f"{r.chunk.title} ({r.chunk.category})" for r in rag_evidence]
        
        return DiagnosticBrief(
            case_id=case.id,
            customer_id=case.customer_id,
            amount_inr=case.amount_paise / 100.0,
            order_id=case.order_id,
            failure_source=str(failure.owner),
            failure_step=str(failure.stage),
            failure_reason=failure.description,
            payment_state=case.state.value,
            rail_health_status=rail_status,
            intent_score=case.intent_score,
            recovery_opportunity=case.recovery_opportunity_score,
            actions_attempted_count=case.attempts_count,
            why_automation_stopped=stopped_reason,
            recommended_next_action=recommended_action,
            evidence_citations=citations
        )
