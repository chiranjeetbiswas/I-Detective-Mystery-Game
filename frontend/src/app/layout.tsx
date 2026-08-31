import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

/* ── Display: engraved Roman capitals. Case files, titles, verdicts. ───── */
const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/* ── Prose: spoken dialogue and narration. Elegant, high-contrast. ─────── */
const prose = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-prose",
  display: "swap",
});

/* ── Sans: every piece of interface furniture. ─────────────────────────── */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/* ── Mono: the clock, counters, stat readouts. Tabular figures. ────────── */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Identity Hunt — AI Detective Mystery",
  description:
    "An AI detective game. Look for clues, ask questions, and find the guest who is hiding who they really are.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${display.variable} ${prose.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="noir-grain antialiased">
        <MotionProvider>
          <div className="relative z-10">{children}</div>
        </MotionProvider>
      </body>
    </html>
  );
}
