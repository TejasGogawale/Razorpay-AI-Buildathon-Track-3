"use client";

import { useState } from "react";
import { Sliders, ShieldCheck, Clock, Lock, CheckCircle2, AlertTriangle } from "lucide-react";

export default function PolicyCenterPage() {
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [maxMessages, setMaxMessages] = useState(2);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(8);
  const [humanThreshold, setHumanThreshold] = useState(25000);
  const [shadowMode, setShadowMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-blue-400" />
            <span>Policy-as-Code Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic governance rules, contact fatigue bounds, quiet hours, and risk escalation thresholds.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center space-x-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{saved ? "Policy Updated!" : "Save Policy (v1.1)"}</span>
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300">
          Policy version v1.1 activated. Decisions will record the new policy version in provenance logs.
        </div>
      )}

      {/* Rules Config Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Consent Guard */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Customer Outreach & Fatigue Policy</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Max Messages per 24-Hour Rolling Window
              </label>
              <input
                type="number"
                value={maxMessages}
                onChange={(e) => setMaxMessages(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500">Prevents contact fatigue and brand annoyance.</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Quiet Hours Start</label>
                <input
                  type="number"
                  value={quietStart}
                  onChange={(e) => setQuietStart(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500">22:00 (10 PM)</span>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Quiet Hours End</label>
                <input
                  type="number"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500">08:00 (8 AM)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Opt-Out Keywords</span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {["STOP", "UNSUBSCRIBE", "CANCEL", "OPT OUT"].map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded bg-slate-950 text-rose-400 border border-rose-500/20">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Autonomy & Duplicate Prevention */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Autonomy & Risk Protection</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Human Review Threshold (INR)
              </label>
              <input
                type="number"
                value={humanThreshold}
                onChange={(e) => setHumanThreshold(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500">Transactions equal or above this value require operator approval.</span>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Max Recovery Attempts per Case
              </label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500">Subsequent failures are escalated to prevent excessive retries.</span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-semibold block">Duplicate Recovery Shield</span>
                <span className="text-[11px] text-slate-500">Blocks overlapping charge-producing actions.</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
