import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Stipend",
  description: "The money layer for AI agents: every task gets its own wallet, its own budget, and a human who signs anything beyond it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <header style={{ borderBottom: "1px solid var(--line)", background: "rgba(5,7,5,0.7)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10 }}>
          <nav className="mx-auto flex max-w-5xl items-center gap-7 px-5 py-3.5 text-sm">
            <Link href="/" className="wordmark text-base">Stipend</Link>
            <Link href="/" style={{ color: "var(--fg)" }}>Home</Link>
            <Link href="/owner" style={{ color: "var(--fg)" }}>Owner</Link>
            <Link href="/attack" style={{ color: "var(--fg)" }}>Attack it yourself</Link>
            <Link href="/about" style={{ color: "var(--fg)" }}>How it works</Link>
            <span className="muted ml-auto flex items-center"><span className="pulse" />Solana devnet · test money</span>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-5 py-8 text-xs muted">Built for the MLH Solana Hackathon, November 7 and 8, 2026. Every number on these pages is read from the database and the chain.</footer>
      </body>
    </html>
  );
}
