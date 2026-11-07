import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stipend",
  description: "The money layer for AI agents: every task gets its own wallet, its own budget, and a human who signs anything beyond it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b" style={{ borderColor: "var(--line)" }}>
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold no-underline" style={{ color: "var(--fg)" }}>Stipend</Link>
            <Link href="/">Tasks</Link>
            <Link href="/owner">Owner</Link>
            <Link href="/about">How it works</Link>
            <span className="muted ml-auto">Solana devnet · test money only</span>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
