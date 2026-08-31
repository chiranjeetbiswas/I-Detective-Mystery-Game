import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Small state markers. Every variant keeps a visible text label — colour is
 * never the only carrier of meaning, so these stay readable for colour-blind
 * players and in screenshots.
 */
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "outline" | "gold" | "danger" | "trust" | "stress" | "info";
}) {
  const styles = {
    default:
      "bg-surface-3/80 text-ink border border-hairline shadow-[inset_0_1px_0_0_hsl(210_40%_100%/0.05)]",
    outline: "border border-hairline-strong/70 text-ink-muted",
    gold:
      "border border-gold/45 bg-gold/12 text-gold-bright shadow-[inset_0_1px_0_0_hsl(45_80%_80%/0.14)]",
    danger: "border border-danger/45 bg-danger/14 text-[hsl(356_80%_78%)]",
    trust: "border border-trust/40 bg-trust/12 text-[hsl(168_50%_70%)]",
    stress: "border border-stress/40 bg-stress/12 text-[hsl(30_80%_74%)]",
    info: "border border-info/40 bg-info/12 text-[hsl(199_70%_78%)]",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
        "font-sans text-micro font-semibold uppercase tracking-[0.09em]",
        styles,
        className
      )}
      {...props}
    />
  );
}
