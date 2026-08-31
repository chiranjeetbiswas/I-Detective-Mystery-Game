import type { Config } from "tailwindcss";

/** Wraps a bare HSL triplet variable so opacity modifiers keep working
 *  (e.g. `bg-gold/30` → `hsl(var(--gold) / 0.3)`). */
const hsl = (v: string) => `hsl(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── shadcn-compatible aliases (consumed by existing components) ── */
        border: hsl("--border"),
        input: hsl("--input"),
        ring: hsl("--ring"),
        background: hsl("--background"),
        foreground: hsl("--foreground"),
        primary: {
          DEFAULT: hsl("--primary"),
          foreground: hsl("--primary-foreground"),
        },
        secondary: {
          DEFAULT: hsl("--secondary"),
          foreground: hsl("--secondary-foreground"),
        },
        muted: {
          DEFAULT: hsl("--muted"),
          foreground: hsl("--muted-foreground"),
        },
        accent: {
          DEFAULT: hsl("--accent"),
          foreground: hsl("--accent-foreground"),
        },
        card: {
          DEFAULT: hsl("--card"),
          foreground: hsl("--card-foreground"),
        },
        destructive: {
          DEFAULT: hsl("--destructive"),
          foreground: hsl("--destructive-foreground"),
        },

        /* ── Layered navy/slate surfaces ── */
        canvas: hsl("--bg"),
        elevated: hsl("--bg-elevated"),
        surface: {
          DEFAULT: hsl("--surface"),
          2: hsl("--surface-2"),
          3: hsl("--surface-3"),
        },
        hairline: {
          DEFAULT: hsl("--border"),
          strong: hsl("--border-strong"),
        },

        /* ── Ink ── */
        ink: {
          DEFAULT: hsl("--fg"),
          muted: hsl("--fg-muted"),
          subtle: hsl("--fg-subtle"),
        },

        /* ── Antique gold ── */
        gold: {
          DEFAULT: hsl("--gold"),
          bright: hsl("--gold-bright"),
          deep: hsl("--gold-deep"),
        },

        /* ── Semantic accents ── */
        trust: hsl("--trust"),
        stress: hsl("--stress"),
        suspicion: hsl("--suspicion"),
        danger: hsl("--danger"),
        info: hsl("--info"),
      },

      fontFamily: {
        /* Inter — all interface furniture */
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        /* Cinzel — engraved display type */
        display: ["var(--font-display)", "Georgia", "serif"],
        /* Cormorant Garamond — spoken dialogue and narration */
        prose: ["var(--font-prose)", "Georgia", "serif"],
        /* kept as an alias so pre-existing `font-serif` usages stay elegant */
        serif: ["var(--font-prose)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1.35", letterSpacing: "0.06em" }],
        label: ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.1em" }],
        ui: ["0.875rem", { lineHeight: "1.5" }],
        body: ["0.9375rem", { lineHeight: "1.6" }],
        dialogue: ["1.0625rem", { lineHeight: "1.62" }],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        bevel: "var(--bevel)",
        gold: "var(--glow-gold)",
        "inner-top": "inset 0 1px 0 0 hsl(210 40% 100% / 0.06)",
      },

      backgroundImage: {
        "gold-sheen":
          "linear-gradient(168deg, hsl(var(--gold-bright)) 0%, hsl(var(--gold)) 42%, hsl(var(--gold-deep)) 100%)",
        "surface-sheen":
          "linear-gradient(to bottom, hsl(var(--surface-2) / 0.7), hsl(var(--surface) / 0.55))",
      },

      transitionTimingFunction: {
        /* Standard easing for entrances — decelerating, filmic. */
        cine: "cubic-bezier(0.22, 1, 0.36, 1)",
        /* For elements leaving or collapsing. */
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        /* Slow gold breath for the active suspect. */
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--gold) / 0.35)" },
          "50%": { boxShadow: "0 0 0 10px hsl(var(--gold) / 0)" },
        },
        /* Portrait idle: an almost imperceptible breath. */
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.008)" },
        },
        /* Gilt highlight travelling across a title once on mount. */
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        /* Thinking dots in place of a spinner. */
        "dot-bob": {
          "0%, 80%, 100%": { opacity: "0.25", transform: "translateY(0)" },
          "40%": { opacity: "1", transform: "translateY(-3px)" },
        },
        /* Meter fills sweep once when they mount. */
        "meter-sweep": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
      },

      animation: {
        "fade-in": "fade-in 0.42s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in-scale": "fade-in-scale 0.36s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-gold": "pulse-gold 2.6s ease-out infinite",
        breathe: "breathe 5.5s ease-in-out infinite",
        shimmer: "shimmer 2.4s ease-in-out 1",
        "dot-bob": "dot-bob 1.3s ease-in-out infinite",
        "meter-sweep": "meter-sweep 1.6s cubic-bezier(0.22,1,0.36,1) 1",
      },
    },
  },
  plugins: [],
};

export default config;
