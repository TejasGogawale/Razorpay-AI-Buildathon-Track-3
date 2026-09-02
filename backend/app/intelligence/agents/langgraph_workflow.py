import json
import uuid
from typing import Dict, Any, List, Optional, TypedDict
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END

from ..rag.vector_store import rag_pipeline
from ..models.llm_provider import LLMProviderFactory
from ...domain.recovery.models import ActionEnum
from ...domain.payments.error_taxonomy import ErrorTaxonomyResolver
from ...domain.payments.models import RazorpayRawError
from ...policy.guard import PolicyGuard
from ...domain.policies.models import PolicyVersion
from ...domain.recovery.models import RecoveryCase, CaseState
from ...core.config import settings

# ----------------- LangGraph Workflow State -----------------
class AgentExecutionState(TypedDict):
    case_id: str
    amount_inr: float
    payment_method: str
    issuer: str
    error_code: str
    error_reason: str
    intent_score: float
    customer_opted_out: bool
    rail_degraded: bool
    attempts_count: int
    contact_count_24h: int
    retrieved_evidence: List[Dict[str, str]]
    diagnosis: Dict[str, Any]
    strategy_proposal: Dict[str, Any]
    critic_verdict: str # "APPROVED" | "REJECTED_POLICY_VIOLATION" | "ESCALATE_HUMAN"
    critic_feedback: List[str]
    iteration: int
    max_iterations: int
    final_decision: Dict[str, Any]
    customer_copy: Dict[str, str]
    agent_logs: List[Dict[str, Any]]

# ----------------- Agent Nodes -----------------

def diagnostician_node(state: AgentExecutionState) -> Dict[str, Any]:
    """Diagnostician Agent: Queries semantic RAG store and extracts root cause taxonomy."""
    query = f"{state['error_code']} {state['error_reason']} {state['payment_method']} {state['issuer']}"
    matched_docs = rag_pipeline.similarity_search(query, top_k=2)
    
    evidence_list = [
        {"title": doc.metadata.get("title", ""), "category": doc.metadata.get("category", ""), "content": doc.page_content}
        for doc in matched_docs
    ]
    
    raw_error = RazorpayRawError(
        code=state["error_code"],
        reason=state["error_code"],
        description=state["error_reason"]
    )
    normalized = ErrorTaxonomyResolver.normalize_error(raw_error)
    
    diagnosis = {
        "root_cause": normalized.description,
        "owner": str(normalized.owner),
        "stage": str(normalized.stage),
        "recoverable": normalized.recoverable,
        "retry_semantics": str(normalized.retry_semantics),
        "alternate_method_allowed": normalized.alternate_method_allowed
    }
    
    log_entry = {
        "agent": "DiagnosticianAgent",
        "turn": state.get("iteration", 0),
        "message": f"Identified root cause: {normalized.description} ({normalized.owner}). Recoverable: {normalized.recoverable}.",
        "citations": [e["title"] for e in evidence_list]
    }
    
    return {
        "retrieved_evidence": evidence_list,
        "diagnosis": diagnosis,
        "agent_logs": state.get("agent_logs", []) + [log_entry]
    }

def strategist_node(state: AgentExecutionState) -> Dict[str, Any]:
    """Strategist Agent: Evaluates options and formulates recovery proposal, incorporating Critic feedback if on loop iteration."""
    iteration = state.get("iteration", 0) + 1
    diag = state.get("diagnosis", {})
    amount = state.get("amount_inr", 4999.0)
    intent = state.get("intent_score", 85.0)
    rail_degraded = state.get("rail_degraded", False)
    critic_feedback = state.get("critic_feedback", [])
    
    # Check if this is a revision loop based on previous critic feedback
    if "SUPPRESS_SAME_RAIL_RETRY" in critic_feedback or rail_degraded or diag.get("retry_semantics") == "DIFFERENT_METHOD_REQUIRED":
        proposed_action = "STANDARD_PAYMENT_LINK"
        erv = round(amount * 0.78 * (intent / 100.0) - 2.0, 2)
        hypothesis = "Rail degradation or invalid instrument flagged; proposing fresh multi-rail Standard Payment Link to avoid repeated failure."
    elif diag.get("retry_semantics") == "DO_NOT_RETRY" or not diag.get("recoverable"):
        proposed_action = "STOP"
        erv = 0.0
        hypothesis = "Failure is non-recoverable or risk-blocked. Halting automated retries to protect merchant standing."
    elif amount >= 25000.0 or state.get("attempts_count", 1) >= 3:
        proposed_action = "ESCALATE_HUMAN"
        erv = round(amount * 0.85 * (intent / 100.0) - 50.0, 2)
        hypothesis = "Transaction amount or failure retry budget exceeded threshold; routing for human verification."
    else:
        proposed_action = "STANDARD_PAYMENT_LINK" if rail_degraded else "CUSTOMER_RETRY"
        erv = round(amount * 0.70 * (intent / 100.0) - 1.5, 2)
        hypothesis = "Customer intent is high; instrument and rails are healthy for prompt re-attempt."

    proposal = {
        "action": proposed_action,
        "expected_recovery_value": erv,
        "hypothesis": hypothesis,
        "proposed_discount": 0.0
    }
    
    log_entry = {
        "agent": "StrategistAgent",
        "turn": iteration,
        "message": f"Iteration {iteration}: Proposing action '{proposed_action}' (ERV: ₹{erv}). {hypothesis}",
        "feedback_addressed": critic_feedback if iteration > 1 else None
    }
    
    return {
        "strategy_proposal": proposal,
        "iteration": iteration,
        "agent_logs": state.get("agent_logs", []) + [log_entry]
    }

def policy_critic_node(state: AgentExecutionState) -> Dict[str, Any]:
    """Compliance Policy Critic: Strictly evaluates proposed strategy against deterministic policy constraints."""
    proposal = state.get("strategy_proposal", {})
    action = proposal.get("action", "STOP")
    amount = state.get("amount_inr", 4999.0)
    customer_opted_out = state.get("customer_opted_out", False)
    rail_degraded = state.get("rail_degraded", False)
    contact_count = state.get("contact_count_24h", 0)
    attempts_count = state.get("attempts_count", 1)
    
    feedback = []
    verdict = "APPROVED"
    
    # Rule 1: Customer Opt-Out Shield
    if customer_opted_out and action != "STOP":
        verdict = "REJECTED_POLICY_VIOLATION"
        feedback.append("CUSTOMER_OPTED_OUT_MUST_STOP")
        
    # Rule 2: Same Rail Degraded Retry Suppression
    if rail_degraded and action == "CUSTOMER_RETRY":
        verdict = "REJECTED_POLICY_VIOLATION"
        feedback.append("SUPPRESS_SAME_RAIL_RETRY")
        
    # Rule 3: Contact Fatigue Limit (max 2 / 24h)
    if contact_count >= 2 and action in ["STANDARD_PAYMENT_LINK", "REMINDER", "CUSTOMER_RETRY"]:
        verdict = "REJECTED_POLICY_VIOLATION"
        feedback.append("CONTACT_FATIGUE_BUDGET_EXCEEDED")
        
    # Rule 4: High Value / Risk Escalation
    if (amount >= 25000.0 or attempts_count >= 3) and action != "ESCALATE_HUMAN" and action != "STOP":
        verdict = "ESCALATE_HUMAN"
        feedback.append("HIGH_VALUE_OR_ATTEMPTS_REQUIRE_HUMAN_SIGN_OFF")

    log_entry = {
        "agent": "CompliancePolicyCriticAgent",
        "turn": state.get("iteration", 1),
        "verdict": verdict,
        "message": f"Policy check completed. Verdict: {verdict}. " + (f"Feedback: {', '.join(feedback)}" if feedback else "All constraints satisfied.")
    }

    return {
        "critic_verdict": verdict,
        "critic_feedback": feedback,
        "agent_logs": state.get("agent_logs", []) + [log_entry]
    }

def supervisor_evaluator_node(state: AgentExecutionState) -> Dict[str, Any]:
    """Supervisor Evaluator Agent: Coordinates consensus between Strategist and Critic."""
    verdict = state.get("critic_verdict", "APPROVED")
    iteration = state.get("iteration", 1)
    max_iter = state.get("max_iterations", 3)
    proposal = state.get("strategy_proposal", {})
    
    if verdict == "APPROVED":
        final_action = proposal.get("action", "STANDARD_PAYMENT_LINK")
        status_desc = "Consensus achieved: Strategist proposal approved by Policy Critic."
    elif verdict == "ESCALATE_HUMAN":
        final_action = "ESCALATE_HUMAN"
        status_desc = "Transaction flagged for human operator supervisor approval."
    elif iteration >= max_iter:
        final_action = "STOP"
        status_desc = f"Max review loop iterations ({max_iter}) reached without safe consensus. Halting action."
    else:
        final_action = proposal.get("action", "STANDARD_PAYMENT_LINK")
        status_desc = f"Policy Critic rejected proposal. Requesting revision from Strategist (Iteration {iteration}/{max_iter})."

    final_decision = {
        "final_action": final_action,
        "expected_recovery_value": proposal.get("expected_recovery_value", 0.0),
        "rationale": proposal.get("hypothesis", ""),
        "supervisor_verdict": verdict,
        "iterations_count": iteration
    }

    log_entry = {
        "agent": "SupervisorEvaluatorAgent",
        "turn": iteration,
        "message": f"Supervisor review: {status_desc} Selected action: '{final_action}'."
    }

    return {
        "final_decision": final_decision,
        "agent_logs": state.get("agent_logs", []) + [log_entry]
    }

def communicator_node(state: AgentExecutionState) -> Dict[str, Any]:
    """Communicator Agent: Generates customer-facing conversational copy in English & Hinglish."""
    final_action = state.get("final_decision", {}).get("final_action", "STANDARD_PAYMENT_LINK")
    amount = state.get("amount_inr", 4999.0)
    formatted_amount = f"₹{amount:,.2f}"
    
    if final_action == "STANDARD_PAYMENT_LINK":
        en = f"Hi! We noticed your recent payment of {formatted_amount} couldn't be completed. You can safely complete your order using this secure link: [Payment Link]"
        hi = f"Namaste! Aapka {formatted_amount} ka payment complete nahi ho paya tha. Aap bina kisi issue ke is link se payment poora kar sakte hain: [Payment Link]"
    elif final_action == "CUSTOMER_RETRY":
        en = f"Hi! Your payment of {formatted_amount} was interrupted. Please retry in your app or browser to confirm your purchase."
        hi = f"Namaste! Aapka {formatted_amount} ka payment interrupt ho gaya tha. Kripya retry karke apna order confirm karein."
    elif final_action == "REMINDER":
        en = f"Hi! Your saved items ({formatted_amount}) are waiting in your cart. Complete your purchase to secure your items."
        hi = f"Namaste! Aapka order ({formatted_amount}) cart mein save hai. Jaldi hi complete karein aur apna saman secure karein."
    else:
        en = ""
        hi = ""
        
    copy_payload = {"english": en, "hinglish": hi}
    
    log_entry = {
        "agent": "CommunicatorAgent",
        "turn": state.get("iteration", 1),
        "message": f"Crafted personalized English & Hinglish communication for action '{final_action}'."
    }
    
    return {
        "customer_copy": copy_payload,
        "agent_logs": state.get("agent_logs", []) + [log_entry]
    }

# ----------------- Router Condition -----------------
def supervisor_router(state: AgentExecutionState) -> str:
    verdict = state.get("critic_verdict", "APPROVED")
    iteration = state.get("iteration", 1)
    max_iter = state.get("max_iterations", 3)
    
    if verdict == "REJECTED_POLICY_VIOLATION" and iteration < max_iter:
        return "reiterate_to_strategist"
    return "proceed_to_communicator"

# ----------------- Build LangGraph StateGraph -----------------
def build_langgraph_orchestrator():
    builder = StateGraph(AgentExecutionState)
    
    builder.add_node("diagnostician", diagnostician_node)
    builder.add_node("strategist", strategist_node)
    builder.add_node("policy_critic", policy_critic_node)
    builder.add_node("supervisor", supervisor_evaluator_node)
    builder.add_node("communicator", communicator_node)
    
    builder.set_entry_point("diagnostician")
    builder.add_edge("diagnostician", "strategist")
    builder.add_edge("strategist", "policy_critic")
    builder.add_edge("policy_critic", "supervisor")
    
    builder.add_conditional_edges(
        "supervisor",
        supervisor_router,
        {
            "reiterate_to_strategist": "strategist",
            "proceed_to_communicator": "communicator"
        }
    )
    
    builder.add_edge("communicator", END)
    return builder.compile()

# Global compiled LangGraph workflow
recovery_langgraph_app = build_langgraph_orchestrator()
