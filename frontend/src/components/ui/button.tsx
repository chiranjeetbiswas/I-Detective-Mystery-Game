import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Buttons are physical objects here: a gradient fill, a 1px top bevel, and a
 * shadow that deepens on hover and collapses on press. The translate-y on
 * hover/active is what sells the elevation — it reads as the button actually
 * lifting toward the cursor and being pushed back down.
 */
const buttonVariants = cva(
  [
    "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-sans font-semibold tracking-[0.01em]",
    "transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-cine",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:pointer-events-none disabled:opacity-45 disabled:saturate-50",
    "active:translate-y-[1px]",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Gilt — the primary call to action. */
        default: [
          "bg-gold-sheen text-[hsl(222_47%_8%)]",
          "shadow-[0_2px_8px_-2px_hsl(43_52%_30%/0.6),inset_0_1px_0_0_hsl(45_80%_88%/0.5)]",
          "hover:-translate-y-[1px] hover:brightness-[1.08]",
          "hover:shadow-[0_8px_20px_-6px_hsl(43_60%_40%/0.7),inset_0_1px_0_0_hsl(45_80%_90%/0.6)]",
          "active:shadow-[0_1px_3px_-1px_hsl(43_52%_25%/0.7),inset_0_1px_0_0_hsl(45_80%_85%/0.4)]",
        ].join(" "),
        /* alias so `variant="gold"` keeps working wherever it is used */
        gold: [
          "bg-gold-sheen text-[hsl(222_47%_8%)]",
          "shadow-[0_2px_8px_-2px_hsl(43_52%_30%/0.6),inset_0_1px_0_0_hsl(45_80%_88%/0.5)]",
          "hover:-translate-y-[1px] hover:brightness-[1.08]",
          "hover:shadow-[0_8px_20px_-6px_hsl(43_60%_40%/0.7),inset_0_1px_0_0_hsl(45_80%_90%/0.6)]",
        ].join(" "),
        destructive: [
          "bg-gradient-to-b from-[hsl(356_64%_50%)] to-[hsl(356_70%_38%)] text-white",
          "shadow-[0_2px_8px_-2px_hsl(356_70%_25%/0.7),inset_0_1px_0_0_hsl(356_80%_72%/0.35)]",
          "hover:-translate-y-[1px] hover:brightness-[1.09]",
          "hover:shadow-[0_8px_20px_-6px_hsl(356_70%_30%/0.75),inset_0_1px_0_0_hsl(356_80%_74%/0.4)]",
        ].join(" "),
        danger: [
          "bg-gradient-to-b from-[hsl(356_64%_50%)] to-[hsl(356_70%_38%)] text-white",
          "shadow-[0_2px_8px_-2px_hsl(356_70%_25%/0.7),inset_0_1px_0_0_hsl(356_80%_72%/0.35)]",
          "hover:-translate-y-[1px] hover:brightness-[1.09]",
        ].join(" "),
        /* Engraved outline — secondary actions. */
        outline: [
          "border border-hairline-strong/70 bg-surface-2/40 text-ink",
          "shadow-[inset_0_1px_0_0_hsl(210_40%_100%/0.05)]",
          "hover:-translate-y-[1px] hover:border-gold/55 hover:bg-surface-3/60 hover:text-gold",
          "hover:shadow-[0_6px_16px_-8px_hsl(222_60%_2%/0.8),inset_0_1px_0_0_hsl(210_40%_100%/0.07)]",
        ].join(" "),
        secondary: [
          "bg-gradient-to-b from-surface-3 to-surface-2 text-ink border border-hairline",
          "shadow-[0_2px_6px_-2px_hsl(222_60%_2%/0.6),inset_0_1px_0_0_hsl(210_40%_100%/0.06)]",
          "hover:-translate-y-[1px] hover:from-surface-3 hover:to-surface-3 hover:text-gold-bright",
        ].join(" "),
        /* Bare — tertiary, for chrome. */
        ghost: [
          "text-ink-muted",
          "hover:bg-surface-2/70 hover:text-gold",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 text-ui",
        sm: "h-8 rounded-sm px-3 text-micro uppercase tracking-[0.09em]",
        md: "h-10 px-4 text-ui",
        lg: "h-12 px-7 text-body",
        xl: "h-14 px-9 text-[1.0625rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
