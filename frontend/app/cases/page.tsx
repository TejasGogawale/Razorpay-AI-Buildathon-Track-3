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
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            <span>Recovery Queue Worklist</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time triage of at-risk transactions, normalized decline taxonomy, and LangGraph-evaluated actions.
          </p>
        </div>

        <button
          onClick={loadCases}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "all", label: "All Cases" },
          { id: "high_value", label: "High Value (≥ ₹25,000)" },
          { id: "high_intent", label: "High Intent (> 75/100)" },
          { id: "degraded", label: "Degraded Rails" },
          { id: "recovered", label: "Recovered" },
          { id: "stopped", label: "Opted-Out / Stopped" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setQuickFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition border ${
              quickFilter === f.id
                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 justify-between items-center shadow-lg">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Case ID, Order, Customer, Bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-24 text-center text-slate-500 text-xs">Loading recovery queue...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-24 text-center text-slate-500 text-xs">
            No matching recovery cases found for active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Case / Order</th>
                  <th className="py-3.5 px-4">Domain</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Bank / Rail</th>
                  <th className="py-3.5 px-4">Decline Reason</th>
                  <th className="py-3.5 px-4">Intent</th>
                  <th className="py-3.5 px-4">State</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="font-bold text-white font-mono text-xs">{c.id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{c.order_id || "Direct Pay"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono">
                        {c.domain}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-white text-xs">
                      ₹{c.amount_inr?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white uppercase text-[11px] block">{c.issuer || "UPI"}</span>
                      <span className="text-slate-500 uppercase text-[10px] font-mono">{c.payment_method}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-mono text-cyan-400 text-[11px] font-bold truncate">{c.latest_failure_code || "DECLINE"}</div>
                      <div className="text-slate-400 text-[11px] truncate">{c.latest_failure_reason}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.intent_score > 75 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {c.intent_score}/100
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.state === "RECOVERED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        c.state === "STOPPED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        c.state === "ESCALATED" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        c.state === "ACTION_EXECUTED" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                        "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {c.state}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold inline-flex items-center space-x-1 transition border border-cyan-500/20 text-xs"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
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
    <Suspense fallback={<div className="py-20 text-center text-slate-500 text-xs">Loading queue...</div>}>
      <RecoveryQueueContent />
    </Suspense>
  );
}
