import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The card is the primary raised surface of the interface. Three details do
 * heavy lifting:
 *   • a top-to-bottom gradient (light falls from above)
 *   • a 1px inner highlight along the top edge (the bevel)
 *   • a layered shadow beneath
 * Together they make a dark panel read as a raised physical object instead of
 * a darker hole punched in the background.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-hairline text-card-foreground",
        "bg-gradient-to-b from-surface-2/70 to-surface/60",
        "shadow-lg backdrop-blur-[2px]",
        className
      )}
      {...props}
    />
  );
}

/** Card with a hairline gilt top edge — used for hero/feature panels. */
export function CardGilt({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gold/25 text-card-foreground",
        "bg-gradient-to-b from-surface-2/80 to-surface/60",
        "shadow-xl backdrop-blur-[2px]",
        "before:absolute before:inset-x-0 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-gold/60 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("type-display-sm text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-ui leading-relaxed text-ink-muted", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 p-5 pt-0", className)} {...props} />;
}
