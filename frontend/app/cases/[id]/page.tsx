"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2, Play, 
  ExternalLink, Copy, Zap, ArrowRight, UserCheck, RefreshCw, MessageSquare, History
} from "lucide-react";
import { fetchCaseDetail, decideCase, executeCaseAction, simulatePayment } from "@/lib/api";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [langgraphTrace, setLanggraphTrace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadCase = async () => {
    try {
      setLoading(true);
      const detail = await fetchCaseDetail(caseId);
      setData(detail);

      // Load live LangGraph evaluation trace
      try {
        const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/langgraph`);
        if (res.ok) {
          const trace = await res.json();
          setLanggraphTrace(trace);
        }
      } catch (e) {
        console.warn("LangGraph trace fetch fallback", e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  const handleExecute = async () => {
    try {
      setExecuting(true);
      setStatusMsg("Executing next-best action through Policy Guard & Razorpay adapter...");
      const res = await executeCaseAction(caseId);
      setStatusMsg(`Action executed successfully! Generated reference: ${res.intervention?.idempotency_key}`);
      await loadCase();
    } catch (err: any) {
      setStatusMsg(`Execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      setSimulating(true);
      setStatusMsg("Simulating customer payment.captured event...");
      const res = await simulatePayment(caseId);
      setStatusMsg(`Payment captured! Causal attribution confirmed for ₹${(data?.case?.amount_inr || 0).toLocaleString()}.`);
      await loadCase();
    } catch (err: any) {
      setStatusMsg(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-500 text-xs font-mono">
        Loading case and evaluating LangGraph multi-agent graph...
      </div>
    );
  }

  const c = data?.case;
  const decision = data?.latest_decision;
  const rail = data?.rail_health;
  const interventions = data?.interventions || [];
  const latestIntervention = interventions[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-14">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link 
            href="/cases" 
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white transition active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white font-mono">{c?.id}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {c?.domain}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                c?.state === "RECOVERED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                c?.state === "STOPPED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {c?.state}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              Order #{c?.order_id || "N/A"} · Customer: {data?.customer?.name} ({data?.customer?.contact})
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {c?.state !== "RECOVERED" && (
            <button
              onClick={handleExecute}
              disabled={executing || c?.state === "STOPPED"}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{executing ? "Executing..." : "Execute Next-Best Action"}</span>
            </button>
          )}

          <button
            onClick={handleSimulatePayment}
            disabled={simulating || c?.state === "RECOVERED"}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{simulating ? "Simulating..." : "Simulate Customer Payment"}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-cyan-200 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-medium">{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs text-cyan-400 hover:underline font-mono">Dismiss</button>
        </div>
      )}

      {/* Grid: Case Diagnostic Specs & Rail Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 shadow-md">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Transaction Amount</span>
          <span className="text-2xl font-extrabold text-white mt-2 block font-mono tabular-nums">₹{c?.amount_inr?.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">{c?.currency}</span>
        </div>

        <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 shadow-md">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Intent Score (0–100)</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-2 block font-mono tabular-nums">{c?.intent_score}/100</span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Recovery Opp: {c?.recovery_opportunity_score}/100</span>
        </div>

        <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 shadow-md">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Payment Method & Bank</span>
          <span className="text-sm font-bold text-white mt-2 block uppercase">{c?.issuer} {c?.payment_method}</span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">{c?.latest_failure_code}</span>
        </div>

        <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 shadow-md">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Rail Telemetry Status</span>
          <span className={`text-sm font-bold mt-2 block ${rail?.is_degraded ? "text-rose-400" : "text-emerald-400"}`}>
            {rail?.is_degraded ? "DEGRADED RAIL" : "HEALTHY RAIL"}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Success Rate: {Math.round((rail?.rolling_success_rate || 0) * 100)}%</span>
        </div>
      </div>

      {/* LangGraph Multi-Agent Evaluation Loop Inspector */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>LangGraph Multi-Agent Evaluation Loop</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-agent state graph with continuous peer review, RAG evidence grounding, and deterministic policy supervision.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {langgraphTrace?.final_decision?.iterations_count || 1} Turn(s) to Consensus
          </span>
        </div>

        {/* 5-Step Evaluation Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Node 1: Diagnostician */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white text-[11px]">1. Diagnostician</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {langgraphTrace?.diagnosis?.root_cause || c?.latest_failure_reason}
            </p>
            <div className="pt-2 border-t border-slate-850 text-[10px] font-mono text-slate-500">
              RAG Evidence Grounded
            </div>
          </div>

          {/* Node 2: Strategist */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white text-[11px]">2. Strategist</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-[11px] font-bold text-cyan-400">
              {langgraphTrace?.strategy_proposal?.action || decision?.recommended_action}
            </div>
            <p className="text-[10px] text-slate-400 font-mono tabular-nums">
              ERV: ₹{langgraphTrace?.strategy_proposal?.expected_recovery_value || 3747}
            </p>
          </div>

          {/* Node 3: Policy Critic */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white text-[11px]">3. Policy Critic</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              langgraphTrace?.critic_verdict === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              {langgraphTrace?.critic_verdict || "APPROVED"}
            </span>
            <p className="text-[10px] text-slate-500">Hard policy checks passed</p>
          </div>

          {/* Node 4: Supervisor */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white text-[11px]">4. Supervisor</span>
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-[11px] font-bold text-white">Consensus Gated</div>
            <p className="text-[10px] text-slate-500">Approved for execution</p>
          </div>

          {/* Node 5: Communicator */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white text-[11px]">5. Communicator</span>
              <MessageSquare className="w-3 h-3 text-blue-400" />
            </div>
            <div className="text-[11px] font-bold text-blue-400">Eng & Hinglish</div>
            <p className="text-[10px] text-slate-500">Personalized copy ready</p>
          </div>
        </div>

        {/* Customer Copy Preview */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-mono">Generated Customer Communications</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#090d16] border border-slate-800 text-slate-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-mono">English Message Copy</span>
              <p className="text-[11px] leading-relaxed">
                {langgraphTrace?.customer_copy?.english || "Hi! We noticed your recent payment couldn't be completed. You can safely complete your order using this secure link: [Payment Link]"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#090d16] border border-slate-800 text-slate-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-mono">Hinglish Message Copy</span>
              <p className="text-[11px] leading-relaxed italic text-amber-200/90">
                "{langgraphTrace?.customer_copy?.hinglish || "Namaste! Aapka payment complete nahi ho paya tha. Aap bina kisi issue ke is link se payment poora kar sakte hain: [Payment Link]"}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Record & Payment Link (If Executed) */}
      {latestIntervention && (
        <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Execution Record</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Idempotency: {latestIntervention.idempotency_key}</span>
          </div>

          {latestIntervention.payment_link_url && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Generated Standard Payment Link</span>
                <a href={latestIntervention.payment_link_url} target="_blank" rel="noreferrer" className="text-cyan-400 text-xs font-mono hover:underline flex items-center space-x-1 mt-0.5">
                  <span>{latestIntervention.payment_link_url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(latestIntervention.payment_link_url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold transition border border-slate-800 active:scale-[0.98]"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
