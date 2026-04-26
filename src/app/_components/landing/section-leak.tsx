import { APP_DOMAIN } from "@/lib/brand";
import { ArrowDownRight, Eye, EyeOff } from "lucide-react";
import { SectionFrame } from "./section-frame";

type Tx = {
  kind: string;
  detail: string;
  amount: string;
  sig: string;
};

const PUBLIC_LEDGER: Tx[] = [
  { kind: "Received from", detail: "@orchid-labs", amount: "1,800.00 USDC", sig: "Xr4n…hT6p" },
  { kind: "Swap", detail: "USDC → BONK · Jupiter", amount: "−420.00 USDC", sig: "Lq8t…rM1v" },
  { kind: "Received from", detail: "@acme-corp", amount: "750.00 USDC", sig: "4kTn…rH7p" },
  { kind: "NFT purchase", detail: "Mad Lads #4421 · Tensor", amount: "−68.4 SOL", sig: "Mn6t…zB3r" },
  { kind: "Received from", detail: "anon-tip", amount: "5.00 USDC", sig: "Kp2a…bT9x" },
];

const HUSH_LEDGER = Array.from({ length: 5 }, () => ({
  kind: "Received privately",
  amount: "•••••••",
}));

export function SectionLeak() {
  return (
    <SectionFrame
      id="why"
      number="01"
      eyebrow="Why"
      headline={
        <>
          Your wallet address is{" "}
          <em className="not-italic text-primary">also your bank statement.</em>
        </>
      }
      standfirst={
        <>
          Hand a client your address and you’ve handed them every payment, every
          flip, every relationship — to anyone with a browser. Same person, same
          payments, two very different stories.
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <LedgerPanel
          tone="public"
          title="Today, on a public address"
          subtitle="solscan.io / @yourwallet"
          items={PUBLIC_LEDGER.map((tx, i) => (
            <PublicRow key={i} tx={tx} />
          ))}
        />

        <LedgerPanel
          tone="hush"
          title="With a Monyr handle"
          subtitle={`${APP_DOMAIN} / @yourname`}
          items={HUSH_LEDGER.map((tx, i) => (
            <MonyrRow key={i} tx={tx} />
          ))}
        />
      </div>
    </SectionFrame>
  );
}

function LedgerPanel({
  tone,
  title,
  subtitle,
  items,
}: {
  tone: "public" | "hush";
  title: string;
  subtitle: string;
  items: React.ReactNode[];
}) {
  const isPublic = tone === "public";
  return (
    <article
      className={
        "relative flex flex-col overflow-hidden rounded-2xl border bg-card/70 p-5 md:p-6 " +
        (isPublic ? "border-destructive/25" : "border-border")
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: isPublic
            ? "linear-gradient(90deg, transparent, oklch(0.7 0.2 24 / 0.45), transparent)"
            : "linear-gradient(90deg, transparent, oklch(0.82 0.11 72 / 0.55), transparent)",
        }}
      />
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={
              "text-[10.5px] font-medium uppercase tracking-[0.18em] " +
              (isPublic ? "text-destructive/80" : "text-primary/85")
            }
          >
            {isPublic ? "Public · readable by anyone" : "Private · readable only by you"}
          </p>
          <h3 className="mt-1.5 font-serif text-xl leading-tight tracking-tight text-foreground md:text-[22px]">
            {title}
          </h3>
          <p className="mt-1 font-mono tabular text-[11.5px] text-muted-foreground/70">
            {subtitle}
          </p>
        </div>
        <span
          className={
            "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono tabular text-[10.5px] uppercase tracking-wider " +
            (isPublic
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success")
          }
        >
          {isPublic ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
          {isPublic ? "Visible" : "Encrypted"}
        </span>
      </header>

      <ol className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-surface-raised/30">
        {items.map((row, i) => (
          <li key={i}>{row}</li>
        ))}
      </ol>
    </article>
  );
}

function PublicRow({ tx }: { tx: Tx }) {
  const negative = tx.amount.startsWith("−");
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/75">
          {tx.kind}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-foreground/90">
          {tx.detail}
        </p>
      </div>
      <div className="text-right">
        <p
          className={
            "font-mono tabular text-[13px] " +
            (negative ? "text-foreground/70" : "text-foreground")
          }
        >
          {tx.amount}
        </p>
        <p className="mt-0.5 font-mono tabular text-[10.5px] text-muted-foreground/60">
          {tx.sig}
        </p>
      </div>
    </div>
  );
}

function MonyrRow({ tx }: { tx: { kind: string; amount: string } }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/60">
          On-chain
        </p>
        <p className="mt-0.5 flex items-center gap-2 truncate text-[13px] text-foreground/85">
          <ArrowDownRight className="size-3.5 text-primary/70" strokeWidth={2.25} />
          {tx.kind}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono tabular text-[13px] tracking-wider text-muted-foreground/70">
          {tx.amount}
        </p>
        <p className="mt-0.5 font-mono tabular text-[10.5px] text-muted-foreground/45">
          •••• •••• ••••
        </p>
      </div>
    </div>
  );
}
