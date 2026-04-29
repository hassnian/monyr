import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Minus,
} from "lucide-react";

import { LandingNav } from "../_components/landing/landing-nav";
import { LandingFooter } from "../_components/landing/landing-footer";
import {
  SectionFrame,
  SectionDivider,
} from "../_components/landing/section-frame";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Privacy model — Monyr",
  description:
    "What Monyr hides, what it does not, and why. The honest cut on the privacy guarantees behind your @handle.",
};

export default function PrivacyModelPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="amber-vignette pointer-events-none absolute inset-x-0 top-0 h-[1200px]"
      />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0"
      />

      <LandingNav />

      <main className="relative z-10">
        <PrivacyHero />
        <SectionDivider />
        <SectionPromise />
        <SectionDivider />
        <SectionWhoSeesWhat />
        <SectionDivider />
        <SectionInvariants />
        <SectionDivider />
        <SectionLeak />
        <SectionClose />
      </main>

      <LandingFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero — editorial masthead, reading-room voice                              */
/* ────────────────────────────────────────────────────────────────────────── */

function PrivacyHero() {
  return (
    <section
      aria-labelledby="privacy-hero"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24"
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/85 backdrop-blur-sm">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        § 00 · Trust document
      </p>

      <h1
        id="privacy-hero"
        className="mt-6 max-w-4xl font-serif text-[2.5rem] leading-[1.04] tracking-tight text-foreground sm:text-5xl md:text-6xl"
      >
        What we promise.{" "}
        <span className="text-primary">And what we don&rsquo;t.</span>
      </h1>

      <p className="mt-7 max-w-2xl font-serif text-[17px] italic leading-relaxed text-muted-foreground/85 md:text-[18.5px]">
        Privacy products earn trust by being precise about their guarantees.
        This page is the precise version &mdash; what an outside observer can
        learn from your handle, what they can&rsquo;t, and where the seams are.
      </p>

      <p className="mt-7 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground/80">
        Read this before you put your handle in a bio. If anything below
        surprises you, that&rsquo;s on us &mdash; tell us so we can fix the
        framing.
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* The split — Hidden vs. Visible                                             */
/* ────────────────────────────────────────────────────────────────────────── */

type Item = { label: string; detail: string };

const HIDDEN: Item[] = [
  {
    label: "Recipient wallet history",
    detail:
      "Your handle resolves to a fresh keypair (the vault) generated in your browser at signup. It has no DEX trades, no NFT mints, no airdrop history. There is nothing to scan.",
  },
  {
    label: "Payment amounts",
    detail:
      "Funds land inside Umbra's Encrypted Token Account. Amounts are encrypted on-chain. Only your viewing key decrypts them. Block explorers show ciphertext.",
  },
  {
    label: "Sender ↔ recipient graph",
    detail:
      "Deposits route through Umbra's mixer. Tx logs say “someone interacted with the Umbra program,” not “Bob paid Alice.” The link is broken in the anonymity set.",
  },
  {
    label: "Memo / context",
    detail:
      "Memos are encrypted client-side under your viewing key before any server write. The DB stores opaque ciphertext. Even if our database is dumped publicly, memos remain unreadable.",
  },
  {
    label: "Total received",
    detail:
      "Your dashboard total is decrypted in your browser only. The server never sees the sum. There is no “Monyr balance” API call that returns dollars.",
  },
  {
    label: "Sub-handle linkage",
    detail:
      "/@alice/acme and /@alice both target the same vault. The sub-path is metadata for your inbox, never for the chain. Acme can&rsquo;t see your other clients.",
  },
];

const VISIBLE: Item[] = [
  {
    label: "Your Monyr profile is public",
    detail:
      "Anyone with the URL can see your handle, display name, bio, avatar, and suggested amounts. That&rsquo;s the point &mdash; it&rsquo;s a pay-me link.",
  },
  {
    label: "An Umbra interaction occurred",
    detail:
      "Block explorers show a transaction touched the Umbra program at the moment a payment happened. The fact that something private happened is itself public.",
  },
  {
    label: "The payer&rsquo;s wallet (if they choose)",
    detail:
      "Payers sign the deposit with their own wallet. If that wallet has its own public history, the &ldquo;deposit-to-Umbra&rdquo; tx is visible on it. We can&rsquo;t hide a payer&rsquo;s past from a payer&rsquo;s past.",
  },
  {
    label: "Vault pubkey",
    detail:
      "The handle&rsquo;s receiving pubkey is public by design &mdash; payers need a destination. It controls only the encrypted vault, not your main wallet.",
  },
  {
    label: "First-time setup signatures",
    detail:
      "Onboarding requires two wallet signatures (unlock message + Umbra registration). Payers, the first time they pay through Umbra, also register once. Subsequent payments do not.",
  },
  {
    label: "Approximate timing",
    detail:
      "A passive observer watching the chain can correlate when a tx happened, even without knowing the contents. Monyr does not obscure timestamps.",
  },
];

function SectionPromise() {
  return (
    <SectionFrame
      id="promise"
      number="01"
      eyebrow="Hidden vs. Visible"
      headline={
        <>
          Privacy is a list.{" "}
          <em className="not-italic text-primary">Here is ours.</em>
        </>
      }
      standfirst={
        <>
          Two columns, no marketing language. The left column is what we hide.
          The right column is what remains visible &mdash; including the
          unavoidable kind.
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <ColumnPanel
          tone="hidden"
          eyebrow="What is hidden"
          subtitle="Encrypted on-chain, in browser, or never collected"
          icon={<EyeOff className="size-3" />}
          items={HIDDEN}
        />
        <ColumnPanel
          tone="visible"
          eyebrow="What remains visible"
          subtitle="Public by design, by physics, or by trade-off"
          icon={<Eye className="size-3" />}
          items={VISIBLE}
        />
      </div>
    </SectionFrame>
  );
}

function ColumnPanel({
  tone,
  eyebrow,
  subtitle,
  icon,
  items,
}: {
  tone: "hidden" | "visible";
  eyebrow: string;
  subtitle: string;
  icon: React.ReactNode;
  items: Item[];
}) {
  const hidden = tone === "hidden";
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-card/70 p-5 md:p-6",
        hidden ? "border-border" : "border-warning/25",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: hidden
            ? "linear-gradient(90deg, transparent, oklch(0.82 0.11 72 / 0.55), transparent)"
            : "linear-gradient(90deg, transparent, oklch(0.78 0.16 67 / 0.45), transparent)",
        }}
      />

      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10.5px] font-medium uppercase tracking-[0.18em]",
              hidden ? "text-primary/85" : "text-warning/85",
            )}
          >
            {hidden ? "Private · only you" : "Public · by design"}
          </p>
          <h3 className="mt-1.5 font-serif text-xl leading-tight tracking-tight text-foreground md:text-[22px]">
            {eyebrow}
          </h3>
          <p className="mt-1.5 max-w-sm font-serif text-[13px] italic leading-relaxed text-muted-foreground/75">
            {subtitle}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono tabular text-[10.5px] uppercase tracking-wider",
            hidden
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning",
          )}
        >
          {icon}
          {hidden ? "Encrypted" : "Visible"}
        </span>
      </header>

      <ol className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-surface-raised/30">
        {items.map((it, i) => (
          <li key={it.label} className="px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 font-mono tabular text-[10px] uppercase tracking-[0.2em] text-muted-foreground/55">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[13.5px] font-medium leading-snug",
                    hidden ? "text-foreground" : "text-foreground/95",
                  )}
                >
                  {it.label}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground/80">
                  {it.detail}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Who sees what — the threat-model matrix                                    */
/* ────────────────────────────────────────────────────────────────────────── */

type Sees = "yes" | "no" | "partial";

type Row = {
  actor: string;
  blurb: string;
  amount: Sees;
  sender: Sees;
  memo: Sees;
  fact: Sees;
};

const ROWS: Row[] = [
  {
    actor: "Block-explorer browser",
    blurb: "Anyone with solscan.io and a wallet pubkey",
    amount: "no",
    sender: "no",
    memo: "no",
    fact: "yes",
  },
  {
    actor: "Monyr server (us)",
    blurb: "Operator with full database access",
    amount: "no",
    sender: "no",
    memo: "no",
    fact: "yes",
  },
  {
    actor: "Umbra relayer",
    blurb: "Third-party tx submitter, sponsors gas",
    amount: "no",
    sender: "no",
    memo: "no",
    fact: "yes",
  },
  {
    actor: "Your accountant (with grant)",
    blurb: "Time-scoped viewing key you issue",
    amount: "yes",
    sender: "partial",
    memo: "yes",
    fact: "yes",
  },
  {
    actor: "Attacker with leaked DB",
    blurb: "Worst case: full Postgres dump in the wild",
    amount: "no",
    sender: "no",
    memo: "no",
    fact: "yes",
  },
  {
    actor: "You, the recipient",
    blurb: "Decrypted client-side with your viewing key",
    amount: "yes",
    sender: "yes",
    memo: "yes",
    fact: "yes",
  },
];

function SectionWhoSeesWhat() {
  return (
    <SectionFrame
      id="who"
      number="02"
      eyebrow="Threat model"
      headline={
        <>
          Who sees{" "}
          <em className="not-italic text-primary">what.</em>
        </>
      }
      standfirst={
        <>
          The matrix below covers every realistic observer of a Monyr payment.
          A &ldquo;yes&rdquo; on <em className="font-mono not-italic">interaction&nbsp;exists</em>{" "}
          is unavoidable; the rest is what the design defends.
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
        {/* Header */}
        <div className="hidden grid-cols-[2.2fr_repeat(4,_1fr)] items-end gap-4 border-b border-border/70 bg-surface-raised/30 px-5 py-3 md:grid">
          <p className="font-mono tabular text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground/75">
            Actor
          </p>
          {[
            "Amount",
            "Sender ↔ recipient",
            "Memo",
            "Interaction exists",
          ].map((h) => (
            <p
              key={h}
              className="text-center font-mono tabular text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground/75"
            >
              {h}
            </p>
          ))}
        </div>

        <ul className="divide-y divide-border/60">
          {ROWS.map((row) => (
            <li
              key={row.actor}
              className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-[2.2fr_repeat(4,_1fr)] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground">
                  {row.actor}
                </p>
                <p className="mt-0.5 font-serif text-[13px] italic leading-snug text-muted-foreground/75">
                  {row.blurb}
                </p>
              </div>

              {/* Mobile: row of pills with labels.  Desktop: bare cells. */}
              <SeesCell label="Amount" value={row.amount} />
              <SeesCell label="Sender ↔ recipient" value={row.sender} />
              <SeesCell label="Memo" value={row.memo} />
              <SeesCell label="Interaction exists" value={row.fact} />
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 max-w-2xl font-serif text-[13.5px] italic leading-relaxed text-muted-foreground/75">
        &ldquo;Interaction exists&rdquo; means an observer can tell{" "}
        <em>something</em> happened on Umbra at a given moment &mdash; which is
        the floor of any privacy system that touches a public chain.
      </p>
    </SectionFrame>
  );
}

function SeesCell({ label, value }: { label: string; value: Sees }) {
  const conf =
    value === "yes"
      ? {
          icon: <Check className="size-3.5" strokeWidth={2.5} />,
          tone: "bg-success/10 text-success ring-success/20",
          word: "Yes",
        }
      : value === "no"
        ? {
            icon: <Minus className="size-3.5" strokeWidth={2.5} />,
            tone: "bg-muted/40 text-muted-foreground ring-border/60",
            word: "No",
          }
        : {
            icon: (
              <span className="font-mono tabular text-[10px] font-bold leading-none">
                ½
              </span>
            ),
            tone: "bg-warning/10 text-warning ring-warning/20",
            word: "Scoped",
          };

  return (
    <div className="flex items-center justify-between gap-3 md:justify-center">
      <span className="font-mono tabular text-[10.5px] uppercase tracking-wider text-muted-foreground/75 md:hidden">
        {label}
      </span>
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 font-mono tabular text-[11px] uppercase tracking-wider ring-1",
          conf.tone,
        )}
      >
        {conf.icon}
        <span>{conf.word}</span>
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Invariants — load-bearing rules                                            */
/* ────────────────────────────────────────────────────────────────────────── */

const INVARIANTS = [
  {
    title: "Your main wallet pubkey is never persisted.",
    detail:
      "Authentication uses a short-lived session token signed by your main wallet. The server inserts your handle, vault pubkey, and an opaque ciphertext blob &mdash; nothing else.",
  },
  {
    title: "The vault private key is encrypted in the browser.",
    detail:
      "AES-256-GCM with a key derived from your wallet&rsquo;s signature on a fixed unlock message. The plaintext key never leaves your tab.",
  },
  {
    title: "Your main wallet never funds the vault directly.",
    detail:
      "Doing so would link them on-chain. Registration gas is sponsored. The two identities share no transaction.",
  },
  {
    title: "Memos are encrypted before any network call.",
    detail:
      "Encrypted under your viewing key, derived from the vault&rsquo;s signature. The server stores ciphertext; we couldn&rsquo;t decrypt them if we tried.",
  },
  {
    title: "Viewing rights are separable from spend rights.",
    detail:
      "An accountant grant decrypts amounts in a window. It cannot move funds. A compromised viewing key cannot drain the vault.",
  },
  {
    title: "No analytics, no third-party scripts, no session replay.",
    detail:
      "CSP locks outbound connections to Umbra endpoints, Solana RPC, and our own origin. There is no Segment, no Mixpanel, no Sentry without scrubbing.",
  },
];

function SectionInvariants() {
  return (
    <SectionFrame
      id="invariants"
      number="03"
      eyebrow="The hard rules"
      headline={
        <>
          Six invariants{" "}
          <em className="not-italic text-primary">we will not break.</em>
        </>
      }
      standfirst={
        <>
          If any of these stop being true in a future version, we owe you a
          changelog entry. They are load-bearing, not aesthetic.
        </>
      }
    >
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {INVARIANTS.map((rule, i) => (
          <li
            key={rule.title}
            className="group/inv relative flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-8 place-items-center rounded-md bg-primary/10 font-mono tabular text-[11px] font-medium tracking-wider text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Invariant
              </span>
            </div>
            <p className="font-serif text-[19px] leading-snug tracking-tight text-foreground md:text-[20px]">
              {rule.title}
            </p>
            <p
              className="text-[13.5px] leading-relaxed text-muted-foreground/85"
              dangerouslySetInnerHTML={{ __html: rule.detail }}
            />
          </li>
        ))}
      </ol>
    </SectionFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* The one explicit leak — withdrawal warning                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function SectionLeak() {
  return (
    <SectionFrame
      id="leak"
      number="04"
      eyebrow="The one leak"
      headline={
        <>
          The exit door{" "}
          <em className="not-italic text-primary">is the seam.</em>
        </>
      }
      standfirst={
        <>
          Every privacy system has a place where the design has to make a
          choice. Ours is the moment you withdraw from your vault to a public
          wallet.
        </>
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-warning/30 bg-card/70 p-6 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.78 0.16 67 / 0.55), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10 blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 20%, oklch(0.78 0.16 67 / 0.18), transparent 70%)",
          }}
        />

        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning/10 ring-1 ring-warning/30">
            <AlertTriangle className="size-5 text-warning" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-mono tabular text-[10.5px] uppercase tracking-[0.2em] text-warning/80">
              Caution · withdrawal
            </p>
            <h3 className="mt-1.5 font-serif text-2xl leading-tight tracking-tight text-foreground md:text-[28px]">
              Withdrawing to your main wallet undoes the privacy you just paid
              for.
            </h3>
            <p className="mt-4 max-w-3xl text-[14.5px] leading-relaxed text-muted-foreground/85">
              When funds leave your vault to a wallet that has a public history
              &mdash; the everyday wallet you use for DEX trades or NFT buys
              &mdash; that on-chain transaction publicly links the vault to
              that wallet. Anyone who has your handle can now read the receiving
              wallet&rsquo;s history.
            </p>

            <ul className="mt-6 space-y-3 text-[13.5px] leading-relaxed text-muted-foreground/85">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                <span>
                  Default proposal in the UI: withdraw to a{" "}
                  <em>fresh</em> address generated inline, with no history of
                  its own.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                <span>
                  Recommended pattern: keep funds inside the vault. Spend from
                  it through Umbra-aware flows where possible. Withdraw only
                  when you must move to fiat or a wallet outside Monyr.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                <span>
                  If you insist on a public destination, a banner in the
                  withdrawal flow names the trade-off in plain language. We do
                  not bury it under a tooltip.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Close — italic-serif coda + nav onward                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function SectionClose() {
  return (
    <section
      aria-labelledby="privacy-close"
      className="relative scroll-mt-24 py-24 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 35%, oklch(0.82 0.11 72 / 0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-3xl px-6 text-center md:px-10">
        <p className="font-mono tabular text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground">
          § 05 &nbsp;·&nbsp; Coda
        </p>

        <h2
          id="privacy-close"
          className="mt-6 font-serif text-[30px] leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-[48px]"
        >
          Privacy is a list,{" "}
          <span className="text-primary">not a slogan.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl font-serif text-[16.5px] italic leading-relaxed text-muted-foreground/85">
          We&rsquo;d rather lose an early signup to honest framing than win one
          on a promise we can&rsquo;t keep. If something on this page reads
          softer than the code behind it, that is a bug. Tell us.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/umbra"
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border-strong/60 bg-surface-raised/40 px-5 text-[14px] font-medium text-foreground/90 backdrop-blur-sm transition-all",
              "hover:border-primary/45 hover:text-foreground",
              "hover:shadow-[0_0_0_1px_oklch(0.82_0.11_72/0.2),0_8px_24px_-12px_oklch(0.82_0.11_72/0.6)]",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            See the Umbra integration
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
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
        </div>

        <p className="mt-12 font-serif text-[13.5px] italic leading-relaxed text-muted-foreground/70">
          &ldquo;On-chain, your handle should be your identity; your ledger
          should be your business.&rdquo;
        </p>
      </div>
    </section>
  );
}
