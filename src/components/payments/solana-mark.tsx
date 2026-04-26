import { cn } from "@/lib/utils";

/**
 * A minimal monochrome stand-in for the Solana logomark — three sheared bars
 * that alternate direction. Uses `currentColor` so it inherits the text tone.
 * Render it inline inside a paragraph; size via `className`.
 */
export function SolanaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 20"
      fill="currentColor"
      aria-hidden
      className={cn("inline-block", className)}
    >
      <path d="M6 1 L23 1 L18 5 L1 5 Z" />
      <path d="M1 8 L18 8 L23 12 L6 12 Z" />
      <path d="M6 15 L23 15 L18 19 L1 19 Z" />
    </svg>
  );
}
