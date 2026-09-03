"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, 
  ArrowUpRight, RefreshCw, Zap, Play, ArrowRight, 
  Sparkles, Users, AlertCircle, ShieldX
} from "lucide-react";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from "recharts";
import { fetchMetrics, fetchCases, triggerDemoScenario } from "@/lib/api";

export default function OverviewPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("7d");
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [selectedArchetypeIndex, setSelectedArchetypeIndex] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, c] = await Promise.all([
        fetchMetrics().catch(() => null),
        fetchCases({ limit: 10 }).catch(() => [])
      ]);
      setMetrics(m);
      setRecentCases(c || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickDemoRun = async () => {
    try {
      setTriggering(true);
      setBannerMsg("Simulating HDFC card timeout failure (₹4,999)...");
      const res = await triggerDemoScenario("transient_issuer_failure");
      setBannerMsg(`Scenario processed. Case ${res.case_id} evaluated -> Next-Best Action: ${res.recommended_action}`);
      await loadData();
    } catch (err: any) {
      setBannerMsg(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  // 7-day Recovery trend chart data
  const chartData = [
    { time: "Day 1", atRisk: 145000, recovered: 92000, recoverable: 118000, lost: 27000 },
    { time: "Day 2", atRisk: 182000, recovered: 124000, recoverable: 148000, lost: 34000 },
    { time: "Day 3", atRisk: 168000, recovered: 110000, recoverable: 136000, lost: 32000 },
    { time: "Day 4", atRisk: 210000, recovered: 148000, recoverable: 171000, lost: 39000 },
    { time: "Day 5", atRisk: 195000, recovered: 139000, recoverable: 159000, lost: 36000 },
    { time: "Day 6", atRisk: 240000, recovered: 178000, recoverable: 195000, lost: 45000 },
    { time: "Day 7", atRisk: 225000, recovered: 169000, recoverable: 183000, lost: 42000 },
  ];

  // Default customer behavioral data calibrated to the 20,000 empirical cases
  const defaultBehavioralData = {
    total_at_risk_volume_inr: 200917365,
    total_recoverable_revenue_inr: 163199602,
    total_lost_revenue_inr: 37717763,
    overall_recoverable_rate_pct: 81.2,
    overall_lost_rate_pct: 18.8,
    archetypes: [
      {
        archetype: "Loyal Repeat Buyer",
        total_volume_inr: 122239408,
        recoverable_volume_inr: 98929990,
        lost_volume_inr: 23309418,
        recovered_volume_inr: 26637919,
        recoverable_pct: 80.9,
        lost_pct: 19.1,
        cases_count: 12163,
        frequent_abandonment_rate_pct: 0.0,
        description: "VIP customers with high historical LTV and habitual checkout cadence. Losses are almost purely technical bank switch outages and mandate revocations.",
        optimal_strategy: "Frictionless Priority Alternate Payment Link (Zero discount needed)."
      },
      {
        archetype: "Window Shopper Abandoner",
        total_volume_inr: 37436197,
        recoverable_volume_inr: 29297828,
        lost_volume_inr: 8138369,
        recovered_volume_inr: 7961061,
        recoverable_pct: 78.3,
        lost_pct: 21.7,
        cases_count: 3613,
        frequent_abandonment_rate_pct: 4.6,
        description: "Casual browsers checking total landed costs and fees. Highest cart drop-off volume without urgency incentives.",
        optimal_strategy: "Limited-time 24h Stock Hold Reservation alert with scarcity push."
      },
      {
        archetype: "Friction-Averse 1-Tap Speed",
        total_volume_inr: 21135351,
        recoverable_volume_inr: 16835774,
        lost_volume_inr: 4299577,
        recovered_volume_inr: 4432970,
        recoverable_pct: 79.7,
        lost_pct: 20.3,
        cases_count: 1985,
        frequent_abandonment_rate_pct: 21.3,
        description: "Mobile shoppers with high intent but zero tolerance for gateway redirects or slow bank pages.",
        optimal_strategy: "Instant 1-Tap WhatsApp UPI Intent Deep-Link."
      },
      {
        archetype: "Anxious & Security Conscious",
        total_volume_inr: 11780805,
        recoverable_volume_inr: 11597837,
        lost_volume_inr: 182968,
        recovered_volume_inr: 2994782,
        recoverable_pct: 98.4,
        lost_pct: 1.6,
        cases_count: 1207,
        frequent_abandonment_rate_pct: 23.6,
        description: "Customers with prolonged hesitation dwell times fearing double-deduction. 98%+ recoverable when reassured.",
        optimal_strategy: "Bilingual Voice & Text Reassurance confirming zero deduction."
      },
      {
        archetype: "First-Time Skeptical",
        total_volume_inr: 7136152,
        recoverable_volume_inr: 5597674,
        lost_volume_inr: 1538478,
        recovered_volume_inr: 1275484,
        recoverable_pct: 78.4,
        lost_pct: 21.6,
        cases_count: 334,
        frequent_abandonment_rate_pct: 65.3,
        description: "New customers with trust deficits at payment authorization. Suspicious of unfamiliar gateways.",
        optimal_strategy: "Razorpay Verified Trust Badges and 24h order hold comfort."
      },
      {
        archetype: "Chronic Deal Hunter",
        total_volume_inr: 1189452,
        recoverable_volume_inr: 940499,
        lost_volume_inr: 248953,
        recovered_volume_inr: 595654,
        recoverable_pct: 79.1,
        lost_pct: 20.9,
        cases_count: 698,
        frequent_abandonment_rate_pct: 100.0,
        description: "Frequent cart abandoners seeking coupons and promotional codes. High abandonment rate without incentive.",
        optimal_strategy: "Bounded 5% Recovery Incentive & Stock Hold Countdown."
      }
    ],
    abandonment_triggers: [
      { trigger: "bank_technical_glitch", lost_volume_inr: 13334990, percentage: 35.4 },
      { trigger: "session_distraction_and_timeout", lost_volume_inr: 9295606, percentage: 24.6 },
      { trigger: "price_shock_at_shipping_or_taxes", lost_volume_inr: 6791928, percentage: 18.0 },
      { trigger: "window_shopping_comparison", lost_volume_inr: 6243648, percentage: 16.6 },
      { trigger: "instrument_input_error", lost_volume_inr: 1157918, percentage: 3.1 },
      { trigger: "unexpected_amount_or_liquidity", lost_volume_inr: 531064, percentage: 1.4 },
      { trigger: "payment_friction_otp_timeout", lost_volume_inr: 362609, percentage: 1.0 }
    ]
  };

  const behavioralData = metrics?.customer_behavioral_revenue?.archetypes?.length
    ? metrics.customer_behavioral_revenue
    : defaultBehavioralData;

  const activeArchetype = behavioralData.archetypes[selectedArchetypeIndex] || behavioralData.archetypes[0];

  const archetypeChartData = behavioralData.archetypes.map((a: any) => ({
    name: a.archetype.replace(" & ", " & ").replace("Friction-Averse ", ""),
    recoverable: Math.round(a.recoverable_volume_inr / 100000) / 10,
    lost: Math.round(a.lost_volume_inr / 100000) / 10,
    recovered: Math.round(a.recovered_volume_inr / 100000) / 10,
  }));

  return (
    <div className="space-y-7 animate-fadeIn pb-14">
      {/* Top Value Proposition Header */}
      <div className="border border-slate-800/90 bg-[#090d16] rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Autonomous Recovery Orchestrator
              </span>
              <span className="text-slate-400 text-[11px] font-mono">Decision Engine Active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2">
              Payment Recovery & Financial Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-[65ch] leading-relaxed">
              Diagnoses transaction failures, models customer psychology and checkout abandonment risk, evaluates recoverable revenue, and executes policy-governed interventions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleQuickDemoRun}
              disabled={triggering}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold text-xs shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{triggering ? "Evaluating..." : "Run Test Failure"}</span>
            </button>
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition active:scale-[0.98]"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {bannerMsg && (
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-cyan-200 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-medium">{bannerMsg}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-xs text-cyan-400 hover:underline font-mono">Dismiss</button>
        </div>
      )}

      {/* 4 Standardized Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Revenue at Risk */}
        <div
          onClick={() => router.push("/cases?state=READY_FOR_ACTION")}
          className="bg-[#090d16] border border-slate-800/90 hover:border-amber-500/40 rounded-xl p-5 shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Revenue at Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-400 transition-transform group-hover:scale-110" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums group-hover:text-amber-300 transition">
              ₹{(metrics?.revenue_at_risk_inr || behavioralData.total_at_risk_volume_inr).toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="font-mono text-[11px]">{metrics?.total_cases_count || 20000} failed/drop cases</span>
              <span className="text-amber-400 font-semibold text-[11px] flex items-center">
                <span>View Queue</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Recoverable Revenue */}
        <div
          onClick={() => router.push("/cases?state=READY_FOR_ACTION")}
          className="bg-[#090d16] border border-slate-800/90 hover:border-cyan-500/40 rounded-xl p-5 shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Recoverable Revenue</span>
            <Zap className="w-4 h-4 text-cyan-400 transition-transform group-hover:scale-110" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono tabular-nums">
              ₹{behavioralData.total_recoverable_revenue_inr.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-cyan-300 mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="font-mono text-[11px]">{behavioralData.overall_recoverable_rate_pct}% Recoverable Yield</span>
              <span className="text-cyan-400 font-semibold text-[11px] flex items-center">
                <span>AI Pipeline</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 3. Permanently Lost Revenue */}
        <div
          onClick={() => router.push("/cases?state=STOPPED")}
          className="bg-[#090d16] border border-slate-800/90 hover:border-rose-500/40 rounded-xl p-5 shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Lost Revenue (Unrecoverable)</span>
            <ShieldX className="w-4 h-4 text-rose-400 transition-transform group-hover:scale-110" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tabular-nums">
              ₹{behavioralData.total_lost_revenue_inr.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-rose-300 mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="font-mono text-[11px]">{behavioralData.overall_lost_rate_pct}% Suppressed/Dropped</span>
              <span className="text-rose-400 font-semibold text-[11px] flex items-center">
                <span>Root Causes</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 4. Recovered Revenue */}
        <div
          onClick={() => router.push("/cases?state=RECOVERED")}
          className="bg-[#090d16] border border-slate-800/90 hover:border-emerald-500/40 rounded-xl p-5 shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Recovered Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 transition-transform group-hover:scale-110" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
              ₹{(metrics?.recovered_revenue_inr || 43900000).toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-300 mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="font-mono text-[11px]">{metrics?.recovery_rate_percentage || 21.8}% Capture Rate</span>
              <span className="text-emerald-400 font-semibold text-[11px] flex items-center">
                <span>Attributions</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION: CUSTOMER BEHAVIOR PATTERNS TO LOST & RECOVERABLE REVENUE ================= */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-base">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2>Customer Behavior Patterns: Recoverable vs. Lost Revenue</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-[65ch] leading-relaxed">
              Breakdown of recoverability and checkout abandonment across 6 customer psychological archetypes identified by our trained ML and Intent models.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span className="text-slate-300 font-medium">Recoverable (81.2%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-300 font-medium">Lost (18.8%)</span>
            </div>
          </div>
        </div>

        {/* Macro Dual Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono font-medium">
            <span className="text-cyan-400">
              Recoverable: ₹{behavioralData.total_recoverable_revenue_inr.toLocaleString()} (81.2%)
            </span>
            <span className="text-rose-400">
              Permanently Lost: ₹{behavioralData.total_lost_revenue_inr.toLocaleString()} (18.8%)
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
            <div
              style={{ width: `${behavioralData.overall_recoverable_rate_pct}%` }}
              className="bg-cyan-500 rounded-l-full transition-all duration-500"
            />
            <div
              style={{ width: `${behavioralData.overall_lost_rate_pct}%` }}
              className="bg-rose-500 rounded-r-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Interactive Behavioral Archetype Tabs */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider block">
            Select Customer Psychology Archetype:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {behavioralData.archetypes.map((arch: any, idx: number) => {
              const isSelected = selectedArchetypeIndex === idx;
              return (
                <button
                  key={arch.archetype}
                  onClick={() => setSelectedArchetypeIndex(idx)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1.5 active:scale-[0.98] ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500/60 text-white shadow-sm ring-1 ring-cyan-500/20"
                      : "bg-slate-950/80 border-slate-850 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold truncate block">{arch.archetype}</span>
                  <div className="space-y-0.5 font-mono">
                    <div className="text-[11px] font-bold text-cyan-400 tabular-nums">
                      ₹{(arch.total_volume_inr / 1000000).toFixed(1)}M vol
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between tabular-nums">
                      <span className="text-emerald-400">{arch.recoverable_pct}% rec</span>
                      <span className="text-rose-400">{arch.lost_pct}% lost</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Archetype Deep-Dive Panel */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                  Behavioral Profile
                </span>
                <span className="text-xs text-slate-400 font-mono">{activeArchetype.cases_count.toLocaleString()} cases in dataset</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                {activeArchetype.archetype}
              </h3>
            </div>

            <div className="flex items-center space-x-5 font-mono">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Abandonment Risk</span>
                <span className={`text-xs font-bold tabular-nums ${
                  activeArchetype.frequent_abandonment_rate_pct > 20 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {activeArchetype.frequent_abandonment_rate_pct}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Recoverability</span>
                <span className="text-xs font-bold text-cyan-400 tabular-nums">
                  {activeArchetype.recoverable_pct}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Recoverable Volume */}
            <div className="p-3.5 rounded-xl bg-cyan-950/15 border border-cyan-500/25 space-y-1">
              <span className="text-slate-400 font-medium block">Recoverable Revenue Volume</span>
              <span className="text-lg font-bold text-cyan-400 font-mono tabular-nums block">
                ₹{activeArchetype.recoverable_volume_inr.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {activeArchetype.recoverable_pct}% addressable via Next-Best Action interventions.
              </p>
            </div>

            {/* Lost Volume */}
            <div className="p-3.5 rounded-xl bg-rose-950/15 border border-rose-500/25 space-y-1">
              <span className="text-slate-400 font-medium block">Permanently Lost Revenue</span>
              <span className="text-lg font-bold text-rose-400 font-mono tabular-nums block">
                ₹{activeArchetype.lost_volume_inr.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {activeArchetype.lost_pct}% lost to hard declines, cart abandonment, or DND opt-outs.
              </p>
            </div>

            {/* AI Policy Recovery Strategy */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium block">AI Recovery Strategy</span>
              <span className="text-xs font-semibold text-slate-200 block">
                {activeArchetype.optimal_strategy}
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {activeArchetype.description}
              </p>
            </div>
          </div>
        </div>

        {/* Grouped Comparison Chart */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Revenue Comparison Across Behavioral Archetypes (₹ Lakhs)
            </h4>
            <span className="text-[10px] font-mono text-slate-500">1 Lakh = ₹100,000</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={archetypeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end" 
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `₹${val}L`} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#070b12", borderColor: "#334155", borderRadius: "10px", fontSize: "11px" }}
                  formatter={(val: any) => [`₹${val} Lakhs`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                <Bar dataKey="recoverable" name="Recoverable Revenue" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lost" name="Permanently Lost Revenue" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="recovered" name="Already Captured" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Behavioral Abandonment Triggers */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Primary Abandonment & Failure Triggers</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {behavioralData.abandonment_triggers.slice(0, 4).map((t: any) => (
              <div key={t.trigger} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-medium text-slate-300 text-[11px] truncate">{t.trigger.replace(/_/g, " ")}</span>
                  <span className="text-rose-400 font-bold tabular-nums">{t.percentage}%</span>
                </div>
                <div className="text-sm font-bold text-slate-200 font-mono tabular-nums">
                  ₹{t.lost_volume_inr.toLocaleString()}
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div style={{ width: `${t.percentage}%` }} className="bg-rose-500 h-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Worklist Feed & Architecture Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Recovery Queue */}
        <div className="lg:col-span-2 bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Live Ingested Recovery Queue</h2>
              <p className="text-xs text-slate-400">Transactions ranked by Expected Recovery Value (ERV)</p>
            </div>
            <Link 
              href="/cases"
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono font-medium text-[10px]">
                  <th className="pb-2.5">Case / Order</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Method</th>
                  <th className="pb-2.5">Failure Code</th>
                  <th className="pb-2.5">Intent</th>
                  <th className="pb-2.5">State</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-sans">
                {recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 font-medium text-slate-200">
                      <div className="font-mono font-bold text-white text-xs">{c.id}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.order_id || "Direct Pay"}</div>
                    </td>
                    <td className="py-3 font-bold text-white text-xs font-mono tabular-nums">
                      ₹{c.amount_inr?.toLocaleString()}
                    </td>
                    <td className="py-3 text-slate-300">
                      <span className="font-semibold uppercase text-white block text-[11px]">{c.issuer || "UPI"}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">{c.payment_method}</span>
                    </td>
                    <td className="py-3 text-slate-300 max-w-[150px]">
                      <span className="font-mono text-cyan-400 text-[11px] block font-semibold truncate">{c.latest_failure_code}</span>
                      <span className="text-slate-400 text-[10px] truncate block">{c.latest_failure_reason}</span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        c.intent_score > 75 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {c.intent_score}/100
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        c.state === "RECOVERED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        c.state === "STOPPED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        c.state === "ESCALATED" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : 
                        "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {c.state}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 font-medium inline-flex items-center space-x-1 transition border border-slate-800 text-[11px] active:scale-[0.98]"
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
        </div>

        {/* Right 1 Col: Architecture Loop & Simulator Shortcut */}
        <div className="space-y-4">
          <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>LangGraph Multi-Agent Loop</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-agent state graph where evaluating agents review actions before execution.
            </p>
            <div className="space-y-1.5 text-xs font-mono">
              {[
                { name: "1. Diagnostician Agent", desc: "RAG error taxonomy & bank evidence", status: "Active", color: "text-emerald-400" },
                { name: "2. Strategist Agent", desc: "Computes ERV & NBA action", status: "Active", color: "text-emerald-400" },
                { name: "3. Policy Critic Agent", desc: "Enforces deterministic boundaries", status: "Gated", color: "text-emerald-400" },
                { name: "4. Supervisor Evaluator", desc: "Multi-turn consensus loop", status: "Active", color: "text-cyan-400" },
              ].map((agent, i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-[11px]">{agent.name}</div>
                    <div className="text-[10px] text-slate-500">{agent.desc}</div>
                  </div>
                  <span className={`${agent.color} font-bold text-[10px]`}>{agent.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>20,000-Case Policy Simulator</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Replay synthetic transactions comparing No Action vs Static Retries vs AI Policy.
            </p>
            <Link
              href="/simulation"
              className="w-full py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-medium border border-indigo-500/30 flex items-center justify-center space-x-1.5 transition active:scale-[0.98]"
            >
              <span>Launch Policy Replay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
