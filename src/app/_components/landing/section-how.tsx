import { APP_DOMAIN } from "@/lib/brand";

import { KeyRound, Wallet2, Share2 } from "lucide-react";

import { SectionFrame } from "./section-frame";

const STEPS = [
  {
    n: "01",
    title: "Connect a wallet",
    detail: "Phantom, Solflare, Backpack. Anything that speaks Wallet Standard.",
    icon: <Wallet2 className="size-4" strokeWidth={2} />,
  },
  {
    n: "02",
    title: "Pick your handle, sign once",
    detail:
      "One signature derives an encryption key in your browser. That key locks a fresh vault only you can open.",
    icon: <KeyRound className="size-4" strokeWidth={2} />,
    accent: true,
  },
  {
    n: "03",
    title: "Share your link",
    detail:
      `Drop ${APP_DOMAIN}/@yourname into a bio, an invoice, a QR. Payments land in the vault encrypted.`,
    icon: <Share2 className="size-4" strokeWidth={2} />,
  },
];

/**
 * "How it works" — the consumer-facing answer. Three steps, one signature,
 * sixty seconds. The cryptography lives in the FAQ for readers who want it.
 */
export function SectionHow() {
  return (
    <SectionFrame
      id="how"
      number="03"
      eyebrow="How it works"
      headline={
        <>
          Sixty seconds.{" "}
          <em className="not-italic text-primary">One signature.</em>
        </>
      }
      standfirst={
        <>
          Non-custodial by design. Your main wallet signs once; a fresh keypair
          (the vault) is generated in your browser and never leaves it
          unencrypted. Payments arrive there.
        </>
      }
    >
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className={
              "relative flex flex-col gap-4 rounded-2xl border p-6 " +
              (s.accent
                ? "border-primary/35 bg-primary/[0.04] ring-1 ring-primary/15 shadow-[0_0_0_1px_rgba(240,184,122,0.08),0_8px_24px_-12px_rgba(240,184,122,0.4)]"
                : "border-border bg-card/60")
            }
          >
            <div className="flex items-center justify-between">
              <span
                className={
                  "grid size-8 place-items-center rounded-md " +
                  (s.accent
                    ? "bg-primary/15 text-primary"
                    : "bg-surface-raised/60 text-muted-foreground")
                }
              >
                {s.icon}
              </span>
              <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                Step {s.n}
              </span>
            </div>
            <div>
              <p className="font-serif text-[19px] leading-tight tracking-tight text-foreground md:text-[20px]">
                {s.title}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground/85">
                {s.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 max-w-2xl font-serif text-[13.5px] italic leading-relaxed text-muted-foreground/75">
        Curious about the cryptography — vault encryption, the mixer, viewing
        keys for your accountant? It’s in the FAQ below.
      </p>
    </SectionFrame>
  );
}
