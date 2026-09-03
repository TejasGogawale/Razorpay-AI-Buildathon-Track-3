"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Code2, Terminal, Copy, Check, Blocks, ShieldCheck, 
  ArrowRight, Download, Sliders, Calculator, Zap, 
  Sparkles, CheckCircle2, ChevronRight, Laptop, Server, 
  Layers, Lock, Database, PhoneCall, ExternalLink
} from "lucide-react";

export default function IntegrationGuidePage() {
  const [activeTab, setActiveTab] = useState<"webhook" | "frontend_sdk" | "backend_sdk" | "docker">("webhook");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ROI Calculator States
  const [monthlyGmvLakhs, setMonthlyGmvLakhs] = useState<number>(100); // 1 Crore GMV
  const [failureRatePct, setFailureRatePct] = useState<number>(18); // 18% failure rate
  const [merchantMarginPct, setMerchantMarginPct] = useState<number>(25); // 25% gross margin

  // Calculated ROI
  const gmvInr = monthlyGmvLakhs * 100000;
  const monthlyRevenueAtRiskInr = gmvInr * (failureRatePct / 100);
  const recoverableRevenueInr = monthlyRevenueAtRiskInr * 0.812; // 81.2% recoverable yield
  const recoveredRevenueInr = monthlyRevenueAtRiskInr * 0.268; // 26.8% conservative captured net uplift
  const incrementalProfitInr = recoveredRevenueInr * (merchantMarginPct / 100);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Header Banner */}
      <div className="border border-slate-800/90 bg-[#090d16] rounded-2xl p-6 sm:p-7 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Enterprise Deployment Hub
            </span>
            <span className="text-slate-400 text-[11px] font-mono">Universal Merchant Architecture</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            How Any Company Can Implement RecoverOS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-[65ch] leading-relaxed">
            Deploy RecoverOS as a modular, failure-aware recovery layer. From Shopify brands to enterprise B2B platforms, integrate within minutes across 4 implementation tiers.
          </p>
        </div>
      </div>

      {/* 4 Implementation Tiers Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: "webhook", title: "1. Zero-Code Webhook", subtitle: "Instant 60-Sec Setup", icon: Server },
          { id: "frontend_sdk", title: "2. Drop-in React Widget", subtitle: "Checkout UI & Dwell Tracking", icon: Laptop },
          { id: "backend_sdk", title: "3. Headless Backend SDK", subtitle: "Node.js, Python, REST", icon: Terminal },
          { id: "docker", title: "4. Self-Hosted Sidecar", subtitle: "Docker, K8s, On-Premises", icon: Blocks },
        ].map((tier) => {
          const Icon = tier.icon;
          const isActive = activeTab === tier.id;
          return (
            <button
              key={tier.id}
              onClick={() => setActiveTab(tier.id as any)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 active:scale-[0.98] ${
                isActive
                  ? "bg-slate-900 border-cyan-500/60 text-white shadow-sm ring-1 ring-cyan-500/20"
                  : "bg-slate-950/80 border-slate-850 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
              <div>
                <span className="text-xs font-bold block text-white">{tier.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">{tier.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Implementation Code & Instructions Panel */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        
        {/* TIER 1: ZERO-CODE WEBHOOK */}
        {activeTab === "webhook" && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Fastest Path to Value (Zero Code Changes)</span>
                <h2 className="text-base font-bold text-white mt-0.5">Option A: Razorpay Webhook Forwarding</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Setup Time: 2 Minutes
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If your company already uses Razorpay Checkout, WooCommerce, or Shopify, you do not need to rewrite your backend. Simply configure a webhook endpoint in your Razorpay Merchant Dashboard. RecoverOS will ingest failure events, calculate the customer psychology archetype, and dispatch automated recovery links.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">1. Webhook Destination URL</span>
                  <button
                    onClick={() => copyToClipboard("https://api.yourcompany.com/api/v1/webhooks/razorpay", "wh_url")}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    {copiedKey === "wh_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "wh_url" ? "Copied!" : "Copy URL"}</span>
                  </button>
                </div>
                <code className="text-xs text-cyan-300 font-mono block bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  https://api.yourcompany.com/api/v1/webhooks/razorpay
                </code>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-semibold block">2. Select Active Events in Razorpay Dashboard</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["payment.failed", "payment.authorized", "order.paid", "subscription.halted"].map((ev) => (
                    <div key={ev} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIER 2: DROP-IN FRONTEND SDK */}
        {activeTab === "frontend_sdk" && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Frontend Client SDK</span>
                <h2 className="text-base font-bold text-white mt-0.5">Option B: Drop-in React & Next.js Recovery Widget</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Setup Time: 5 Minutes
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Embed RecoverOS directly inside your React, Next.js, or mobile app checkout page. It passively measures checkout dwell time, hesitation velocity, and input drops to detect abandonment before the customer bounces.
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">1. Install Client SDK</span>
                <button
                  onClick={() => copyToClipboard("npm install @recoveros/react-sdk", "npm_install")}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  {copiedKey === "npm_install" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "npm_install" ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <code className="text-xs text-white font-mono block bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                npm install @recoveros/react-sdk
              </code>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">2. Drop into Checkout Page</span>
                <button
                  onClick={() => copyToClipboard(`import { RecoverOSProvider, AutonomousRecoveryWidget } from "@recoveros/react-sdk";

export default function CheckoutPage({ order }) {
  return (
    <RecoverOSProvider apiKey="rec_live_pk_98421" merchantId="rzp_live_corp">
      <YourCheckoutForm order={order} />
      {/* Autonomously pops up during payment decline with voice & UPI QR */}
      <AutonomousRecoveryWidget 
        orderId={order.id} 
        amount={order.amount} 
        customerPhone={order.customerPhone} 
      />
    </RecoverOSProvider>
  );
}`, "react_snippet")}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  {copiedKey === "react_snippet" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "react_snippet" ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="text-[11px] text-cyan-200 font-mono bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
{`import { RecoverOSProvider, AutonomousRecoveryWidget } from "@recoveros/react-sdk";

export default function CheckoutPage({ order }) {
  return (
    <RecoverOSProvider apiKey="rec_live_pk_98421" merchantId="rzp_live_corp">
      <YourCheckoutForm order={order} />
      {/* Autonomously pops up during payment decline with voice & UPI QR */}
      <AutonomousRecoveryWidget 
        orderId={order.id} 
        amount={order.amount} 
        customerPhone={order.customerPhone} 
      />
    </RecoverOSProvider>
  );
}`}
              </pre>
            </div>
          </div>
        )}

        {/* TIER 3: BACKEND SDK & REST API */}
        {activeTab === "backend_sdk" && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Custom Backend Integration</span>
                <h2 className="text-base font-bold text-white mt-0.5">Option C: Python & Node.js Server SDK</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Setup Time: 15 Minutes
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              For teams who want complete control over their checkout pipeline. Call the recovery decisioning engine via Python or Node.js to evaluate Expected Recovery Value (ERV) before firing automated webhooks or WhatsApp messages.
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">Python Decisioning Snippet</span>
                <button
                  onClick={() => copyToClipboard(`from recoveros import RecoverOSEngine

engine = RecoverOSEngine(api_key="rec_sec_live_44120")

# Run decisioning on payment decline
decision = engine.evaluate_payment_failure(
    order_id="order_98421",
    amount_inr=4999.0,
    payment_method="card",
    issuer="hdfc",
    error_code="ISSUER_TECHNICAL_ERROR",
    customer_phone="+919876543210"
)

print(f"Customer Archetype: {decision.customer_archetype}") # e.g. Anxious & Security Conscious
print(f"Expected Recovery Value: INR {decision.erv_inr}")
print(f"Recommended Action: {decision.action}") # e.g. SWITCH_TO_UPI
print(f"Bilingual Audio Script: {decision.voice_script_hinglish}")`, "py_snippet")}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  {copiedKey === "py_snippet" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "py_snippet" ? "Copied!" : "Copy Python Code"}</span>
                </button>
              </div>
              <pre className="text-[11px] text-cyan-200 font-mono bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
{`from recoveros import RecoverOSEngine

engine = RecoverOSEngine(api_key="rec_sec_live_44120")

# Run decisioning on payment decline
decision = engine.evaluate_payment_failure(
    order_id="order_98421",
    amount_inr=4999.0,
    payment_method="card",
    issuer="hdfc",
    error_code="ISSUER_TECHNICAL_ERROR",
    customer_phone="+919876543210"
)

print(f"Customer Archetype: {decision.customer_archetype}") # e.g. Anxious & Security Conscious
print(f"Expected Recovery Value: INR {decision.erv_inr}")
print(f"Recommended Action: {decision.action}") # e.g. SWITCH_TO_UPI
print(f"Bilingual Audio Script: {decision.voice_script_hinglish}")`}
              </pre>
            </div>
          </div>
        )}

        {/* TIER 4: SELF-HOSTED DOCKER / KUBERNETES SIDECAR */}
        {activeTab === "docker" && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Enterprise & Banking Compliance</span>
                <h2 className="text-base font-bold text-white mt-0.5">Option D: Self-Hosted Docker / Kubernetes Container</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PCI-DSS & On-Premises
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Banks, financial institutions, and regulated enterprises requiring strict data residency can run RecoverOS completely within their private cloud (AWS VPC, Google Cloud, or Azure) with zero outbound telemetry egress.
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">docker-compose.yml</span>
                <button
                  onClick={() => copyToClipboard(`version: '3.8'
services:
  recoveros-engine:
    image: ghcr.io/razorpay-buildathon/recoveros:latest
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - DB_URL=postgresql+asyncpg://user:pass@db:5432/recoveros
      - RAZORPAY_KEY_ID=\${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=\${RAZORPAY_KEY_SECRET}
      - WHATSAPP_BUSINESS_TOKEN=\${WHATSAPP_TOKEN}
    restart: always`, "docker_snippet")}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  {copiedKey === "docker_snippet" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "docker_snippet" ? "Copied!" : "Copy Compose File"}</span>
                </button>
              </div>
              <pre className="text-[11px] text-cyan-200 font-mono bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
{`version: '3.8'
services:
  recoveros-engine:
    image: ghcr.io/razorpay-buildathon/recoveros:latest
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - DB_URL=postgresql+asyncpg://user:pass@db:5432/recoveros
      - RAZORPAY_KEY_ID=\${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=\${RAZORPAY_KEY_SECRET}
      - WHATSAPP_BUSINESS_TOKEN=\${WHATSAPP_TOKEN}
    restart: always`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Interactive ROI & Revenue Impact Calculator */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
          <Calculator className="w-4 h-4 text-cyan-400" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Interactive Enterprise ROI & Revenue Impact Calculator</h2>
            <p className="text-xs text-slate-400 mt-0.5">Model recovered revenue and merchant margin gain with RecoverOS.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sliders on Left 6 Cols */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Monthly Gross Transaction Volume (GMV)</span>
                <span className="text-cyan-400 font-mono font-bold tabular-nums">
                  {monthlyGmvLakhs >= 100 ? `₹${(monthlyGmvLakhs / 100).toFixed(1)} Crores` : `₹${monthlyGmvLakhs} Lakhs`}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={monthlyGmvLakhs}
                onChange={(e) => setMonthlyGmvLakhs(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>₹10 Lakhs</span>
                <span>₹1 Crore</span>
                <span>₹10 Crores</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Checkout Failure / Abandonment Rate</span>
                <span className="text-amber-400 font-mono font-bold tabular-nums">{failureRatePct}%</span>
              </div>
              <input
                type="range"
                min={8}
                max={35}
                step={1}
                value={failureRatePct}
                onChange={(e) => setFailureRatePct(Number(e.target.value))}
                className="w-full accent-amber-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>8% (Low Friction)</span>
                <span>18% (Avg)</span>
                <span>35% (High Drop)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Merchant Gross Margin Rate</span>
                <span className="text-emerald-400 font-mono font-bold tabular-nums">{merchantMarginPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={merchantMarginPct}
                onChange={(e) => setMerchantMarginPct(Number(e.target.value))}
                className="w-full accent-emerald-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>10% Low Margin</span>
                <span>25% Standard D2C</span>
                <span>60% SaaS</span>
              </div>
            </div>
          </div>

          {/* Output Cards on Right 6 Cols */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Monthly Revenue at Risk</span>
              <div className="text-xl font-bold text-amber-400 font-mono tabular-nums">
                ₹{Math.round(monthlyRevenueAtRiskInr).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 block">Total dropped or failed payments</span>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/15 border border-cyan-500/25 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">Recoverable Potential (81.2%)</span>
              <div className="text-xl font-bold text-cyan-400 font-mono tabular-nums">
                ₹{Math.round(recoverableRevenueInr).toLocaleString()}
              </div>
              <span className="text-[10px] text-cyan-300/70 block">Addressable with AI NBA policy</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/25 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">Net Captured Revenue</span>
              <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
                +₹{Math.round(recoveredRevenueInr).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-300/70 block">Consistently recovered / month</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wider block">Net Bottom-Line Profit</span>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                +₹{Math.round(incrementalProfitInr).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 block">Margin-protected cash gain</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Step Company Rollout Playbook */}
      <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Recommended 3-Step Company Rollout Roadmap</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-mono">
              Day 1–3: Shadow Mode
            </span>
            <h3 className="font-bold text-white text-sm">Passive Ingestion & Profiling</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Forward webhooks in shadow mode without executing customer messages. The model benchmarks your failure rates, customer archetypes, and expected recovery value (ERV).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-mono">
              Day 4–7: High-Intent Pilot
            </span>
            <h3 className="font-bold text-white text-sm">Deterministic Policy Activation</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Turn on automated recovery for high-intent failures (HDFC bank downtime spikes & OTP drops) with strict duplicate payment and DND suppression guards enabled.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono">
              Day 8+: Autonomous Scale
            </span>
            <h3 className="font-bold text-white text-sm">Full Multi-Channel Orchestration</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Enable real-time in-app AI Concierge voice guidance, WhatsApp 1-tap UPI deep-links, and bounded 5% discounts for chronic deal-hunting abandoners.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
