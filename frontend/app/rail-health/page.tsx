"use client";

import { useEffect, useState } from "react";
import { 
  GitFork, Activity, AlertTriangle, CheckCircle2, 
  RefreshCw, Zap, ShieldAlert, TrendingDown, ArrowRight
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from "recharts";
import { fetchRailHealth, degradeRail, restoreRail } from "@/lib/api";

export default function RailHealthPage() {
  const [rails, setRails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadRails = async () => {
    try {
      setLoading(true);
      const data = await fetchRailHealth();
      setRails(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRails();
    const interval = setInterval(loadRails, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDegrade = async (method: string, issuer: string) => {
    try {
      await degradeRail(method, issuer);
      setActionMsg(`Degradation spike injected on ${issuer.toUpperCase()} ${method}. Success rate suppressed to 20%. NBA will now avoid this rail.`);
      await loadRails();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const handleRestore = async (method: string, issuer: string) => {
    try {
      await restoreRail(method, issuer);
      setActionMsg(`Health restored on ${issuer.toUpperCase()} ${method}. Success rate returned to healthy baseline.`);
      await loadRails();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  // Live telemetry time-series
  const telemetryData = [
    { time: "12:00", hdfcCard: 94, sbiCard: 92, upiFast: 96, iciciNet: 91 },
    { time: "12:15", hdfcCard: 93, sbiCard: 91, upiFast: 95, iciciNet: 92 },
    { time: "12:30", hdfcCard: 89, sbiCard: 88, upiFast: 94, iciciNet: 90 },
    { time: "12:45", hdfcCard: 32, sbiCard: 89, upiFast: 95, iciciNet: 89 },
    { time: "13:00", hdfcCard: 28, sbiCard: 87, upiFast: 96, iciciNet: 91 },
    { time: "13:15", hdfcCard: 92, sbiCard: 90, upiFast: 95, iciciNet: 93 },
    { time: "13:30", hdfcCard: 95, sbiCard: 93, upiFast: 97, iciciNet: 94 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <GitFork className="w-6 h-6 text-cyan-400" />
            <span>Adaptive Payment Rail Health Telemetry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time rolling success rates across UPI, Cards, and Netbanking. Suppresses same-rail retries during banking outages.
          </p>
        </div>

        <button
          onClick={loadRails}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {actionMsg && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{actionMsg}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-xs text-cyan-400 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Real-time Telemetry Line Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">Live Success Rate Telemetry Matrix (%)</h2>
            <p className="text-xs text-slate-400">Degradation detected when rolling success rate drops below 40% with ≥ 30 sample size.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Rolling Window: 10m
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                formatter={(val: any) => [`${val}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Line type="monotone" dataKey="hdfcCard" name="HDFC Cards" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sbiCard" name="SBI Cards" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="upiFast" name="UPI Universal" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="iciciNet" name="ICICI Netbanking" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Rail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rails.map((rail, idx) => (
          <div
            key={idx}
            className={`bg-slate-900 border rounded-3xl p-6 shadow-xl space-y-4 transition ${
              rail.is_degraded ? "border-rose-500/50 bg-rose-950/10" : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-white uppercase block">
                  {rail.issuer || "UNIVERSAL"} {rail.method}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {rail.network ? `${rail.network.toUpperCase()} · ` : ""}{rail.total_observations} observations
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                rail.is_degraded 
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse" 
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}>
                {rail.is_degraded ? "DEGRADED" : "HEALTHY"}
              </span>
            </div>

            {/* Success Rate Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Success Rate</span>
                <span className={`font-black ${rail.is_degraded ? "text-rose-400" : "text-emerald-400"}`}>
                  {Math.round(rail.rolling_success_rate * 100)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    rail.is_degraded ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.round(rail.rolling_success_rate * 100)}%` }}
                />
              </div>
            </div>

            {/* Actions: Inject Failure Spike / Restore */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              {rail.is_degraded ? (
                <button
                  onClick={() => handleRestore(rail.method, rail.issuer || "hdfc")}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Restore Rail Health</span>
                </button>
              ) : (
                <button
                  onClick={() => handleDegrade(rail.method, rail.issuer || "hdfc")}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 font-bold text-xs border border-slate-800 hover:border-rose-500/30 transition flex items-center justify-center space-x-1.5"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Inject Outage Spike</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
