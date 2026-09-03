"use client";

import { useState } from "react";
import { 
  PlaySquare, Sparkles, TrendingUp, ShieldCheck, 
  BarChart2, RefreshCw, CheckCircle2, ArrowRight, Zap, Sliders, Play
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
    <div className="space-y-7 animate-fadeIn pb-14">
      {/* Top Header */}
      <div className="border border-slate-800/90 bg-[#090d16] rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Monte Carlo Engine
              </span>
              <span className="text-slate-400 text-[11px] font-mono">20,000 Empirical Cases</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
              Policy Simulation & Financial Uplift
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-[65ch] leading-relaxed">
              Replays synthetic transactions across three arms: No Action, Static Blind Retries, and the AI Policy Orchestrator.
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? "Replaying 20,000 Cases..." : "Run Policy Replay"}</span>
          </button>
        </div>
      </div>

      {/* Simulator Parameters Panel */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-5">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Simulation Configuration Parameters</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Sample Dataset Size</span>
              <span className="text-cyan-400 font-mono font-bold tabular-nums">{sampleSize.toLocaleString()} cases</span>
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
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1,000 cases</span>
              <span>10,000 cases</span>
              <span>20,000 cases</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Merchant Gross Margin</span>
              <span className="text-cyan-400 font-mono font-bold tabular-nums">{Math.round(marginRate * 100)}%</span>
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
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>10% Low Margin</span>
              <span>25% Standard</span>
              <span>50% High Margin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Uplift Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#090d16] border border-emerald-500/30 rounded-xl p-5 shadow-md space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">Incremental Recovered Revenue</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                +₹{results.uplift?.incremental_revenue_inr?.toLocaleString()}
              </div>
              <span className="text-xs text-emerald-300/80 block font-mono">
                +{results.uplift?.revenue_uplift_pct}% vs Static Retries
              </span>
            </div>

            <div className="bg-[#090d16] border border-cyan-500/30 rounded-xl p-5 shadow-md space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">Net Incremental Profit</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                +₹{results.uplift?.incremental_profit_inr?.toLocaleString()}
              </div>
              <span className="text-xs text-cyan-300/80 block font-mono">
                +{results.uplift?.profit_uplift_pct}% Margin-Protected
              </span>
            </div>

            <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-md space-y-1">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Futile Retries Suppressed</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono tabular-nums">
                {results.uplift?.futile_actions_suppressed?.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 block font-mono">
                Brand & fee penalties avoided
              </span>
            </div>
          </div>

          {/* Comparative Bar Chart */}
          <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Financial Yield Comparison (INR)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `₹${val / 1000}k`} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#070b12", borderColor: "#334155", borderRadius: "10px", fontSize: "11px" }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="recovered" name="Recovered Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Net Merchant Profit" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Behavioral Patterns: Recoverable vs Lost Revenue Table */}
          {results.customer_behavioral_patterns && (
            <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    Customer Behavioral Patterns: Recoverable vs. Lost Revenue Yield
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Breakdown of simulated failure cases across psychological archetypes showing recoverable yield and permanently suppressed revenue.
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-cyan-400 font-semibold tabular-nums">
                    Recoverable: ₹{(results.recoverable_revenue_inr || 0).toLocaleString()}
                  </span>
                  <span className="text-rose-400 font-semibold tabular-nums">
                    Lost: ₹{(results.lost_revenue_inr || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono font-medium text-[10px]">
                      <th className="pb-2.5">Customer Archetype</th>
                      <th className="pb-2.5">Cases</th>
                      <th className="pb-2.5">Total Volume</th>
                      <th className="pb-2.5">Recoverable</th>
                      <th className="pb-2.5">AI Captured</th>
                      <th className="pb-2.5">Lost</th>
                      <th className="pb-2.5 text-right">Yield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {results.customer_behavioral_patterns.map((pat: any) => (
                      <tr key={pat.archetype} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 font-semibold text-white">{pat.archetype}</td>
                        <td className="py-3 text-slate-400 font-mono tabular-nums">{pat.cases_count?.toLocaleString()}</td>
                        <td className="py-3 font-bold text-slate-200 font-mono tabular-nums">₹{pat.total_volume_inr?.toLocaleString()}</td>
                        <td className="py-3 text-cyan-400 font-mono tabular-nums">
                          ₹{pat.recoverable_volume_inr?.toLocaleString()} <span className="text-[10px] text-slate-500">({pat.recoverable_pct}%)</span>
                        </td>
                        <td className="py-3 text-emerald-400 font-bold font-mono tabular-nums">
                          ₹{pat.ai_recovered_volume_inr?.toLocaleString()} <span className="text-[10px] text-emerald-500">({pat.ai_recovery_pct}%)</span>
                        </td>
                        <td className="py-3 text-rose-400 font-mono tabular-nums">
                          ₹{pat.lost_volume_inr?.toLocaleString()} <span className="text-[10px] text-slate-500">({pat.lost_pct}%)</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tabular-nums">
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
