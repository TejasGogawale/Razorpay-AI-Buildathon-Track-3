"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, Layers, GitFork, Sliders, 
  PlaySquare, Sparkles, CreditCard, ShieldCheck, Terminal
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: Activity },
    { name: "Checkout Terminal", href: "/checkout", icon: CreditCard, highlight: true },
    { name: "Recovery Queue", href: "/cases", icon: Layers },
    { name: "Rail Telemetry", href: "/rail-health", icon: GitFork },
    { name: "Policy Center", href: "/policies", icon: Sliders },
    { name: "Simulation & ROI", href: "/simulation", icon: PlaySquare },
    { name: "Deploy & Integrate", href: "/integration", icon: Terminal },
    { name: "Demo Scenarios", href: "/scenarios", icon: Sparkles },
  ];

  return (
    <header className="bg-[#070b12]/90 border-b border-slate-800/80 sticky top-0 z-50 text-white backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Title */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm transition-transform group-hover:scale-105">
              <span className="font-mono font-black text-sm text-cyan-400 tracking-tighter">RO</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
                <span>RecoverOS</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">v1.2</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wide">
                AI Revenue Recovery Orchestrator
              </span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    item.highlight
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-sm shadow-cyan-500/5 font-semibold"
                      : isActive
                      ? "bg-slate-900 text-white border border-slate-750 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.highlight ? "text-cyan-400" : isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Live Decisioning Status Indicator */}
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              <span>Live Engine</span>
            </span>
          </div>
        </div>

        {/* Mobile Horizontal Sub-Navigation */}
        <div className="lg:hidden flex items-center space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-850">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`whitespace-nowrap flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-cyan-400 border border-slate-750"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
