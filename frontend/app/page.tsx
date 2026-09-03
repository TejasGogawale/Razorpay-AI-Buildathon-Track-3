"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, 
  ArrowUpRight, Clock, RefreshCw, Zap, Play, ArrowRight, ShieldAlert, 
  Sparkles, Filter, Users, Heart, AlertCircle, ShoppingCart, 
  Eye, Tag, UserCheck, ShieldX
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
        fetchCases({ limit: 12 }).catch(() => [])
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
      setBannerMsg("Ingesting Scenario 1: ₹4,999 HDFC Transient Failure...");
      const res = await triggerDemoScenario("transient_issuer_failure");
      setBannerMsg(`Scenario 1 processed! Case ${res.case_id} evaluated by LangGraph loop -> Next Action: ${res.recommended_action}`);
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

  // Customer Behavioral Archetypes Data (fallback values matching 20k dataset)
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

  // Bar chart comparing Recoverable vs Lost Revenue across the 6 Archetypes
  const archetypeChartData = behavioralData.archetypes.map((a: any) => ({
    name: a.archetype.replace(" & ", " & ").replace("Friction-Averse ", ""),
    recoverable: Math.round(a.recoverable_volume_inr / 100000) / 10, // in Lakhs
    lost: Math.round(a.lost_volume_inr / 100000) / 10, // in Lakhs
    recovered: Math.round(a.recovered_volume_inr / 100000) / 10,
  }));

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Autonomous Recovery & Behavioral Profiling
            </span>
            <span className="text-xs text-slate-400">Context-Aware NBA + Policy Guardrails</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
            AI Revenue Recovery Orchestrator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Failure-aware recovery layer that diagnoses payment declines, maps customer psychological behavior, evaluates recoverable vs permanently lost revenue, and executes policy-governed interventions.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={handleQuickDemoRun}
            disabled={triggering}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{triggering ? "Evaluating..." : "Run Demo Event"}</span>
          </button>
          <button
            onClick={loadData}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition shadow"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-xs text-cyan-400 hover:underline">Dismiss</button>
        </div>
      )}

      {/* 4 Clickable Financial KPI Cards: Gross At-Risk, Recoverable, Lost & Policy Shields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* 1. Revenue at Risk */}
        <div
          onClick={() => router.push("/cases?state=READY_FOR_ACTION")}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Revenue at Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white group-hover:text-amber-300 transition">
              ₹{(metrics?.revenue_at_risk_inr || behavioralData.total_at_risk_volume_inr).toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>{metrics?.total_cases_count || 20000} failed/drop cases</span>
              <span className="text-amber-400 flex items-center text-[11px] font-semibold">
                <span>View Queue</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Recoverable Revenue */}
        <div
          onClick={() => router.push("/cases?state=READY_FOR_ACTION")}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg transition cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Recoverable Revenue</span>
            <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400">
              ₹{behavioralData.total_recoverable_revenue_inr.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-cyan-300 mt-2 pt-2 border-t border-slate-800/80">
              <span>{behavioralData.overall_recoverable_rate_pct}% Recoverable Yield</span>
              <span className="text-cyan-400 flex items-center text-[11px] font-semibold">
                <span>AI Pipeline</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 3. Permanently Lost Revenue (Unrecoverable) */}
        <div
          onClick={() => router.push("/cases?state=STOPPED")}
          className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 shadow-lg transition cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Lost Revenue (Unrecoverable)</span>
            <ShieldX className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400">
              ₹{behavioralData.total_lost_revenue_inr.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-rose-300 mt-2 pt-2 border-t border-slate-800/80">
              <span>{behavioralData.overall_lost_rate_pct}% Dropped / Suppressed</span>
              <span className="text-rose-400 flex items-center text-[11px] font-semibold">
                <span>Root Causes</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 4. Recovered Revenue Captured */}
        <div
          onClick={() => router.push("/cases?state=RECOVERED")}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg transition cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Recovered Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              ₹{(metrics?.recovered_revenue_inr || 43900000).toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-300 mt-2 pt-2 border-t border-slate-800/80">
              <span>{metrics?.recovery_rate_percentage || 21.8}% Capture Rate</span>
              <span className="text-emerald-400 flex items-center text-[11px] font-semibold">
                <span>Attributions</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION: CUSTOMER BEHAVIOR PATTERNS TO LOST & RECOVERABLE REVENUE ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Customer Behavior Patterns: Recoverable vs. Lost Revenue
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Empirical breakdown of revenue recoverability and checkout abandonment across 6 customer psychological archetypes identified by our trained ML and Intent engines.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
              <span className="text-slate-300 font-semibold">Recoverable (81.2%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-slate-300 font-semibold">Lost (18.8%)</span>
            </div>
          </div>
        </div>

        {/* Macro Dual Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-cyan-400">
              Recoverable: ₹{behavioralData.total_recoverable_revenue_inr.toLocaleString()} (81.2%)
            </span>
            <span className="text-rose-400">
              Permanently Lost: ₹{behavioralData.total_lost_revenue_inr.toLocaleString()} (18.8%)
            </span>
          </div>
          <div className="h-3.5 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
            <div
              style={{ width: `${behavioralData.overall_recoverable_rate_pct}%` }}
              className="bg-gradient-to-r from-blue-600 to-cyan-400 rounded-l-full transition-all duration-500 shadow-sm shadow-cyan-500/30"
              title="Recoverable Revenue"
            />
            <div
              style={{ width: `${behavioralData.overall_lost_rate_pct}%` }}
              className="bg-gradient-to-r from-rose-500 to-amber-600 rounded-r-full transition-all duration-500 shadow-sm shadow-rose-500/30"
              title="Lost Revenue"
            />
          </div>
        </div>

        {/* Interactive Behavioral Archetypes Tabs */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Select Customer Psychology Archetype:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {behavioralData.archetypes.map((arch: any, idx: number) => {
              const isSelected = selectedArchetypeIndex === idx;
              return (
                <button
                  key={arch.archetype}
                  onClick={() => setSelectedArchetypeIndex(idx)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate block">{arch.archetype}</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-mono font-bold text-cyan-400">
                      ₹{(arch.total_volume_inr / 1000000).toFixed(1)}M vol
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
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
        <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Behavioral Diagnosis
                </span>
                <span className="text-xs text-slate-400">{activeArchetype.cases_count.toLocaleString()} cases in dataset</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {activeArchetype.archetype}
              </h3>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Frequent Abandonment Rate</span>
                <span className={`text-sm font-bold font-mono ${
                  activeArchetype.frequent_abandonment_rate_pct > 20 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {activeArchetype.frequent_abandonment_rate_pct}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Recoverable Ratio</span>
                <span className="text-sm font-bold font-mono text-cyan-400">
                  {activeArchetype.recoverable_pct}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Recoverable Volume */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-1">
              <span className="text-slate-400 font-semibold block">Recoverable Revenue Volume</span>
              <span className="text-xl font-extrabold text-cyan-400 font-mono block">
                ₹{activeArchetype.recoverable_volume_inr.toLocaleString()}
              </span>
              <p className="text-[11px] text-cyan-300/80">
                {activeArchetype.recoverable_pct}% of total archetype volume can be captured via autonomous NBA interventions.
              </p>
            </div>

            {/* Lost Volume */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1">
              <span className="text-slate-400 font-semibold block">Permanently Lost Revenue</span>
              <span className="text-xl font-extrabold text-rose-400 font-mono block">
                ₹{activeArchetype.lost_volume_inr.toLocaleString()}
              </span>
              <p className="text-[11px] text-rose-300/80">
                {activeArchetype.lost_pct}% lost to hard declines, cart abandonment, or unconsented DND churn guard.
              </p>
            </div>

            {/* AI Policy Recovery Strategy */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
              <span className="text-slate-400 font-semibold block">AI Policy Recovery Strategy</span>
              <span className="text-xs font-bold text-indigo-300 block">
                {activeArchetype.optimal_strategy}
              </span>
              <p className="text-[11px] text-slate-400">
                {activeArchetype.description}
              </p>
            </div>
          </div>
        </div>

        {/* Grouped Comparison Chart: Recoverable vs Lost Revenue across all Archetypes */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Revenue Comparison by Behavioral Pattern (in ₹ Lakhs)
            </h4>
            <span className="text-[11px] text-slate-500">1 Lakh = ₹100,000</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={archetypeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
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
                  contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(val: any) => [`₹${val} Lakhs`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                <Bar dataKey="recoverable" name="Recoverable Revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" name="Permanently Lost Revenue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recovered" name="Already Captured" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Behavioral Abandonment Triggers Causing Revenue Loss */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Primary Abandonment & Failure Triggers Causing Revenue Loss</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {behavioralData.abandonment_triggers.slice(0, 4).map((t: any) => (
              <div key={t.trigger} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-[11px] truncate">{t.trigger.replace(/_/g, " ")}</span>
                  <span className="text-rose-400 font-bold">{t.percentage}%</span>
                </div>
                <div className="text-sm font-extrabold text-slate-200 font-mono">
                  ₹{t.lost_volume_inr.toLocaleString()}
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: `${t.percentage}%` }} className="bg-rose-500 h-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Worklist Feed & Multi-Agent Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Live Recovery Queue with Diverse Samples */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Live Ingested Recovery Queue</h2>
              <p className="text-xs text-slate-400">Transactions diagnosed and ranked by Expected Recovery Value (ERV)</p>
            </div>
            <Link 
              href="/cases"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>Explore All Cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="pb-3">Case / Order</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Bank / Method</th>
                  <th className="pb-3">Failure Reason</th>
                  <th className="pb-3">Intent</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 font-medium text-slate-200">
                      <div className="font-bold text-white font-mono text-xs">{c.id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{c.order_id || "Direct Pay"}</div>
                    </td>
                    <td className="py-3.5 font-extrabold text-white text-xs">
                      ₹{c.amount_inr?.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-slate-300">
                      <span className="font-semibold uppercase text-white block text-[11px]">{c.issuer || "UPI"}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">{c.payment_method}</span>
                    </td>
                    <td className="py-3.5 text-slate-300 max-w-[180px]">
                      <span className="font-mono text-cyan-400 text-[11px] block font-semibold truncate">{c.latest_failure_code}</span>
                      <span className="text-slate-400 text-[11px] truncate block">{c.latest_failure_reason}</span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.intent_score > 75 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {c.intent_score}/100
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.state === "RECOVERED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        c.state === "STOPPED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        c.state === "ESCALATED" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : 
                        "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {c.state}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold inline-flex items-center space-x-1 transition border border-slate-700 text-[11px]"
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

        {/* Right 1 Col: LangGraph Multi-Agent Loop Highlights */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>LangGraph Multi-Agent Loop</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Multi-agent state graph where specialized evaluating agents review each other's decisions continuously before execution.
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">1. Diagnostician Agent</div>
                  <div className="text-[11px] text-slate-500">Retrieves RAG bank decline evidence</div>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">Active</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">2. Strategist Agent</div>
                  <div className="text-[11px] text-slate-500">Proposes NBA action & ERV</div>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">Active</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">3. Policy Critic Agent</div>
                  <div className="text-[11px] text-slate-500">Enforces deterministic safety</div>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">Gated</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">4. Supervisor Evaluator</div>
                  <div className="text-[11px] text-slate-500">Multi-turn review & consensus</div>
                </div>
                <span className="text-cyan-400 font-bold text-[10px]">Review Loop</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
              <Play className="w-4 h-4 text-indigo-400" />
              <span>20,000-Case Monte Carlo Simulator</span>
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Replay 20,000 synthetic transactions across No Action vs Static Baseline vs AI Policy.
            </p>
            <Link
              href="/simulation"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md shadow-indigo-600/20"
            >
              <span>Launch Monte Carlo Replay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
