import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const RESERVED = [
  { handle: "@a",       claimed: true,  by: "claimed" },
  { handle: "@bob",     claimed: true,  by: "claimed" },
  { handle: "@web3",    claimed: true,  by: "claimed" },
  { handle: "@solana",  claimed: false, by: "available" },
  { handle: "@privacy", claimed: false, by: "available" },
  { handle: "@kade",    claimed: false, by: "available" },
  { handle: "@yourname",claimed: false, by: "available" },
];

/**
 * Closing call-to-action. Scarcity framing on short handles (without becoming
 * shouty), the single resting amber CTA per surface convention, and a quiet
 * micro-disclosure beneath. Reads as the magazine's last spread, not the
 * hard-sell.
 */
export function SectionCta() {
  return (
    <section
      id="claim"
      aria-labelledby="cta-headline"
      className="relative scroll-mt-24 py-24 md:py-32"
    >
      {/* A second, intentional candlelight glow — earns its weight here because
          the surface is otherwise empty and the eye needs a focal point. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 35%, oklch(0.82 0.11 72 / 0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-4xl px-6 text-center md:px-10">
        <p className="font-mono tabular text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground">
          § 05 &nbsp;·&nbsp; Claim
        </p>

        <h2
          id="cta-headline"
          className="mt-6 font-serif text-[34px] leading-[1.04] tracking-tight text-foreground sm:text-5xl md:text-[64px]"
        >
          Put your handle{" "}
          <span className="text-primary">in every bio.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl font-serif text-[16.5px] italic leading-relaxed text-muted-foreground/85 md:text-[17.5px]">
          Short handles run out the way short usernames always do. Be early, or
          be lowercase-with-numbers.
        </p>

        {/* Handle reel — playful but not loud. Short claimed ones first, then
            one open invitation. */}
        <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {RESERVED.map((r) => (
            <li
              key={r.handle}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors",
                r.claimed
                  ? "border-border/70 bg-surface-raised/30 text-muted-foreground/70 line-through decoration-1 underline-offset-4"
                  : r.handle === "@yourname"
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-surface-raised/40 text-foreground/85",
              )}
            >
              <span className="font-mono tabular tracking-tight">{r.handle}</span>
              <span
                className={cn(
                  "rounded-sm px-1 py-px font-mono tabular text-[9.5px] uppercase tracking-wider",
                  r.claimed
                    ? "bg-border/40 text-muted-foreground/60"
                    : r.handle === "@yourname"
                      ? "bg-primary/15 text-primary"
                      : "bg-success/10 text-success",
                )}
              >
                {r.by}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/claim"
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "ring-1 ring-primary/30 transition-all",
              "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
              "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
              "active:translate-y-px",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            Claim your handle
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
          <Link
            href="#how"
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border border-border-strong/60 bg-surface-raised/40 px-5 text-[14px] font-medium text-foreground/90 backdrop-blur-sm transition-all hover:border-primary/45 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            See how it works
          </Link>
        </div>

        <p className="mt-12 font-serif text-[13.5px] italic leading-relaxed text-muted-foreground/75">
          One signature. Non-custodial. No email, no KYC.
        </p>
      </div>
    </section>
  );
}
