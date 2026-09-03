"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, Layers, GitFork, Sliders, 
  PlaySquare, Users, Sparkles, CreditCard, Zap
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: Activity },
    { name: "Interactive Gateway", href: "/checkout", icon: CreditCard, highlight: true },
    { name: "Recovery Queue", href: "/cases", icon: Layers },
    { name: "Rail Telemetry", href: "/rail-health", icon: GitFork },
    { name: "Policy Center", href: "/policies", icon: Sliders },
    { name: "Simulation & ROI", href: "/simulation", icon: PlaySquare },
    { name: "Deploy & Integrate", href: "/integration", icon: Sparkles },
    { name: "Demo Console", href: "/scenarios", icon: Activity },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-50 text-white backdrop-blur-md bg-slate-950/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Title */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                RecoverOS
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                AI Revenue Recovery Engine
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    item.highlight
                      ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-blue-500/25 animate-pulse"
                      : isActive
                      ? "bg-slate-900 text-cyan-400 border border-slate-800"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Live System Status Pill */}
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mr-1.5"></span>
              Live Decisioning Active
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
