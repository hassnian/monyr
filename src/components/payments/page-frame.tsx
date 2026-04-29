import { cn } from "@/lib/utils";
import { Logomark } from "./logomark";
import Link from "next/link";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Render the amber candlelight glow behind content */
  glow?: boolean;
  /** Show a help link in the top-right corner */
  helpHref?: string;
  /** Custom slot rendered at the top-right of the frame (e.g. wallet button). Appears alongside helpHref if both are provided. */
  topRight?: React.ReactNode;
};

/**
 * The canvas for focused single-purpose pages: public profile, claim flow.
 * - Near-black bg
 * - Grain + optional amber vignette
 * - Minimal top chrome: wordmark left, one optional help link / slot right
 */
export function PageFrame({
  children,
  className,
  glow = false,
  helpHref,
  topRight,
}: Props) {
  const hasTopRight = Boolean(helpHref || topRight);

  return (
    <div className="relative flex min-h-screen flex-col">
      {glow && (
        <div
          aria-hidden
          className="amber-vignette pointer-events-none absolute inset-0"
        />
      )}
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />

      <header className="relative z-30 flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Logomark />
        {hasTopRight && (
          <div className="flex items-center gap-4">
            {helpHref && (
              <Link
                href={helpHref}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Learn how it works
              </Link>
            )}
            {topRight}
          </div>
        )}
      </header>

      <main
        className={cn(
          "relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 md:px-10",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
