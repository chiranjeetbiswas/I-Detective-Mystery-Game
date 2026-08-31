"use client";

import { MotionConfig } from "framer-motion";

/**
 * Global motion policy.
 *
 * `reducedMotion="user"` makes every Framer Motion animation in the tree
 * honour the OS-level "reduce motion" preference: transforms and opacity
 * changes are skipped while layout still settles correctly. The CSS side of
 * the same guard lives in `globals.css`.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionConfig>
  );
}
