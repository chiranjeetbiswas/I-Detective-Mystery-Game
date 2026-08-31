import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="noir-grain antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
