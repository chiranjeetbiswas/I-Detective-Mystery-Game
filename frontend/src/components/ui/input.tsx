import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The field reads as pressed *into* the surface (inset shadow, darker fill)
 * which is the opposite of the button's raised treatment. On focus a gold
 * halo blooms outward — the same accent used for the active suspect, so the
 * player learns one colour means "this is where your attention is".
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-md border border-hairline/90 bg-canvas/70 px-3.5 py-2",
      "font-sans text-body text-ink",
      "shadow-[inset_0_2px_6px_hsl(222_60%_2%/0.55)]",
      "placeholder:text-ink-subtle/85",
      "transition-[border-color,box-shadow,background-color] duration-200 ease-cine",
      "hover:border-hairline-strong/80",
      "focus-visible:border-gold/60 focus-visible:outline-none",
      "focus-visible:bg-canvas/85",
      "focus-visible:shadow-[inset_0_2px_6px_hsl(222_60%_2%/0.5),0_0_0_3px_hsl(43_52%_60%/0.16)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
