"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, Sparkles, RefreshCw } from "lucide-react";
import { fetchReviewQueue, resolveReviewTask } from "@/lib/api";

export default function HumanReviewPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await fetchReviewQueue();
      setTasks(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleResolve = async (taskId: string, action: string, overrideAction?: string) => {
    try {
      setActionLoading(true);
      const taskNote = notes[taskId] || "Resolved by operator";
      await resolveReviewTask(taskId, action, overrideAction, taskNote);
      setStatusMsg(`Task ${taskId} resolved with action: ${action}`);
      await loadQueue();
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Human Review Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Escalated high-value transactions ($\ge ₹25,000$), ambiguous failure states, and retry budget limits requiring human sign-off.
          </p>
        </div>

        <button
          onClick={loadQueue}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {statusMsg && (
        <div className="bg-blue-950/60 border border-blue-500/30 rounded-xl p-3.5 text-xs text-blue-200 flex justify-between items-center">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white">Review Queue is Clear</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            All high-risk cases have been reviewed. Automated policy guards are operating within safe bounds.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => {
            const b = task.brief || {};
            return (
              <div key={task.id} className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-md space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      HIGH PRIORITY ESCALATION
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Task ID: {task.id}</span>
                  </div>
                  <span className="text-xl font-bold text-white">₹{b.amount_inr?.toLocaleString()}</span>
                </div>

                {/* Diagnostic Brief Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-slate-400 font-bold uppercase text-[11px]">Failure Diagnostic Details</div>
                    <div className="flex justify-between"><span className="text-slate-500">Case ID:</span><span className="text-white font-mono">{b.case_id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Customer ID:</span><span className="text-white font-mono">{b.customer_id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Failure Source / Step:</span><span className="text-slate-200">{b.failure_source} / {b.failure_step}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Root Cause:</span><span className="text-rose-400 font-medium">{b.failure_reason}</span></div>
                  </div>

                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-slate-400 font-bold uppercase text-[11px]">Why Automation Stopped</div>
                    <p className="text-amber-300 bg-amber-950/20 p-2.5 rounded border border-amber-500/20 text-[11px] leading-relaxed">
                      {b.why_automation_stopped || "Transaction value exceeded automated limit."}
                    </p>
                    <div className="flex justify-between pt-1"><span className="text-slate-500">Recommended Action:</span><span className="text-emerald-400 font-bold">{b.recommended_next_action}</span></div>
                  </div>
                </div>

                {/* Evidence Citations */}
                {b.evidence_citations && b.evidence_citations.length > 0 && (
                  <div className="text-xs">
                    <span className="text-slate-400 font-semibold block mb-1.5">Knowledge Grounding Citations:</span>
                    <div className="flex flex-wrap gap-2">
                      {b.evidence_citations.map((cite: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded bg-slate-950 text-blue-300 border border-slate-800 text-[11px]">
                          {cite}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Operator Actions Bar */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <input
                    type="text"
                    placeholder="Operator notes / resolution rationale..."
                    value={notes[task.id] || ""}
                    onChange={(e) => setNotes({ ...notes, [task.id]: e.target.value })}
                    className="w-full sm:w-80 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleResolve(task.id, "REJECT")}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
                    >
                      Reject / Stop
                    </button>
                    <button
                      onClick={() => handleResolve(task.id, "OVERRIDE", "STANDARD_PAYMENT_LINK")}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                    >
                      Override (Payment Link)
                    </button>
                    <button
                      onClick={() => handleResolve(task.id, "APPROVE")}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20"
                    >
                      Approve Recommendation
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
