import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RecoverOS — AI Revenue Recovery Orchestrator | Razorpay Buildathon",
  description: "Next-best-action payment recovery decisioning engine with deterministic policy guards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-[#070b12] text-slate-100 min-h-[100dvh] flex flex-col antialiased selection:bg-cyan-500/20 selection:text-cyan-300`}
      >
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-850 py-5 text-center text-xs text-slate-500 font-mono">
          <span>Razorpay AI Buildathon · Track 03: AI Revenue Recovery · Deterministic Policy & Bounded AI</span>
        </footer>
      </body>
    </html>
  );
}
