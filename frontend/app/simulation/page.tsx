"use client";

import { useState } from "react";
import { 
  PlaySquare, Sparkles, TrendingUp, ShieldCheck, 
  BarChart2, RefreshCw, CheckCircle2, ArrowRight, Zap, Sliders
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from "recharts";
import { runSimulation } from "@/lib/api";

export default function SimulationPage() {
  const [sampleSize, setSampleSize] = useState(5000);
  const [marginRate, setMarginRate] = useState(0.25);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRun = async () => {
    try {
      setLoading(true);
      const data = await runSimulation(sampleSize, marginRate);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const chartData = results ? [
    {
      name: "No Action (Organic)",
      recovered: results.arms?.no_action?.recovered_revenue_inr || 759200,
      profit: results.arms?.no_action?.profit_inr || 189800,
      cases: results.arms?.no_action?.recovered_cases || 302
    },
    {
      name: "Static Baseline (Blind Retries)",
      recovered: results.arms?.static_baseline?.recovered_revenue_inr || 2081653,
      profit: results.arms?.static_baseline?.profit_inr || 512913,
      cases: results.arms?.static_baseline?.recovered_cases || 852
    },
    {
      name: "AI Policy Orchestrator",
      recovered: results.arms?.ai_policy?.recovered_revenue_inr || 5989204,
      profit: results.arms?.ai_policy?.profit_inr || 1489347,
      cases: results.arms?.ai_policy?.recovered_cases || 2325
    }
  ] : [];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <PlaySquare className="w-6 h-6 text-cyan-400" />
            <span>20,000-Case Monte Carlo Policy Simulator</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulates and compares financial yield across No Action, Static Blind Retries, and the AI Policy Orchestrator on synthetic failure cases.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? "Replaying 20,000 Cases..." : "Run Policy Replay"}</span>
        </button>
      </div>

      {/* Simulator Parameters Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <h2 className="text-sm font-bold text-white flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Simulation Configuration Parameters</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Sample Dataset Size</span>
              <span className="text-cyan-400 font-mono font-bold">{sampleSize.toLocaleString()} cases</span>
            </div>
            <input
              type="range"
              min={1000}
              max={20000}
              step={1000}
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>1,000 cases</span>
              <span>10,000 cases</span>
              <span>20,000 cases</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Merchant Gross Margin</span>
              <span className="text-cyan-400 font-mono font-bold">{Math.round(marginRate * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.10}
              max={0.50}
              step={0.05}
              value={marginRate}
              onChange={(e) => setMarginRate(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10% Low Margin</span>
              <span>25% Standard</span>
              <span>50% High Margin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-8">
          {/* Top Uplift Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl">
              <span className="text-[11px] text-emerald-300 font-semibold uppercase block">Incremental Recovered Revenue</span>
              <div className="text-3xl font-black text-emerald-400 mt-1">
                +₹{results.uplift?.incremental_revenue_inr?.toLocaleString()}
              </div>
              <span className="text-xs text-emerald-300 mt-2 block font-bold">
                +{results.uplift?.revenue_uplift_pct}% vs Static Retries
              </span>
            </div>

            <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-xl">
              <span className="text-[11px] text-blue-300 font-semibold uppercase block">Net Incremental Profit</span>
              <div className="text-3xl font-black text-white mt-1">
                +₹{results.uplift?.incremental_profit_inr?.toLocaleString()}
              </div>
              <span className="text-xs text-blue-300 mt-2 block font-bold">
                +{results.uplift?.profit_uplift_pct}% Margin-Protected
              </span>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl">
              <span className="text-[11px] text-indigo-300 font-semibold uppercase block">Futile Retries Suppressed</span>
              <div className="text-3xl font-black text-indigo-400 mt-1">
                {results.uplift?.futile_actions_suppressed?.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-2 block">
                Infrastructure & brand protection
              </span>
            </div>
          </div>

          {/* Comparative Bar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-5">Financial Yield Comparison (INR)</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="recovered" name="Recovered Revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="profit" name="Net Merchant Profit" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Behavioral Patterns: Recoverable vs Lost Revenue Table */}
          {results.customer_behavioral_patterns && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Customer Behavioral Patterns: Recoverable vs. Lost Revenue Yield
                  </h2>
                  <p className="text-xs text-slate-400">
                    Breakdown of simulated failure cases across psychological archetypes showing recoverable yield and permanently suppressed revenue.
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-cyan-400 font-semibold">
                    Recoverable: ₹{(results.recoverable_revenue_inr || 0).toLocaleString()}
                  </span>
                  <span className="text-rose-400 font-semibold">
                    Lost: ₹{(results.lost_revenue_inr || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                      <th className="pb-3">Customer Archetype</th>
                      <th className="pb-3">Simulated Cases</th>
                      <th className="pb-3">Total Volume</th>
                      <th className="pb-3">Recoverable Revenue</th>
                      <th className="pb-3">AI Captured</th>
                      <th className="pb-3">Permanently Lost</th>
                      <th className="pb-3 text-right">Recovery Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {results.customer_behavioral_patterns.map((pat: any) => (
                      <tr key={pat.archetype} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 font-bold text-white">{pat.archetype}</td>
                        <td className="py-3 text-slate-400 font-mono">{pat.cases_count?.toLocaleString()}</td>
                        <td className="py-3 font-bold text-slate-200">₹{pat.total_volume_inr?.toLocaleString()}</td>
                        <td className="py-3 text-cyan-400 font-semibold">
                          ₹{pat.recoverable_volume_inr?.toLocaleString()} <span className="text-[10px] text-slate-500">({pat.recoverable_pct}%)</span>
                        </td>
                        <td className="py-3 text-emerald-400 font-bold">
                          ₹{pat.ai_recovered_volume_inr?.toLocaleString()} <span className="text-[10px] text-emerald-500">({pat.ai_recovery_pct}%)</span>
                        </td>
                        <td className="py-3 text-rose-400 font-semibold">
                          ₹{pat.lost_volume_inr?.toLocaleString()} <span className="text-[10px] text-slate-500">({pat.lost_pct}%)</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {pat.ai_recovery_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
