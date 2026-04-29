import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Eye,
  KeyRound,
  LayoutDashboard,
  PlayCircle,
  Sparkles,
  Wallet2,
} from "lucide-react";

import { LandingNav } from "../_components/landing/landing-nav";
import { LandingFooter } from "../_components/landing/landing-footer";
import { SectionDivider } from "../_components/landing/section-frame";
import { cn } from "@/lib/utils";
import { handleUrl } from "@/lib/brand";

export const metadata = {
  title: "Demo — Try the @alice payment flow on Monyr",
  description:
    "A 60-second guided walkthrough: claim, pay, decrypt, verify on the public explorer, and read the honest privacy model.",
};

const DEMO_HANDLE = "alice";
const PROFILE_PATH = `/@${DEMO_HANDLE}`;
const DASHBOARD_PATH = "/app";
const PRIVACY_PATH = "/privacy-model";
const UMBRA_PROGRAM_EXPLORER =
  "https://solscan.io/account/UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh";

type Step = {
  n: string;
  title: string;
  blurb: string;
  detail: string;
  cta: string;
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  accent?: boolean;
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Open @alice",
    blurb: "The public profile a payer sees the moment they click your handle.",
    detail:
      "Display name, optional bio, suggested amounts, a memo field, and a single Pay button. Notice what is not on the page: a wallet address, a balance, a donor list.",
    cta: "Open profile",
    href: PROFILE_PATH,
    external: true,
    icon: <Wallet2 className="size-4" strokeWidth={2} />,
  },
  {
    n: "02",
    title: "Pay privately",
    blurb:
      "Pick an amount, sign with your wallet, watch the ZK proof generate locally.",
    detail:
      "The payer&rsquo;s wallet pops, the worker generates a Groth16 proof in 2–8 seconds, the deposit lands in Umbra&rsquo;s mixer. Real Solana RPC, real USDC base units.",
    cta: "Simulate a payment",
    href: PROFILE_PATH,
    external: true,
    icon: <PlayCircle className="size-4" strokeWidth={2} />,
    accent: true,
  },
  {
    n: "03",
    title: "View the dashboard",
    blurb: "Where Alice sees the payment arrive — decrypted in her browser only.",
    detail:
      "Sender label, memo, sub-handle context, total received. The server never sees any of it; the row is reconstituted client-side from the Master Viewing Key.",
    cta: "Open dashboard",
    href: DASHBOARD_PATH,
    external: true,
    icon: <LayoutDashboard className="size-4" strokeWidth={2} />,
  },
  {
    n: "04",
    title: "Check the public explorer",
    blurb: "Look up the same activity on Solscan. Notice what isn&rsquo;t there.",
    detail:
      "An interaction with the Umbra program at a given moment — that&rsquo;s the floor of any chain-touching privacy system. Amounts, counterparties, and Alice&rsquo;s wallet history are not visible.",
    cta: "Open Solscan",
    href: UMBRA_PROGRAM_EXPLORER,
    external: true,
    icon: <Eye className="size-4" strokeWidth={2} />,
  },
  {
    n: "05",
    title: "Read the privacy model",
    blurb: "The brutally honest cut — what we hide, and what we don&rsquo;t.",
    detail:
      "A six-by-six matrix of who can see what, six load-bearing invariants, and the one explicit leak (withdrawal). If something on this site reads softer than the code, that page is where to check.",
    cta: "Privacy model",
    href: PRIVACY_PATH,
    icon: <KeyRound className="size-4" strokeWidth={2} />,
    accent: true,
  },
];

export default function DemoPage() {
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
        <DemoHero />
        <SectionDivider />
        <DemoSteps />
        <DemoCloser />
      </main>

      <LandingFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero — title + standfirst + Start-demo CTA                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function DemoHero() {
  return (
    <section
      aria-labelledby="demo-hero"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24"
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/85 backdrop-blur-sm">
        <Sparkles className="size-3 text-primary" strokeWidth={2.25} />
        § Demo · 60 seconds · five steps
      </p>

      <h1
        id="demo-hero"
        className="mt-6 max-w-4xl font-serif text-[2.5rem] leading-[1.04] tracking-tight text-foreground sm:text-5xl md:text-6xl"
      >
        Try the private{" "}
        <span className="text-primary">@alice</span> payment flow.
      </h1>

      <p className="mt-7 max-w-2xl font-serif text-[17px] italic leading-relaxed text-muted-foreground/85 md:text-[18.5px]">
        A guided walk through every claim this product makes &mdash; from a
        public profile to a decrypted inbox to a public explorer that proves
        the privacy held. Five steps. No onboarding required.
      </p>

      <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground/80">
        Best taken on desktop with a Solana wallet (Phantom, Solflare, or
        Backpack) installed. Each step opens in a new tab so you can keep this
        page as your map.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <a
          href={PROFILE_PATH}
          target="_blank"
          rel="noreferrer"
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
          <PlayCircle className="size-4" strokeWidth={2.25} />
          Start demo
          <ArrowUpRight className="size-4" strokeWidth={2} />
        </a>
        <Link
          href={PRIVACY_PATH}
          className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border-strong/60 bg-surface-raised/40 px-5 text-[14px] font-medium text-foreground/90 backdrop-blur-sm transition-all hover:border-primary/45 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Read privacy model
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>

      <p className="mt-12 inline-flex max-w-md flex-wrap items-baseline gap-x-1.5 font-serif text-[13.5px] italic leading-relaxed text-muted-foreground/75">
        <span>Demo handle:</span>
        <span className="font-mono not-italic tracking-tight text-foreground/85">
          {handleUrl(DEMO_HANDLE)}
        </span>
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Steps — vertical numbered timeline                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function DemoSteps() {
  return (
    <section
      id="steps"
      aria-labelledby="steps-headline"
      className="relative scroll-mt-24 py-24 md:py-32"
    >
      <div className="mx-auto w-full max-w-5xl px-6 md:px-10">
        <header className="mb-10 max-w-3xl md:mb-14">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="font-mono tabular text-[10.5px] uppercase tracking-[0.24em]">
              § 01
            </span>
            <span aria-hidden className="h-px w-8 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              The walkthrough
            </span>
          </div>
          <h2
            id="steps-headline"
            className="mt-5 font-serif text-3xl leading-[1.06] tracking-tight text-foreground sm:text-4xl md:text-[44px]"
          >
            Five tabs.{" "}
            <em className="not-italic text-primary">One honest demo.</em>
          </h2>
          <p className="mt-5 max-w-2xl font-serif text-[16.5px] italic leading-relaxed text-muted-foreground/85 md:text-[17.5px]">
            Each step is a click. Each click is a real surface — the same
            production routes a user would hit. Open them in order; the
            picture lands by step five.
          </p>
        </header>

        <ol className="relative space-y-3">
          <span
            aria-hidden
            className="pointer-events-none absolute left-[15px] top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-primary/30 via-border to-border/40 md:block"
          />

          {STEPS.map((step) => (
            <DemoStepCard key={step.n} step={step} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function DemoStepCard({ step }: { step: Step }) {
  return (
    <li
      className={cn(
        "group/step relative overflow-hidden rounded-2xl border bg-card/60 transition-all duration-200 md:pl-12",
        step.accent
          ? "border-primary/35 ring-1 ring-primary/15 shadow-[0_0_0_1px_rgba(240,184,122,0.08),0_8px_24px_-12px_rgba(240,184,122,0.4)]"
          : "border-border hover:border-primary/30",
      )}
    >
      {/* Timeline dot. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-[7px] top-7 hidden size-4 rounded-full border-2 md:inline-block",
          step.accent
            ? "border-primary bg-primary/30 ring-2 ring-primary/20"
            : "border-border-strong bg-background group-hover/step:border-primary group-hover/step:bg-primary/20",
        )}
      />

      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6 md:p-6">
        {/* Left meta column — number + icon + label */}
        <div className="flex items-center gap-3 md:w-44 md:shrink-0 md:flex-col md:items-start md:gap-2">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-md",
              step.accent
                ? "bg-primary/15 text-primary"
                : "bg-surface-raised/60 text-muted-foreground",
            )}
          >
            {step.icon}
          </span>
          <div className="min-w-0">
            <p className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
              Step {step.n}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[12.5px] font-medium",
                step.accent ? "text-primary/90" : "text-foreground/90",
              )}
            >
              {step.external ? "Opens in new tab" : "Same tab"}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[20px] leading-snug tracking-tight text-foreground md:text-[22px]">
            {step.title}
          </h3>
          <p
            className="mt-1.5 text-[14px] leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: step.blurb }}
          />
          <p
            className="mt-2 text-[13px] leading-relaxed text-muted-foreground/85"
            dangerouslySetInnerHTML={{ __html: step.detail }}
          />

          {/* CTA */}
          <div className="mt-5">
            <StepLink
              href={step.href}
              external={step.external}
              accent={step.accent}
            >
              {step.cta}
            </StepLink>
          </div>
        </div>
      </div>
    </li>
  );
}

function StepLink({
  href,
  external,
  accent,
  children,
}: {
  href: string;
  external?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-medium",
    "border transition-all duration-200",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    accent
      ? cn(
          "border-primary/45 bg-primary/10 text-primary",
          "hover:border-primary/70 hover:bg-primary/15",
          "hover:shadow-[0_0_0_1px_oklch(0.82_0.11_72/0.2),0_8px_24px_-12px_oklch(0.82_0.11_72/0.6)]",
        )
      : cn(
          "border-border-strong/60 bg-surface-raised/40 text-foreground/90",
          "hover:border-primary/45 hover:text-foreground",
          "hover:shadow-[0_0_0_1px_oklch(0.82_0.11_72/0.16),0_6px_18px_-12px_oklch(0.82_0.11_72/0.5)]",
        ),
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
        <ExternalLink className="size-3.5" strokeWidth={2} />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
      <ArrowRight className="size-3.5" strokeWidth={2} />
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Closer — one more push                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function DemoCloser() {
  return (
    <section
      aria-labelledby="demo-close"
      className="relative scroll-mt-24 py-24 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 35%, oklch(0.82 0.11 72 / 0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-3xl px-6 text-center md:px-10">
        <p className="font-mono tabular text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground">
          § 02 &nbsp;·&nbsp; Coda
        </p>

        <h2
          id="demo-close"
          className="mt-6 font-serif text-[30px] leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-[48px]"
        >
          Convinced?{" "}
          <span className="text-primary">Claim your handle.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl font-serif text-[16.5px] italic leading-relaxed text-muted-foreground/85">
          The demo above runs against the same code you&rsquo;d use as a
          creator. The only difference is whose handle is printed at the top.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <a
            href={PROFILE_PATH}
            target="_blank"
            rel="noreferrer"
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
            <PlayCircle className="size-4" strokeWidth={2.25} />
            Start demo
          </a>
          <Link
            href="/claim"
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border-strong/60 bg-surface-raised/40 px-5 text-[14px] font-medium text-foreground/90 backdrop-blur-sm transition-all",
              "hover:border-primary/45 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            Claim your handle
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>

        <p className="mt-12 font-serif text-[13.5px] italic leading-relaxed text-muted-foreground/70">
          Live on Solana mainnet. Powered by Umbra.
        </p>
      </div>
    </section>
  );
}
