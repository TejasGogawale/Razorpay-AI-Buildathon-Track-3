"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Filter, RefreshCw, ArrowUpRight, ShieldCheck, AlertCircle, Layers, Zap } from "lucide-react";
import { fetchCases } from "@/lib/api";

function RecoveryQueueContent() {
  const searchParams = useSearchParams();
  const initialState = searchParams.get("state") || "";

  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedState, setSelectedState] = useState(initialState);
  const [quickFilter, setQuickFilter] = useState("all");

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await fetchCases({
        domain: selectedDomain || undefined,
        state: selectedState || undefined,
        search: search || undefined,
        limit: 100
      });
      setCases(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [selectedDomain, selectedState]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCases();
  };

  // Quick filter logic
  const filteredCases = cases.filter((c) => {
    if (quickFilter === "high_value") return c.amount_inr >= 25000;
    if (quickFilter === "high_intent") return c.intent_score >= 75;
    if (quickFilter === "degraded") return c.latest_failure_code === "ISSUER_OR_GATEWAY_DEGRADED" || c.latest_failure_code === "BANK_DOWNTIME";
    if (quickFilter === "recovered") return c.state === "RECOVERED";
    if (quickFilter === "stopped") return c.state === "STOPPED";
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-14">
      {/* Header */}
      <div className="border border-slate-800/90 bg-[#090d16] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Live Recovery Worklist
              </span>
              <span className="text-slate-400 text-[11px] font-mono">ERV-Ranked Triage</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
              Recovery Queue & Case Triage
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 max-w-[65ch] leading-relaxed">
              Real-time triage of at-risk transactions, normalized decline taxonomy, and LangGraph-evaluated actions.
            </p>
          </div>

          <button
            onClick={loadCases}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold border border-slate-800 transition active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: "all", label: "All Cases" },
          { id: "high_value", label: "High Value (≥ ₹25k)" },
          { id: "high_intent", label: "High Intent (> 75)" },
          { id: "degraded", label: "Degraded Rails" },
          { id: "recovered", label: "Recovered" },
          { id: "stopped", label: "Opted-Out / Stopped" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setQuickFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition border active:scale-[0.98] ${
              quickFilter === f.id
                ? "bg-slate-900 text-cyan-300 border-cyan-500/60 shadow-sm ring-1 ring-cyan-500/20"
                : "bg-slate-950/80 text-slate-400 border-slate-850 hover:text-white hover:border-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row gap-3 justify-between items-center shadow-md">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Case ID, Order, Bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="">All Domains</option>
            <option value="PAYMENT_FAILURE">Payment Failures</option>
            <option value="CHECKOUT_ABANDONMENT">Checkout Abandonments</option>
            <option value="SUBSCRIPTION_FAILURE">Subscription Mandates</option>
            <option value="B2B_RECEIVABLE">B2B Invoices</option>
          </select>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="">All States</option>
            <option value="READY_FOR_ACTION">Ready for Action</option>
            <option value="ACTION_EXECUTED">Action Executed</option>
            <option value="RECOVERED">Recovered</option>
            <option value="ESCALATED">Escalated (Human)</option>
            <option value="STOPPED">Stopped (Opt-Out)</option>
            <option value="WAITING">Waiting / Hold</option>
          </select>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-24 text-center text-slate-500 text-xs font-mono">Loading recovery queue...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-24 text-center text-slate-500 text-xs">
            No matching recovery cases found for active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase font-mono font-medium text-[10px]">
                <tr>
                  <th className="py-3 px-4">Case / Order</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Bank / Rail</th>
                  <th className="py-3 px-4">Decline Reason</th>
                  <th className="py-3 px-4">Intent</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div className="font-bold text-white font-mono text-xs">{c.id}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.order_id || "Direct Pay"}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-850 text-[10px] font-mono">
                        {c.domain}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white text-xs font-mono tabular-nums">
                      ₹{c.amount_inr?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white uppercase text-[11px] block">{c.issuer || "UPI"}</span>
                      <span className="text-slate-500 uppercase text-[10px] font-mono">{c.payment_method}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-mono text-cyan-400 text-[11px] font-bold truncate">{c.latest_failure_code || "DECLINE"}</div>
                      <div className="text-slate-400 text-[10px] truncate">{c.latest_failure_reason}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        c.intent_score > 75 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {c.intent_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        c.state === "RECOVERED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        c.state === "STOPPED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        c.state === "ESCALATED" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        c.state === "ACTION_EXECUTED" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                        "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {c.state}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-cyan-400 font-medium inline-flex items-center space-x-1 transition border border-slate-800 text-[11px] active:scale-[0.98]"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecoveryQueuePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-500 text-xs font-mono">Loading queue...</div>}>
      <RecoveryQueueContent />
    </Suspense>
  );
}
