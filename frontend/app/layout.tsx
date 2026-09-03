import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Revenue Recovery Orchestrator | Razorpay Buildathon",
  description: "Next-best-action payment recovery decisioning engine with deterministic policy guards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
          Razorpay AI Buildathon — Track 03: AI Revenue Recovery · Deterministic Policy & Bounded AI Architecture
        </footer>
      </body>
    </html>
  );
}
