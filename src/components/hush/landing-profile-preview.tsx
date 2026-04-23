import Link from "next/link";
import { GradientAvatar } from "./gradient-avatar";
import { HandleText } from "./handle-text";

/**
 * A compact, static replica of the real ProfileCard, used as the landing hero's
 * right-column visual. Clicking it routes to the live /@alice page.
 *
 * Every pixel here should match a choice in the real ProfileCard — the preview
 * earns trust by *being* the product, not representing it.
 */
export function LandingProfilePreview() {
  const handle = "@alice";
  const presets = [5, 20, 50];

  return (
    <Link
      href="/@alice"
      aria-label="Open the live @alice profile"
      className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div
        className={[
          "relative rounded-2xl border border-border bg-card p-7",
          "shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_32px_64px_-32px_rgba(0,0,0,0.6)]",
          "transition-all duration-300",
          "group-hover:border-border-strong",
          "group-hover:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_42px_80px_-32px_rgba(240,184,122,0.22),0_0_0_1px_rgba(240,184,122,0.08)]",
        ].join(" ")}
      >
        {/* Candlelight behind the card */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10 blur-3xl opacity-50 transition-opacity group-hover:opacity-80"
          style={{
            background:
              "radial-gradient(55% 42% at 50% 18%, oklch(0.82 0.11 72 / 0.2), transparent 70%)",
          }}
        />

        <div className="flex flex-col items-start gap-4">
          <GradientAvatar handle={handle} size={56} />
          <div className="space-y-1">
            <h3 className="font-serif text-[28px] leading-[1.05] tracking-tight text-foreground">
              Alice Chen
            </h3>
            <HandleText
              handle={handle}
              size="sm"
              className="text-muted-foreground/80"
            />
          </div>
          <p className="max-w-[30ch] text-[13px] leading-relaxed text-muted-foreground">
            Essays on privacy, cryptography, and quiet internet things.
          </p>
        </div>

        <div className="my-6 h-px w-full bg-border" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Pay
            </span>
            <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground/70">
              USDC · Solana
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((p, i) => (
              <span
                key={p}
                aria-hidden
                className={[
                  "flex h-9 items-center justify-center rounded-md border font-mono tabular text-[13px]",
                  i === 1
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-surface-raised/50 text-foreground/90",
                ].join(" ")}
              >
                {p}
              </span>
            ))}
            <span
              aria-hidden
              className="flex h-9 items-center justify-center rounded-md border border-dashed border-border-strong font-mono text-[11px] text-muted-foreground/80"
            >
              Custom
            </span>
          </div>

          <div
            aria-hidden
            className={[
              "flex h-11 items-center justify-center rounded-lg",
              "bg-primary text-primary-foreground text-[13.5px] font-semibold",
              "ring-1 ring-primary/40",
              "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_22px_-10px_rgba(240,184,122,0.5)]",
            ].join(" ")}
          >
            Pay 20 USDC privately
          </div>
        </div>

        {/* Subtle corner glyph — tells the eye this is a handle, not a screenshot */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-5 top-5 font-serif text-sm italic text-muted-foreground/40"
        >
          @
        </span>
      </div>
    </Link>
  );
}
