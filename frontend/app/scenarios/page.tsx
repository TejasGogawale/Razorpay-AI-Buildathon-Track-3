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
      setStatusMsg(`Triggering ${scenarioId}...`);
      const res = await triggerDemoScenario(scenarioId);
      setLastResult(res);
      setStatusMsg(`Scenario executed successfully! Case ID: ${res.case_id || "N/A"}`);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <span>Interactive Demo & Failure Injection Console</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Execute all 10 mandatory hackathon scenarios with real test-mode boundaries and observable state transitions (PRD Section 33 & 37).
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-blue-950/60 border border-blue-500/30 rounded-xl p-4 text-xs text-blue-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Live Result Visualizer Card */}
      {lastResult && (
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-sm text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Live Scenario Execution Result</span>
            </span>
            <div className="flex items-center gap-2">
              {lastResult.case_id && (
                <>
                  <button
                    onClick={() => handleSimulatePayment(lastResult.case_id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                  >
                    Simulate Payment Capture
                  </button>
                  <Link
                    href={`/cases/${lastResult.case_id}`}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1 transition"
                  >
                    <span>Inspect Case Detail</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Case & Amount</span>
              <span className="text-white font-mono font-bold">{lastResult.case_id || "N/A"}</span>
              <span className="text-emerald-400 font-bold block mt-1">₹{lastResult.amount_inr || 0}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Next-Best Action</span>
              <span className="text-blue-400 font-mono font-bold">{lastResult.recommended_action || "EVALUATED"}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Policy Verdict</span>
              <span className={`font-bold uppercase ${
                lastResult.policy_verdict === "allowed" ? "text-emerald-400" : "text-rose-400"
              }`}>
                {lastResult.policy_verdict || "PROCESSED"}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Side Effect Link</span>
              <span className="text-slate-300 font-mono text-[10px] truncate block">
                {lastResult.intervention?.payment_link_url || lastResult.message || "Executed"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 10 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((sc) => (
          <div key={sc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{sc.title}</h3>
                <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-blue-400 font-mono mt-1 inline-block">
                  ₹{sc.amount_inr} · {sc.method?.toUpperCase()} · {sc.issuer?.toUpperCase()}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                sc.expected_policy_verdict === "allowed" ? "bg-emerald-500/10 text-emerald-400" :
                sc.expected_policy_verdict === "blocked" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
              }`}>
                {sc.expected_action}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {sc.description}
            </p>

            <div className="pt-2 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 font-mono">
                Event: <span className="text-slate-300">{sc.event_type}</span>
              </div>

              <button
                onClick={() => handleTrigger(sc.id)}
                disabled={triggeringId === sc.id}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                <span>{triggeringId === sc.id ? "Running..." : "Trigger Scenario"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
