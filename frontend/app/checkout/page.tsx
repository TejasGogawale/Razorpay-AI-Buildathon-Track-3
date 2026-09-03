"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  CreditCard, Smartphone, Building2, ShieldCheck, 
  AlertTriangle, CheckCircle2, Zap, RefreshCw, 
  Lock, ArrowUpRight, Send, Bot, User, 
  Volume2, VolumeX, QrCode, ExternalLink, Check, Copy, AlertCircle, X
} from "lucide-react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  hinglishText?: string;
  actionButton?: string;
  suggestedAction?: string;
}

// Bank Portal Direct URLs
const NETBANKING_PORTALS: Record<string, { name: string; url: string; logoText: string; accent: string }> = {
  hdfc: {
    name: "HDFC Bank",
    url: "https://netbanking.hdfcbank.com/netbanking/",
    logoText: "HDFC",
    accent: "bg-blue-600/80"
  },
  sbi: {
    name: "State Bank of India",
    url: "https://retail.onlinesbi.sbi/retail/login.htm",
    logoText: "SBI",
    accent: "bg-cyan-600/80"
  },
  icici: {
    name: "ICICI Bank",
    url: "https://infinity.icicibank.com/",
    logoText: "ICICI",
    accent: "bg-amber-600/80"
  },
  axis: {
    name: "Axis Bank",
    url: "https://retail.axisbank.co.in/",
    logoText: "AXIS",
    accent: "bg-rose-700/80"
  },
  kotak: {
    name: "Kotak Mahindra Bank",
    url: "https://netbanking.kotak.com/",
    logoText: "KOTAK",
    accent: "bg-red-600/80"
  },
  pnb: {
    name: "Punjab National Bank",
    url: "https://netbanking.netpnb.com/",
    logoText: "PNB",
    accent: "bg-yellow-600/80"
  }
};

export default function CheckoutGatewayPage() {
  const [amount] = useState(4999);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi" | "netbanking">("card");
  
  // Card Payment States
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [cardholderName, setCardholderName] = useState("Aarav Sharma");
  const [cardNumber, setCardNumber] = useState("4532 8921 4410 8921");
  const [cardExpiry, setCardExpiry] = useState("08/24"); // Defaults to expired to demonstrate natural failure
  const [cardCvv, setCardCvv] = useState("321");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  
  // UPI States
  const [upiTab, setUpiTab] = useState<"qr" | "id">("qr");
  const [upiId, setUpiId] = useState("aarav@okhdfcbank");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiQrTimer, setUpiQrTimer] = useState(890); // seconds remaining

  // Netbanking States
  const [netbankingBank, setNetbankingBank] = useState("hdfc");
  const [showRedirectModal, setShowRedirectModal] = useState(false);

  // Gateway Processing & Failure States
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFailure, setActiveFailure] = useState<{
    code: string;
    reason: string;
    method: string;
    issuer: string;
  } | null>(null);
  const [attributedCaseId, setAttributedCaseId] = useState<string>("case_checkout_live");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  // AI Concierge Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am your AI Payment Assistant. I'm here to ensure your checkout is secure and seamless. If you have any questions about payment methods or encounter any issues, feel free to ask me anytime.",
      hinglishText: "Namaste! Main aapka AI Payment Assistant hoon. Aap bina kisi chinta ke payment poora kar sakte hain. Agar koi bhi sawal ho toh mujhse yahan poochein.",
      actionButton: "Pay with Instant UPI (GPay/PhonePe)"
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const [speakingLanguage, setSpeakingLanguage] = useState<"en" | "hi" | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiThinking]);

  // UPI QR Countdown timer
  useEffect(() => {
    if (upiQrTimer <= 0) return;
    const interval = setInterval(() => setUpiQrTimer((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [upiQrTimer]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
    if (cardErrors.number) setCardErrors((prev) => ({ ...prev, number: "" }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length > 2) raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    setCardExpiry(raw);
    if (cardErrors.expiry) setCardErrors((prev) => ({ ...prev, expiry: "" }));
  };

  const speakVoice = (text: string, lang: "en" | "hi", msgIndex: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-Speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    if (isSpeaking === msgIndex && speakingLanguage === lang) {
      setIsSpeaking(null);
      setSpeakingLanguage(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(msgIndex);
      setSpeakingLanguage(lang);
    };
    utterance.onend = () => {
      setIsSpeaking(null);
      setSpeakingLanguage(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(null);
      setSpeakingLanguage(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      setSpeakingLanguage(null);
    }
  };

  const reportPaymentFailure = async (code: string, reason: string, method: string, issuer: string) => {
    setActiveFailure({ code, reason, method, issuer });
    setIsSuccess(false);

    try {
      const payload = {
        entity: "event",
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: `pay_chk_${Date.now().toString().slice(-6)}`,
              order_id: `order_chk_${Date.now().toString().slice(-6)}`,
              amount: amount * 100,
              currency: "INR",
              status: "failed",
              method: method,
              issuer: issuer,
              contact: "+919876543210",
              error_code: code,
              error_reason: reason,
              error_description: reason
            }
          }
        }
      };

      const webhookRes = await fetch("http://localhost:8000/api/v1/webhooks/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const webhookJson = await webhookRes.json();
      const caseId = webhookJson.case_id || `case_${Date.now().toString().slice(-6)}`;
      setAttributedCaseId(caseId);

      const chatRes = await fetch("http://localhost:8000/api/v1/checkout/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          user_message: `My ${method.toUpperCase()} payment failed with error: ${reason}`,
          order_amount_inr: amount,
          payment_method: method,
          issuer: issuer,
          customer_name: cardholderName,
          chat_history: chatMessages.map((m) => ({ sender: m.sender, text: m.text }))
        })
      });

      const chatJson = await chatRes.json();
      const newAiMsg: ChatMessage = {
        sender: "ai",
        text: chatJson.reply,
        hinglishText: chatJson.hinglish_reply,
        actionButton: chatJson.action_button || "Pay with Instant UPI",
        suggestedAction: chatJson.suggested_action || "SWITCH_TO_UPI"
      };

      setChatMessages((prev) => [...prev, newAiMsg]);
    } catch (e: any) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `Your ${issuer.toUpperCase()} ${method.toUpperCase()} payment was declined: ${reason}. Zero money was debited from your account. You can complete your order smoothly with 1-tap Instant UPI below.`,
          hinglishText: `Aapka ${issuer.toUpperCase()} payment decline ho gaya tha: ${reason}. Koi paise nahi kate hain. Aap Instant UPI se payment poora kar sakte hain.`,
          actionButton: "Pay with Instant UPI (GPay/PhonePe)",
          suggestedAction: "SWITCH_TO_UPI"
        }
      ]);
    }
  };

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const cleanNumber = cardNumber.replace(/\s/g, "");

    if (cleanNumber.length < 15) {
      errors.number = "Please enter a valid 16-digit card number.";
    } else if (cleanNumber.startsWith("0000")) {
      errors.number = "This card number is invalid or blocked by the issuer.";
    }

    if (!cardExpiry || !cardExpiry.includes("/")) {
      errors.expiry = "Enter expiry in MM/YY format.";
    } else {
      const [expMonth, expYear] = cardExpiry.split("/").map((v) => parseInt(v.trim(), 10));
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;

      if (!expMonth || expMonth < 1 || expMonth > 12) {
        errors.expiry = "Invalid month (01-12).";
      } else if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        errors.expiry = `Card expired on ${cardExpiry}. Expiry date must be in the future.`;
      }
    }

    if (!cardCvv || cardCvv.length < 3) {
      errors.cvv = "Enter 3-digit CVV.";
    }

    if (Object.keys(errors).length > 0) {
      setCardErrors(errors);
      
      if (errors.expiry && errors.expiry.includes("expired")) {
        setIsProcessing(true);
        setTimeout(() => {
          setIsProcessing(false);
          reportPaymentFailure(
            "CARD_EXPIRED",
            `Card expiry date (${cardExpiry}) has passed. Transaction rejected by issuer.`,
            "card",
            selectedBank
          );
        }, 800);
      }
      return;
    }

    setCardErrors({});
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);

      if (cleanNumber.endsWith("0002")) {
        reportPaymentFailure("INSUFFICIENT_FUNDS", "Insufficient funds or credit limit exceeded on card.", "card", selectedBank);
      } else if (cleanNumber.endsWith("0005") || (selectedBank === "hdfc" && cleanNumber.startsWith("4532"))) {
        reportPaymentFailure(
          "ISSUER_TECHNICAL_ERROR",
          "HDFC Bank core banking system timed out during 3D Secure authorization hold.",
          "card",
          "hdfc"
        );
      } else {
        setShowOtpModal(true);
      }
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === "000000" || otpInput === "9999") {
      setShowOtpModal(false);
      reportPaymentFailure("OTP_INCORRECT", "Incorrect OTP entered by customer. Authorization declined.", "card", selectedBank);
      return;
    }

    setShowOtpModal(false);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setActiveFailure(null);
    }, 1000);
  };

  const handleUpiPay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setActiveFailure(null);
    }, 1200);
  };

  const handleNetbankingSelect = (bankKey: string) => {
    setNetbankingBank(bankKey);
  };

  const handleOpenBankPortal = () => {
    const portal = NETBANKING_PORTALS[netbankingBank];
    if (portal?.url) {
      window.open(portal.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSendMessage = async (userQueryText?: string) => {
    const queryToSend = userQueryText || inputQuery;
    if (!queryToSend.trim()) return;

    const newHistory: ChatMessage[] = [
      ...chatMessages,
      { sender: "user", text: queryToSend }
    ];
    setChatMessages(newHistory);
    setInputQuery("");
    setIsAiThinking(true);

    try {
      const chatRes = await fetch("http://localhost:8000/api/v1/checkout/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: attributedCaseId,
          user_message: queryToSend,
          order_amount_inr: amount,
          payment_method: selectedMethod,
          issuer: selectedMethod === "netbanking" ? netbankingBank : selectedBank,
          customer_name: cardholderName,
          chat_history: newHistory.map((m) => ({ sender: m.sender, text: m.text }))
        })
      });

      const chatJson = await chatRes.json();
      setChatMessages([
        ...newHistory,
        {
          sender: "ai",
          text: chatJson.reply,
          hinglishText: chatJson.hinglish_reply || chatJson.reply,
          actionButton: chatJson.action_button || "Pay with Instant UPI",
          suggestedAction: chatJson.suggested_action || "SWITCH_TO_UPI"
        }
      ]);
    } catch (e: any) {
      setChatMessages([
        ...newHistory,
        {
          sender: "ai",
          text: `UPI Universal is currently running smoothly at 96% success rate and is 100% safe. You can switch to Instant UPI to complete your order without any card friction.`,
          hinglishText: `UPI Universal abhi 96% success ke sath bilkul theek chal raha hai. Aap bina kisi pareshani ke Instant UPI se payment poora kar sakte hain.`,
          actionButton: "Pay with Instant UPI (GPay/PhonePe)",
          suggestedAction: "SWITCH_TO_UPI"
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleActionClick = (suggestedAction?: string) => {
    stopVoice();
    setSelectedMethod("upi");
    setUpiTab("qr");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-14">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Interactive Terminal
            </span>
            <span className="text-xs text-slate-400 font-mono">256-Bit Encrypted Secure Checkout</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            Payment Gateway & Autonomous Concierge
          </h1>
          <p className="text-xs text-slate-400 max-w-[65ch] mt-0.5 leading-relaxed">
            Complete payment with Cards, Instant UPI QR, or Netbanking with real-time autonomous assistance.
          </p>
        </div>
      </div>

      {/* Main Grid: Left = Payment Terminal | Right = Live AI Concierge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 6 Cols: Payment Methods Form */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            
            {/* Order Summary Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Order #ORD-98421</span>
                <h2 className="text-sm font-bold text-white">Annual Pro Subscription</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Amount</span>
                <span className="text-xl font-bold text-cyan-400 font-mono tabular-nums">₹{amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider block">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "card", label: "Cards", icon: CreditCard },
                  { id: "upi", label: "Instant UPI (QR)", icon: Smartphone },
                  { id: "netbanking", label: "Netbanking", icon: Building2 },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(m.id as any);
                        setCardErrors({});
                      }}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1.5 active:scale-[0.98] ${
                        active
                          ? "bg-slate-900 border-cyan-500/60 text-white shadow-sm ring-1 ring-cyan-500/20"
                          : "bg-slate-950/80 border-slate-850 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                      <span className="text-[11px] font-semibold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Failure Banner */}
            {activeFailure && (
              <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/30 text-rose-200 text-xs flex items-start space-x-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-rose-300 block text-xs">Payment Authorization Declined</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{activeFailure.reason}</p>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {isSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-1.5 animate-fadeIn">
                <div className="flex items-center space-x-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Payment Captured Successfully</span>
                </div>
                <p className="text-slate-300 text-[11px] font-mono">
                  Receipt #RCPT-{Date.now().toString().slice(-6)} generated and verified.
                </p>
              </div>
            )}

            {/* ================= METHOD 1: CARDS ================= */}
            {selectedMethod === "card" && !isSuccess && (
              <form onSubmit={handleCardPayment} className="space-y-3.5 animate-fadeIn">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium text-[11px]">Issuing Bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                    >
                      <option value="hdfc">HDFC Bank (Visa / Mastercard)</option>
                      <option value="sbi">State Bank of India (SBI)</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="axis">Axis Bank</option>
                      <option value="kotak">Kotak Mahindra Bank</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium text-[11px]">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Name on card"
                      className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400 font-medium text-[11px]">Card Number</label>
                      <span className="text-[10px] text-slate-500 font-mono">16 Digits</span>
                    </div>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4532 •••• •••• ••••"
                      className={`w-full bg-[#090d16] border rounded-lg px-3 py-2 text-white font-mono tabular-nums focus:outline-none ${
                        cardErrors.number ? "border-rose-500 text-rose-300" : "border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                      }`}
                    />
                    {cardErrors.number && (
                      <p className="text-rose-400 text-[11px] mt-1 font-medium">{cardErrors.number}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium text-[11px]">Expiry Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        maxLength={5}
                        className={`w-full bg-[#090d16] border rounded-lg px-3 py-2 text-white font-mono tabular-nums focus:outline-none ${
                          cardErrors.expiry ? "border-rose-500 text-rose-300" : "border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                        }`}
                      />
                      {cardErrors.expiry && (
                        <p className="text-rose-400 text-[11px] mt-1 font-medium">{cardErrors.expiry}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium text-[11px]">CVV / CVC</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => {
                          setCardCvv(e.target.value.slice(0, 4));
                          if (cardErrors.cvv) setCardErrors((prev) => ({ ...prev, cvv: "" }));
                        }}
                        placeholder="•••"
                        maxLength={4}
                        className={`w-full bg-[#090d16] border rounded-lg px-3 py-2 text-white font-mono focus:outline-none ${
                          cardErrors.cvv ? "border-rose-500 text-rose-300" : "border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                        }`}
                      />
                      {cardErrors.cvv && (
                        <p className="text-rose-400 text-[11px] mt-1 font-medium">{cardErrors.cvv}</p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-sm transition active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isProcessing ? "Authorizing with Switch..." : `Pay ₹${amount.toLocaleString()} Securely`}</span>
                </button>
              </form>
            )}

            {/* ================= METHOD 2: INSTANT UPI WITH QR ================= */}
            {selectedMethod === "upi" && !isSuccess && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setUpiTab("qr")}
                    className={`flex-1 py-1.5 rounded-md font-medium transition flex items-center justify-center space-x-1.5 active:scale-[0.98] ${
                      upiTab === "qr" ? "bg-slate-900 text-cyan-300 border border-slate-750 shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan UPI QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiTab("id")}
                    className={`flex-1 py-1.5 rounded-md font-medium transition flex items-center justify-center space-x-1.5 active:scale-[0.98] ${
                      upiTab === "id" ? "bg-slate-900 text-cyan-300 border border-slate-750 shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Pay via UPI ID</span>
                  </button>
                </div>

                {upiTab === "qr" && (
                  <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3.5">
                    <div className="p-3 bg-white rounded-xl shadow-md flex flex-col items-center">
                      <svg
                        className="w-44 h-44"
                        viewBox="0 0 200 200"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="200" height="200" fill="#ffffff" />
                        <rect x="15" y="15" width="45" height="45" fill="#000000" rx="4" />
                        <rect x="23" y="23" width="29" height="29" fill="#ffffff" rx="2" />
                        <rect x="29" y="29" width="17" height="17" fill="#000000" rx="2" />

                        <rect x="140" y="15" width="45" height="45" fill="#000000" rx="4" />
                        <rect x="148" y="23" width="29" height="29" fill="#ffffff" rx="2" />
                        <rect x="154" y="29" width="17" height="17" fill="#000000" rx="2" />

                        <rect x="15" y="140" width="45" height="45" fill="#000000" rx="4" />
                        <rect x="23" y="148" width="29" height="29" fill="#ffffff" rx="2" />
                        <rect x="29" y="154" width="17" height="17" fill="#000000" rx="2" />

                        <rect x="70" y="20" width="12" height="12" fill="#000000" />
                        <rect x="90" y="20" width="12" height="12" fill="#000000" />
                        <rect x="110" y="20" width="12" height="12" fill="#000000" />
                        <rect x="70" y="40" width="25" height="12" fill="#000000" />
                        <rect x="105" y="40" width="15" height="12" fill="#000000" />

                        <rect x="20" y="70" width="12" height="20" fill="#000000" />
                        <rect x="40" y="75" width="20" height="12" fill="#000000" />
                        <rect x="70" y="70" width="60" height="12" fill="#000000" />
                        <rect x="140" y="70" width="15" height="20" fill="#000000" />
                        <rect x="165" y="75" width="20" height="12" fill="#000000" />

                        <rect x="75" y="88" width="50" height="24" fill="#00baf2" rx="4" />
                        <text x="100" y="104" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">UPI Pay</text>

                        <rect x="20" y="105" width="30" height="12" fill="#000000" />
                        <rect x="150" y="105" width="35" height="12" fill="#000000" />
                        <rect x="70" y="120" width="20" height="15" fill="#000000" />
                        <rect x="100" y="120" width="25" height="15" fill="#000000" />

                        <rect x="70" y="145" width="12" height="35" fill="#000000" />
                        <rect x="90" y="150" width="25" height="12" fill="#000000" />
                        <rect x="125" y="145" width="15" height="35" fill="#000000" />
                        <rect x="150" y="150" width="35" height="15" fill="#000000" />
                      </svg>
                      <span className="text-[10px] font-bold text-slate-800 mt-1 uppercase tracking-wider font-mono">
                        Scan with any UPI App
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center space-x-2 text-xs font-mono">
                        <span className="text-slate-400">VPA: <strong className="text-cyan-400">recoveros@razorpay</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("recoveros@razorpay");
                            setCopiedUpi(true);
                            setTimeout(() => setCopiedUpi(false), 2000);
                          }}
                          className="p-1 text-slate-400 hover:text-white active:scale-[0.98]"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Expires in {Math.floor(upiQrTimer / 60)}:{(upiQrTimer % 60).toString().padStart(2, "0")} min
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleUpiPay}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition active:scale-[0.98] flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isProcessing ? "Confirming UPI Capture..." : `Simulate Scanned & Paid (₹${amount.toLocaleString()})`}</span>
                    </button>
                  </div>
                )}

                {upiTab === "id" && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1.5 font-medium text-[11px]">Select UPI App</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: "gpay", name: "GPay" },
                          { id: "phonepe", name: "PhonePe" },
                          { id: "paytm", name: "Paytm" },
                          { id: "cred", name: "CRED" },
                        ].map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedUpiApp(app.id)}
                            className={`p-2 rounded-lg text-center font-semibold text-[11px] border transition active:scale-[0.98] ${
                              selectedUpiApp === app.id
                                ? "bg-slate-900 border-cyan-500 text-cyan-300"
                                : "bg-[#090d16] border-slate-850 text-slate-400 hover:text-white"
                            }`}
                          >
                            {app.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium text-[11px]">UPI ID / VPA</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleUpiPay}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition active:scale-[0.98] flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isProcessing ? "Waiting for Approval..." : `Request on ${selectedUpiApp.toUpperCase()}`}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================= METHOD 3: NETBANKING ================= */}
            {selectedMethod === "netbanking" && !isSuccess && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-2 font-medium text-[11px]">Select Bank for Netbanking</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(NETBANKING_PORTALS).map(([key, bank]) => {
                        const active = netbankingBank === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleNetbankingSelect(key)}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 active:scale-[0.98] ${
                              active
                                ? "bg-slate-900 border-cyan-500/60 text-white shadow-sm ring-1 ring-cyan-500/20"
                                : "bg-[#090d16] border-slate-850 text-slate-300 hover:border-slate-750"
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-lg ${bank.accent} text-white font-bold text-[10px] flex items-center justify-center font-mono`}>
                              {bank.logoText}
                            </span>
                            <span className="text-[11px] font-medium leading-tight">{bank.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">
                        Selected: <strong className="text-white">{NETBANKING_PORTALS[netbankingBank]?.name}</strong>
                      </span>
                      <a
                        href={NETBANKING_PORTALS[netbankingBank]?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-medium text-[11px] flex items-center space-x-1"
                      >
                        <span>Portal Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      You will be securely redirected to {NETBANKING_PORTALS[netbankingBank]?.name} authentication gateway.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRedirectModal(true)}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition active:scale-[0.98] flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Proceed to {NETBANKING_PORTALS[netbankingBank]?.name} Netbanking</span>
                  </button>
                </div>
              </div>
            )}

            {isSuccess && (
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setActiveFailure(null);
                  setCardErrors({});
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition active:scale-[0.98]"
              >
                Reset & Test Another Payment
              </button>
            )}
          </div>
        </div>

        {/* Right 6 Cols: AI Recovery Concierge */}
        <div className="lg:col-span-6 bg-[#090d16] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between h-[640px] relative overflow-hidden">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>AI Recovery Concierge</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Bilingual English & Hinglish Voice</span>
              </div>
            </div>

            <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Active Terminal
            </span>
          </div>

          {/* Active Error Notice */}
          {activeFailure && (
            <div className="mt-2 py-1.5 px-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fadeIn">
              <span className="flex items-center space-x-1.5 text-[11px] font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Interruption: {activeFailure.code}</span>
              </span>
              <span className="text-[10px] text-rose-400 font-mono uppercase">{activeFailure.issuer}</span>
            </div>
          )}

          {/* Chat Thread */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`max-w-[88%] rounded-xl p-3.5 text-xs space-y-2 ${
                    msg.sender === "user"
                      ? "bg-slate-850 text-white border border-slate-750"
                      : "bg-slate-950 border border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 font-mono">
                    <div className="flex items-center space-x-1.5">
                      {msg.sender === "user" ? (
                        <>
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{cardholderName}</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-400">Concierge</span>
                        </>
                      )}
                    </div>

                    {msg.sender === "ai" && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => speakVoice(msg.text, "en", idx)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition active:scale-[0.98] ${
                            isSpeaking === idx && speakingLanguage === "en"
                              ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300"
                          }`}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => speakVoice(msg.hinglishText || msg.text, "hi", idx)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition active:scale-[0.98] ${
                            isSpeaking === idx && speakingLanguage === "hi"
                              ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300"
                          }`}
                        >
                          Hinglish
                        </button>
                        {isSpeaking === idx && (
                          <button
                            type="button"
                            onClick={stopVoice}
                            className="p-0.5 text-rose-400 hover:text-rose-300"
                            title="Stop Voice"
                          >
                            <VolumeX className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {msg.sender === "ai" && msg.hinglishText && (
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] text-amber-200/90 italic">
                      <span className="text-[9px] font-mono font-bold uppercase text-amber-400 not-italic block mb-0.5">
                        Hinglish Guidance
                      </span>
                      "{msg.hinglishText}"
                    </div>
                  )}

                  {msg.actionButton && selectedMethod !== "upi" && !isSuccess && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleActionClick(msg.suggestedAction)}
                        className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition active:scale-[0.98] flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{msg.actionButton}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-cyan-400 flex items-center space-x-2 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating recovery policy...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Frequently Asked Question Chips */}
          <div className="pt-2 pb-2 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar border-t border-slate-800">
            {[
              "Will I get charged twice if I retry?",
              "Can I pay with Google Pay or UPI instead?",
              "Which payment methods are working right now?",
              "Why did my card payment fail?",
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={isAiThinking}
                className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 whitespace-nowrap transition text-[10px] font-medium active:scale-[0.98]"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Text Input Box */}
          <div className="pt-1.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask the AI Concierge anything..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isAiThinking}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isAiThinking}
                className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition disabled:opacity-50 active:scale-[0.98]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3D Secure OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">3D Secure Authorization</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  reportPaymentFailure("OTP_CANCELLED", "Customer cancelled 3D Secure authentication window.", "card", selectedBank);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
              <span className="text-slate-400 block">Bank: <strong className="text-white uppercase">{selectedBank} Bank</strong></span>
              <span className="text-slate-400 block">Amount: <strong className="text-cyan-400">₹{amount.toLocaleString()}</strong></span>
              <span className="text-slate-400 block">Sent to mobile ending in: <strong className="text-slate-300">•••• 3210</strong></span>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Enter 6-Digit One Time Password (OTP)</label>
                <input
                  type="text"
                  placeholder="Enter OTP (e.g. 123456)"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-base font-mono tracking-widest text-white focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
                <span className="text-[10px] text-slate-500 mt-1 block text-center font-mono">
                  Tip: Enter any 6 digits to succeed, or 000000 to test incorrect OTP decline.
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    reportPaymentFailure("OTP_TIMEOUT", "Customer 3D Secure session expired before OTP submission.", "card", selectedBank);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-medium active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!otpInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-50 active:scale-[0.98]"
                >
                  Submit OTP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Netbanking Bank Redirect Modal */}
      {showRedirectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Redirecting to {NETBANKING_PORTALS[netbankingBank]?.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRedirectModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Connecting to the official retail portal of <strong className="text-white">{NETBANKING_PORTALS[netbankingBank]?.name}</strong> to authorize ₹{amount.toLocaleString()}.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-1">
              <span className="text-slate-400 block font-mono text-[10px]">Destination URL:</span>
              <a
                href={NETBANKING_PORTALS[netbankingBank]?.url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline font-mono break-all inline-flex items-center"
              >
                {NETBANKING_PORTALS[netbankingBank]?.url}
                <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
              </a>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleOpenBankPortal}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open {NETBANKING_PORTALS[netbankingBank]?.name} in New Tab</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRedirectModal(false);
                  setIsProcessing(true);
                  setTimeout(() => {
                    setIsProcessing(false);
                    setIsSuccess(true);
                    setActiveFailure(null);
                  }, 1200);
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-medium text-xs border border-slate-800 transition active:scale-[0.98]"
              >
                Simulate Successful Bank Authorization
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRedirectModal(false);
                  reportPaymentFailure(
                    "NETBANKING_AUTH_FAILED",
                    `Customer session on ${NETBANKING_PORTALS[netbankingBank]?.name} was cancelled or connection timed out.`,
                    "netbanking",
                    netbankingBank
                  );
                }}
                className="w-full py-1.5 px-4 rounded-xl text-slate-500 hover:text-rose-400 text-[11px] transition"
              >
                Simulate Cancelled / Interrupted Bank Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
