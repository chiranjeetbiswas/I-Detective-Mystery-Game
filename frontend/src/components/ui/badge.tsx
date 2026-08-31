import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "outline" | "gold" | "danger";
}) {
  const styles = {
    default: "bg-secondary text-secondary-foreground",
    outline: "border border-border text-foreground",
    gold: "bg-primary/15 text-primary border border-primary/40",
    danger: "bg-destructive/15 text-destructive border border-destructive/40",
  }[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles,
        className
      )}
      {...props}
    />
  );
}
