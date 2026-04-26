import { Plus } from "lucide-react";
import { SectionFrame } from "./section-frame";

type Q = {
  q: string;
  a: React.ReactNode;
  open?: boolean;
};

const QUESTIONS: Q[] = [
  {
    q: "Is my main wallet linked to my handle on-chain?",
    open: true,
    a: (
      <p>
        No. Your handle resolves to a separate keypair generated in your
        browser at signup. Your main wallet only signs the unlock message. The
        two never share a transaction. When you withdraw, the funds route
        through Umbra’s mixer — exits stay private too.
      </p>
    ),
  },
  {
    q: "Is Monyr custodial? Where do my keys live?",
    a: (
      <p>
        Non-custodial. The vault’s secret is encrypted in your browser with
        AES-256-GCM under a key derived from your wallet signature. The server
        stores ciphertext we cannot decrypt. No email, no KYC.
      </p>
    ),
  },
  {
    q: "What can my accountant see?",
    a: (
      <p>
        Only what you scope. Issue a viewing key for Q1 2026 and your
        accountant decrypts amounts in that window — counterparties stay
        opaque, and they can never move funds. The grant is revocable on-chain.
      </p>
    ),
  },
  {
    q: "What if I lose my wallet?",
    a: (
      <p>
        Download the encrypted vault blob and store it like a seed phrase, or
        opt in to a passphrase as a second unlock factor — recover without the
        wallet.
      </p>
    ),
  },
];

export function SectionFaq() {
  return (
    <SectionFrame
      id="faq"
      number="04"
      eyebrow="Questions"
      headline={
        <>
          The questions{" "}
          <em className="not-italic text-primary">careful Solana users</em> ask.
        </>
      }
    >
      <ol className="overflow-hidden rounded-2xl border border-border bg-card/60 divide-y divide-border/60">
        {QUESTIONS.map((item, i) => (
          <li key={item.q}>
            <details
              className="group/faq px-5 py-5 md:px-8 md:py-6"
              open={item.open}
            >
              <summary
                className="flex cursor-pointer list-none items-start justify-between gap-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
                aria-controls={`faq-${i}`}
              >
                <div className="flex min-w-0 items-start gap-4">
                  <span className="hidden font-mono tabular text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/70 md:inline-block md:pt-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-[19px] leading-snug tracking-tight text-foreground md:text-[20px]">
                    {item.q}
                  </h3>
                </div>
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-md border border-border-strong/60 bg-surface-raised/40 text-muted-foreground transition-all group-open/faq:rotate-45 group-open/faq:border-primary/40 group-open/faq:text-primary"
                >
                  <Plus className="size-3.5" strokeWidth={2} />
                </span>
              </summary>
              <div
                id={`faq-${i}`}
                className="mt-4 max-w-3xl space-y-3 text-[14px] leading-relaxed text-muted-foreground/85 md:ml-12"
              >
                {item.a}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </SectionFrame>
  );
}
