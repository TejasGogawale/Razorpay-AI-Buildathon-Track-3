"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Play, CheckCircle2, ShieldAlert, ArrowUpRight, RefreshCw, Layers, Zap } from "lucide-react";
import { fetchDemoScenarios, triggerDemoScenario, simulateCustomerPayment } from "@/lib/api";

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchDemoScenarios()
      .then((data) => setScenarios(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTrigger = async (scenarioId: string) => {
    try {
      setTriggeringId(scenarioId);
      setStatusMsg(`Triggering scenario: ${scenarioId}...`);
      const res = await triggerDemoScenario(scenarioId);
      setLastResult(res);
      setStatusMsg(`Scenario evaluated successfully. Case ${res.case_id || "N/A"} processed.`);
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    } finally {
      setTriggeringId(null);
    }
  };

  const handleSimulatePayment = async (caseId: string) => {
    try {
      setStatusMsg(`Simulating payment capture for ${caseId}...`);
      await simulateCustomerPayment(caseId);
      setStatusMsg(`Payment captured and attributed for case ${caseId}!`);
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-14">
      {/* Header */}
      <div className="border border-slate-800/90 bg-[#090d16] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Deterministic Policy Sandbox
              </span>
              <span className="text-slate-400 text-[11px] font-mono">10 Mandatory PRD Cases</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
              Interactive Demo & Failure Injection Console
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 max-w-[65ch] leading-relaxed">
              Execute all 10 mandatory hackathon scenarios with real test-mode boundaries and observable state transitions.
            </p>
          </div>
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

      {/* Live Result Visualizer Card */}
      {lastResult && (
        <div className="bg-[#090d16] border border-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 animate-scaleUp">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Scenario Execution Result</span>
            </span>
            <div className="flex items-center gap-2">
              {lastResult.case_id && (
                <>
                  <button
                    onClick={() => handleSimulatePayment(lastResult.case_id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition active:scale-[0.98]"
                  >
                    Simulate Payment Capture
                  </button>
                  <Link
                    href={`/cases/${lastResult.case_id}`}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center space-x-1 transition active:scale-[0.98]"
                  >
                    <span>Inspect Case Detail</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Case & Amount</span>
              <span className="text-white font-mono font-bold">{lastResult.case_id || "N/A"}</span>
              <span className="text-cyan-400 font-bold font-mono tabular-nums block mt-1">₹{lastResult.amount_inr || 0}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Next-Best Action</span>
              <span className="text-slate-200 font-mono font-semibold text-[11px] block truncate">{lastResult.recommended_action || "EVALUATED"}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Policy Verdict</span>
              <span className={`font-bold uppercase font-mono text-[11px] block ${
                lastResult.policy_verdict === "allowed" ? "text-emerald-400" : "text-rose-400"
              }`}>
                {lastResult.policy_verdict || "PROCESSED"}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Execution Proof</span>
              <span className="text-slate-400 font-mono text-[10px] truncate block">
                {lastResult.intervention?.idempotency_key || lastResult.message || "Action Executed"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 10 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((sc) => (
          <div key={sc.id} className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 space-y-3.5 hover:border-slate-700 transition">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-tight">{sc.title}</h3>
                <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-cyan-400 font-mono mt-1 inline-block border border-slate-850">
                  ₹{sc.amount_inr} · {sc.method?.toUpperCase()} · {sc.issuer?.toUpperCase()}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                sc.expected_policy_verdict === "allowed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                sc.expected_policy_verdict === "blocked" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {sc.expected_action}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-850">
              {sc.description}
            </p>

            <div className="pt-1 flex items-center justify-between">
              <div className="text-[10px] text-slate-500 font-mono">
                Event: <span className="text-slate-300">{sc.event_type}</span>
              </div>

              <button
                onClick={() => handleTrigger(sc.id)}
                disabled={triggeringId === sc.id}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition active:scale-[0.98] disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{triggeringId === sc.id ? "Running..." : "Trigger Scenario"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
