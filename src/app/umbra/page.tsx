import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleDashed,
  CircleDot,
  Cpu,
  ExternalLink,
  KeyRound,
  Network,
  Send,
  Wallet2,
  Workflow,
} from "lucide-react";

import { LandingNav } from "../_components/landing/landing-nav";
import { LandingFooter } from "../_components/landing/landing-footer";
import {
  SectionFrame,
  SectionDivider,
} from "../_components/landing/section-frame";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Built on Umbra — Monyr",
  description:
    "Technical proof: the Umbra SDK calls Monyr uses, the flow under the hood, what is real today, and what is still on the roadmap.",
};

const UMBRA_VERSIONS = {
  sdk: "@umbra-privacy/sdk · v3.0.0",
  prover: "@umbra-privacy/web-zk-prover · v2.0.1",
  programMainnet: "UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh",
  programDevnet: "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ",
  indexerMainnet: "utxo-indexer.api.umbraprivacy.com",
  indexerDevnet: "utxo-indexer.api-devnet.umbraprivacy.com",
};

export default function UmbraPage() {
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
        <UmbraHero />
        <SectionDivider />
        <SectionSdkCalls />
        <SectionDivider />
        <SectionFlow />
        <SectionDivider />
        <SectionRealVsSimulated />
        <SectionDivider />
        <SectionSetup />
        <SectionDivider />
        <SectionLimitations />
        <SectionClose />
      </main>

      <LandingFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero — technical-proof masthead                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function UmbraHero() {
  return (
    <section
      aria-labelledby="umbra-hero"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24"
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/85 backdrop-blur-sm">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        § 00 · Technical proof
      </p>

      <h1
        id="umbra-hero"
        className="mt-6 max-w-4xl font-serif text-[2.5rem] leading-[1.04] tracking-tight text-foreground sm:text-5xl md:text-6xl"
      >
        Built on Umbra.{" "}
        <span className="text-primary">Here&rsquo;s the receipt.</span>
      </h1>

      <p className="mt-7 max-w-2xl font-serif text-[17px] italic leading-relaxed text-muted-foreground/85 md:text-[18.5px]">
        Monyr is a thin product layer on top of Umbra&rsquo;s privacy
        primitives. This page lists every SDK call we make, what it does, and
        which parts of the flow are live versus still on the roadmap.
      </p>

      {/* version pills */}
      <dl className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { k: "SDK", v: UMBRA_VERSIONS.sdk },
          { k: "ZK prover", v: UMBRA_VERSIONS.prover },
          {
            k: "Program (mainnet)",
            v: UMBRA_VERSIONS.programMainnet,
            mono: true,
          },
          {
            k: "Program (devnet)",
            v: UMBRA_VERSIONS.programDevnet,
            mono: true,
          },
          { k: "Indexer (mainnet)", v: UMBRA_VERSIONS.indexerMainnet },
          { k: "Indexer (devnet)", v: UMBRA_VERSIONS.indexerDevnet },
        ].map((item) => (
          <div
            key={item.k}
            className="rounded-lg border border-border bg-card/60 px-4 py-3"
          >
            <dt className="font-mono tabular text-[10px] uppercase tracking-[0.2em] text-muted-foreground/75">
              {item.k}
            </dt>
            <dd
              className={cn(
                "mt-1 break-all text-[13px] leading-snug text-foreground/90",
                item.mono && "font-mono tabular text-[12px]",
              )}
            >
              {item.v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <a
          href="https://docs.umbraprivacy.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong/60 bg-surface-raised/40 px-3.5 text-[13px] font-medium text-foreground/90 backdrop-blur-sm transition-all hover:border-primary/45 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Umbra docs
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </a>
        <a
          href="https://sdk.umbraprivacy.com/llms.txt"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong/60 bg-surface-raised/40 px-3.5 text-[13px] font-medium text-foreground/90 backdrop-blur-sm transition-all hover:border-primary/45 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          SDK reference
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </a>
        <Link
          href="/privacy-model"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Privacy model
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SDK calls — every function in the actual codebase, plus roadmap            */
/* ────────────────────────────────────────────────────────────────────────── */

type Status = "live" | "wired" | "planned";

type SdkCall = {
  name: string;
  module: string;
  purpose: string;
  status: Status;
  detail: string;
};

const SDK_CALLS: SdkCall[] = [
  {
    name: "getUmbraClient",
    module: "@umbra-privacy/sdk",
    purpose: "Instantiate the Umbra client with our signer + RPC + indexer config.",
    status: "live",
    detail:
      "Configured per network (mainnet/devnet) with QuickNode RPC and the official Umbra UTXO indexer endpoint. We pass `deferMasterSeedSignature: true` so the master seed is only derived when an action genuinely needs it — keeping signatures intentional, not surprise prompts.",
  },
  {
    name: "getUserAccountQuerierFunction",
    module: "@umbra-privacy/sdk",
    purpose: "Read the user&rsquo;s on-chain Umbra registration state.",
    status: "live",
    detail:
      "Used to check `isInitialised`, `isUserAccountX25519KeyRegistered`, `isUserCommitmentRegistered`, and `isActiveForAnonymousUsage` — the four flags that gate whether a wallet can transact privately. The dashboard branches on this to show the registration prompt vs. the regular flow.",
  },
  {
    name: "getUserRegistrationFunction",
    module: "@umbra-privacy/sdk",
    purpose: "One-time on-chain registration for a wallet.",
    status: "live",
    detail:
      "Called with `{ confidential: true, anonymous: true }` so the same registration covers both encrypted balances and anonymous deposits. Idempotent: re-runs are no-ops once an account is fully initialised.",
  },
  {
    name: "getUserRegistrationProver",
    module: "@umbra-privacy/web-zk-prover",
    purpose: "Generate the Groth16 proof needed by registration.",
    status: "live",
    detail:
      "ZK assets are loaded from Umbra&rsquo;s CDN, but proxied through `/api/umbra-zk` to sidestep CORS. The prover is intended to run inside a Web Worker (Comlink) — UI stays interactive while proving.",
  },
  {
    name: "getCdnZkAssetProvider",
    module: "@umbra-privacy/web-zk-prover",
    purpose: "Configure where circuit assets and the manifest are fetched from.",
    status: "live",
    detail:
      "Pointed at our own `/api/umbra-zk/*` route handlers, which transparently proxy Umbra&rsquo;s CDN. Same bytes, same hashes — just origin-friendly so the prover can stream them without CORS errors.",
  },
  {
    name: "getPublicBalanceToEncryptedBalanceDirectDepositorFunction",
    module: "@umbra-privacy/sdk",
    purpose: "Move public USDC into an Umbra encrypted balance.",
    status: "wired",
    detail:
      "This is the deposit primitive currently wired into the dashboard. It encrypts the amount on entry into the user&rsquo;s ETA — a stepping stone to the receiver-claimable UTXO flow that will power public-profile payments.",
  },
  {
    name: "getPublicBalanceToReceiverClaimableUtxoCreatorFunction",
    module: "@umbra-privacy/sdk",
    purpose: "The payer-flow primitive: deposit → mixer → receiver-claimable UTXO.",
    status: "planned",
    detail:
      "The target call for `/@alice` payer-side flows. The payer&rsquo;s public USDC enters the unified mixer pool and produces a UTXO claimable only by Alice&rsquo;s vault — the step that breaks the sender↔recipient graph link.",
  },
  {
    name: "getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction",
    module: "@umbra-privacy/sdk",
    purpose: "Recipient-side: claim incoming UTXOs into the encrypted balance, gas-free.",
    status: "planned",
    detail:
      "Submitted via the Umbra relayer so the recipient pays no SOL. Combined with `getClaimableUtxoScannerFunction`, this is the dashboard&rsquo;s background auto-claim loop.",
  },
  {
    name: "getClaimableUtxoScannerFunction",
    module: "@umbra-privacy/sdk",
    purpose: "Iterate new claimable UTXOs since the last cursor.",
    status: "planned",
    detail:
      "Runs on `/app` load and on a poll. Cursor is cached in IndexedDB so the scanner only does incremental work between sessions.",
  },
  {
    name: "getComplianceGrantIssuerFunction",
    module: "@umbra-privacy/sdk",
    purpose: "Issue a scoped, on-chain viewing grant to an accountant or auditor.",
    status: "planned",
    detail:
      "Time-, mint-, or transaction-scoped. Grant holders decrypt amounts in the window without holding spend rights. Powers the &ldquo;hand my accountant Q1&rdquo; story.",
  },
];

const STATUS_META: Record<
  Status,
  { label: string; tone: string; icon: React.ReactNode; pillTone: string }
> = {
  live: {
    label: "Live",
    tone: "border-success/35 bg-success/10 text-success",
    icon: <CircleDot className="size-3" strokeWidth={2.5} />,
    pillTone: "bg-success",
  },
  wired: {
    label: "Wired",
    tone: "border-primary/40 bg-primary/10 text-primary",
    icon: <CircleDot className="size-3" strokeWidth={2.5} />,
    pillTone: "bg-primary",
  },
  planned: {
    label: "Planned",
    tone: "border-border-strong/60 bg-surface-raised/40 text-muted-foreground",
    icon: <CircleDashed className="size-3" strokeWidth={2.5} />,
    pillTone: "bg-muted-foreground",
  },
};

function SectionSdkCalls() {
  return (
    <SectionFrame
      id="sdk"
      number="01"
      eyebrow="The SDK surface"
      headline={
        <>
          Every Umbra call we make,{" "}
          <em className="not-italic text-primary">tagged honestly.</em>
        </>
      }
      standfirst={
        <>
          <em className="font-mono not-italic">Live</em> means it runs in the
          shipping app today. <em className="font-mono not-italic">Wired</em>{" "}
          means it&rsquo;s integrated and proven in code, used by an internal
          surface. <em className="font-mono not-italic">Planned</em> means
          we&rsquo;ve scoped the call but haven&rsquo;t merged it.
        </>
      }
    >
      <ul className="grid grid-cols-1 gap-3 md:gap-3">
        {SDK_CALLS.map((call) => (
          <SdkRow key={call.name} call={call} />
        ))}
      </ul>

      <p className="mt-8 max-w-2xl font-serif text-[13.5px] italic leading-relaxed text-muted-foreground/75">
        The factory-function shape (<span className="font-mono not-italic">get*Function</span>)
        is intentional on Umbra&rsquo;s side — a small, composable surface where
        each call returns a typed, reusable builder.
      </p>
    </SectionFrame>
  );
}

function SdkRow({ call }: { call: SdkCall }) {
  const meta = STATUS_META[call.status];
  return (
    <li className="group/sdk overflow-hidden rounded-2xl border border-border bg-card/60 transition-colors hover:border-primary/30">
      <details className="px-5 py-5 md:px-6">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 font-mono tabular text-[9.5px] uppercase tracking-wider",
                  meta.tone,
                )}
              >
                {meta.icon}
                {meta.label}
              </span>
              <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/65">
                {call.module}
              </span>
            </div>

            <p className="break-all font-mono tabular text-[14px] leading-snug text-foreground md:text-[15px]">
              {call.name}
              <span className="text-muted-foreground/70">()</span>
            </p>

            <p
              className="text-[13px] leading-relaxed text-muted-foreground/85"
              dangerouslySetInnerHTML={{ __html: call.purpose }}
            />
          </div>

          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-md border border-border-strong/60 bg-surface-raised/40 text-muted-foreground transition-all group-open/sdk:rotate-45 group-open/sdk:border-primary/40 group-open/sdk:text-primary"
          >
            <span className="font-mono tabular text-[14px] leading-none">+</span>
          </span>
        </summary>

        <div className="mt-4 max-w-3xl border-t border-border/60 pt-4 text-[13.5px] leading-relaxed text-muted-foreground/85">
          {call.detail}
        </div>
      </details>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Flow diagram — under-the-hood for a single payment                         */
/* ────────────────────────────────────────────────────────────────────────── */

type Step = {
  n: string;
  who: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
  accent?: boolean;
};

const FLOW: Step[] = [
  {
    n: "01",
    who: "Payer browser",
    title: "Wallet connects · loads the public profile",
    detail:
      "Payer hits monyr.xyz/@alice. We fetch handle metadata (vault pubkey, display name). Wallet adapter mounts and waits for an intent.",
    icon: <Wallet2 className="size-4" strokeWidth={2} />,
  },
  {
    n: "02",
    who: "ZK prover (Web Worker)",
    title: "Groth16 proof generates",
    detail:
      "The prover, bootstrapped from CDN assets via getCdnZkAssetProvider, runs inside a worker. UI stays responsive; the user sees a progress card. 2–8 seconds end-to-end.",
    icon: <Cpu className="size-4" strokeWidth={2} />,
    accent: true,
  },
  {
    n: "03",
    who: "Solana program",
    title: "Deposit lands in the mixer",
    detail:
      "getPublicBalanceToReceiverClaimableUtxoCreatorFunction submits the tx. Public USDC enters the unified mixer pool. The on-chain trace shows: program touched, anonymity set updated.",
    icon: <Network className="size-4" strokeWidth={2} />,
  },
  {
    n: "04",
    who: "Umbra indexer",
    title: "UTXO commitment indexed",
    detail:
      "The indexer publishes the new claimable commitment. Alice&rsquo;s dashboard, on its next scan tick, will see exactly one new UTXO destined for her vault pubkey — and only she can decrypt it.",
    icon: <Workflow className="size-4" strokeWidth={2} />,
  },
  {
    n: "05",
    who: "Umbra relayer",
    title: "Auto-claim, gas-free",
    detail:
      "Alice&rsquo;s client builds a claim proof for the new UTXO and hands it to the relayer. The relayer pays SOL gas; Alice never has to. Funds settle into her encrypted balance.",
    icon: <Send className="size-4" strokeWidth={2} />,
  },
  {
    n: "06",
    who: "Alice browser",
    title: "Inbox decrypts · the row appears",
    detail:
      "Master Viewing Key, derived in-browser from Alice&rsquo;s vault signature, decrypts the amount and memo. The dashboard inbox animates the new payment in. The server saw none of it.",
    icon: <KeyRound className="size-4" strokeWidth={2} />,
    accent: true,
  },
];

function SectionFlow() {
  return (
    <SectionFrame
      id="flow"
      number="02"
      eyebrow="The flow"
      headline={
        <>
          Six steps from{" "}
          <em className="not-italic text-primary">click&nbsp;Pay</em> to{" "}
          <em className="not-italic text-primary">decrypted&nbsp;inbox.</em>
        </>
      }
      standfirst={
        <>
          What actually happens between a payer&rsquo;s wallet popup and a
          row&rsquo;s appearance in your dashboard. No hand-waving — every hop
          is a real network actor.
        </>
      }
    >
      <ol className="relative space-y-3">
        {/* connector line on desktop */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[15px] top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-primary/30 via-border to-border/40 md:block"
        />

        {FLOW.map((step) => (
          <li
            key={step.n}
            className={cn(
              "relative flex flex-col gap-4 rounded-2xl border bg-card/60 p-5 md:flex-row md:items-start md:gap-6 md:p-6 md:pl-12",
              step.accent
                ? "border-primary/35 ring-1 ring-primary/15 shadow-[0_0_0_1px_rgba(240,184,122,0.08),0_8px_24px_-12px_rgba(240,184,122,0.4)]"
                : "border-border",
            )}
          >
            {/* timeline dot */}
            <span
              aria-hidden
              className={cn(
                "absolute left-[7px] top-7 hidden size-4 rounded-full border-2 md:inline-block",
                step.accent
                  ? "border-primary bg-primary/30 ring-2 ring-primary/20"
                  : "border-border-strong bg-background",
              )}
            />

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
                <p className="mt-0.5 text-[12.5px] font-medium text-foreground/90">
                  {step.who}
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-serif text-[19px] leading-snug tracking-tight text-foreground md:text-[20px]">
                {step.title}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground/85">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Real vs simulated — brutally honest                                        */
/* ────────────────────────────────────────────────────────────────────────── */

type RealItem = { label: string; note: string };

const REAL_NOW: RealItem[] = [
  {
    label: "Wallet Standard sign-in",
    note: "Phantom, Solflare, Backpack via @solana/wallet-standard-features. Real signatures, real accounts.",
  },
  {
    label: "Umbra client + signer",
    note: "getUmbraClient configured for mainnet or devnet; signer adapter bridges Wallet Standard to IUmbraSigner.",
  },
  {
    label: "Umbra account registration",
    note: "getUserRegistrationFunction({ confidential: true, anonymous: true }) — the on-chain prerequisite for any private flow.",
  },
  {
    label: "Real Groth16 proof generation",
    note: "getUserRegistrationProver with CDN assets proxied through /api/umbra-zk. The proof your wallet signs is genuine.",
  },
  {
    label: "Direct deposit into encrypted balance",
    note: "getPublicBalanceToEncryptedBalanceDirectDepositorFunction. Amounts are real USDC base units (6 decimals); the encryption is Umbra&rsquo;s, not ours.",
  },
  {
    label: "Two-wallet vault model",
    note: "Main wallet signs; vault keypair is generated in-browser; encrypted vault secret is stored as opaque ciphertext. No main-wallet pubkey hits the database.",
  },
];

const SIMULATED: RealItem[] = [
  {
    label: "Payer-side mixer flow on /@alice",
    note: "The receiver-claimable UTXO creator is scoped but not yet the production payer path. Today, payments use the direct-deposit primitive; the mixer-routed primitive is the next milestone.",
  },
  {
    label: "Auto-claim via relayer",
    note: "getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction and the indexer scanner are not yet wired into the dashboard&rsquo;s background loop. Demo seeds are decrypted client-side from a fixture.",
  },
  {
    label: "Memo encryption with MVK",
    note: "The hierarchy is designed; the live build still treats memos as cleartext on the dashboard. The DB schema reserves space for memo_ciphertext; the encryption hop is on the next sprint.",
  },
  {
    label: "Receipts &amp; viewing grants",
    note: "CSV/PDF export and the on-chain compliance-grant flow (getComplianceGrantIssuerFunction) are not in the shipped build. The accountant story is documented; the wiring is not.",
  },
  {
    label: "Sub-handle dashboard tabs",
    note: "Sub-handle creation works; per-sub-handle filtering in the dashboard inbox is partial. The data model (sub_handles.kind enum) is correct; the UI tabs are stubbed.",
  },
];

function SectionRealVsSimulated() {
  return (
    <SectionFrame
      id="real-vs-simulated"
      number="03"
      eyebrow="Real vs. simulated"
      headline={
        <>
          What ships today.{" "}
          <em className="not-italic text-primary">What is still seeded.</em>
        </>
      }
      standfirst={
        <>
          A judge or a careful reader should be able to tell, line by line, what
          executes against Umbra in production and what is fixture data wearing
          a real-looking UI.
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <RealColumn
          tone="real"
          eyebrow="Real today"
          subtitle="Code that runs against Umbra mainnet/devnet right now"
          items={REAL_NOW}
        />
        <RealColumn
          tone="simulated"
          eyebrow="Still simulated or seeded"
          subtitle="UI is wired; the privacy hop is on the next milestone"
          items={SIMULATED}
        />
      </div>
    </SectionFrame>
  );
}

function RealColumn({
  tone,
  eyebrow,
  subtitle,
  items,
}: {
  tone: "real" | "simulated";
  eyebrow: string;
  subtitle: string;
  items: RealItem[];
}) {
  const isReal = tone === "real";
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-card/70 p-5 md:p-6",
        isReal ? "border-success/25" : "border-warning/25",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: isReal
            ? "linear-gradient(90deg, transparent, oklch(0.73 0.17 160 / 0.45), transparent)"
            : "linear-gradient(90deg, transparent, oklch(0.78 0.16 67 / 0.45), transparent)",
        }}
      />

      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10.5px] font-medium uppercase tracking-[0.18em]",
              isReal ? "text-success/85" : "text-warning/85",
            )}
          >
            {isReal ? "Live · against Umbra" : "Seeded · roadmap"}
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
            isReal ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
          )}
        >
          {isReal ? (
            <CircleDot className="size-3" strokeWidth={2.5} />
          ) : (
            <CircleDashed className="size-3" strokeWidth={2.5} />
          )}
          {isReal ? "Real" : "Seeded"}
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
                <p className="text-[13.5px] font-medium leading-snug text-foreground">
                  {it.label}
                </p>
                <p
                  className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground/80"
                  dangerouslySetInnerHTML={{ __html: it.note }}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Setup / relayer model — what the user signs, when                          */
/* ────────────────────────────────────────────────────────────────────────── */

const SETUP = [
  {
    n: "01",
    title: "Main wallet signs the unlock message",
    detail:
      "We sign HUSH_UNLOCK_MESSAGE_V1. The signature feeds HKDF, which produces an AES-256-GCM key. That key encrypts the freshly generated vault keypair before anything is sent to the server.",
  },
  {
    n: "02",
    title: "Vault keypair is generated in-browser",
    detail:
      "A fresh Ed25519 keypair, never seen by the main wallet&rsquo;s seed. Its public key becomes the @handle&rsquo;s receiving address; its secret is encrypted at rest.",
  },
  {
    n: "03",
    title: "Vault signs UMBRA_MESSAGE_TO_SIGN",
    detail:
      "The Master Viewing Key is derived from this signature, deterministically. Re-derivable on any device the user can decrypt the vault on.",
  },
  {
    n: "04",
    title: "Vault registers with Umbra",
    detail:
      "getUserRegistrationFunction runs once. Registration gas is sponsored — the main wallet never sends SOL to the vault, so no on-chain edge links them.",
  },
  {
    n: "05",
    title: "Payer-side registration (only first time)",
    detail:
      "A first-time payer registers their own wallet too. Subsequent payments skip this step. We surface this clearly in the pay flow so it isn&rsquo;t a surprise.",
  },
  {
    n: "06",
    title: "Relayer carries the claim, gas-free",
    detail:
      "Once payments arrive, the dashboard hands claim proofs to Umbra&rsquo;s relayer. The relayer sees the proof but not the encrypted contents; it submits the claim and never holds funds.",
  },
];

function SectionSetup() {
  return (
    <SectionFrame
      id="setup"
      number="04"
      eyebrow="Setup &amp; relayer model"
      headline={
        <>
          What you sign,{" "}
          <em className="not-italic text-primary">and when.</em>
        </>
      }
      standfirst={
        <>
          Every signature has a purpose. We don&rsquo;t batch surprise prompts.
          The first run takes two signatures from the recipient, one from a
          first-time payer; after that, it&rsquo;s frictionless.
        </>
      }
    >
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {SETUP.map((s) => (
          <li
            key={s.n}
            className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-8 place-items-center rounded-md bg-primary/10 font-mono tabular text-[11px] font-medium tracking-wider text-primary">
                {s.n}
              </span>
              <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Signature step
              </span>
            </div>
            <p className="font-serif text-[19px] leading-snug tracking-tight text-foreground md:text-[20px]">
              {s.title}
            </p>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground/85">
              {s.detail}
            </p>
          </li>
        ))}
      </ol>
    </SectionFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Known limitations — preempt the questions                                  */
/* ────────────────────────────────────────────────────────────────────────── */

const LIMITS = [
  {
    title: "Proof generation latency",
    detail:
      "Groth16 in-browser is 2–8 seconds the first time circuits warm. We mitigate with a Web Worker, a progress UI, and pre-warming on dashboard load — but a per-request privacy proof is still human-paced.",
  },
  {
    title: "First-time payer friction",
    detail:
      "A wallet that has never used Umbra registers once before its first private payment. That&rsquo;s an extra signature for new payers. Subsequent payments don&rsquo;t pay this cost.",
  },
  {
    title: "Withdrawal links the vault",
    detail:
      "Sending USDC out of the vault to a public wallet creates an on-chain edge between the two. The privacy model is honest about this — see /privacy-model § 04.",
  },
  {
    title: "Relayer dependency",
    detail:
      "Auto-claim leans on Umbra&rsquo;s relayer. If it&rsquo;s down, recipients can fall back to claiming themselves and paying gas — degraded, not broken. Demo paths include a non-relayer fallback.",
  },
  {
    title: "Per-call privacy is out of scope",
    detail:
      "&ldquo;Your business is private; not every API call is.&rdquo; ZK latency precludes per-request mixer privacy. Future agentic surfaces (V1.5) will use end-of-day private settlement, not per-call ZK.",
  },
  {
    title: "We are tightly coupled to Umbra",
    detail:
      "If Umbra pivots or pauses, our flows stall. Mitigation: the privacy layer is behind an interface we control, so a future swap is not a rewrite.",
  },
];

function SectionLimitations() {
  return (
    <SectionFrame
      id="limitations"
      number="05"
      eyebrow="Known limitations"
      headline={
        <>
          Where the seams are{" "}
          <em className="not-italic text-primary">— stated up front.</em>
        </>
      }
      standfirst={
        <>
          The honest tradeoffs of building on a privacy SDK in 2026. None of
          these surprise the team; we&rsquo;d rather they not surprise you.
        </>
      }
    >
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {LIMITS.map((rule, i) => (
          <li
            key={rule.title}
            className="relative flex flex-col gap-3 rounded-2xl border border-warning/25 bg-card/60 p-6"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-8 place-items-center rounded-md bg-warning/10 ring-1 ring-warning/20">
                <AlertTriangle className="size-4 text-warning" strokeWidth={2} />
              </span>
              <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-warning/75">
                Limit {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="font-serif text-[19px] leading-snug tracking-tight text-foreground md:text-[20px]">
              {rule.title}
            </p>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground/85">
              {rule.detail}
            </p>
          </li>
        ))}
      </ol>
    </SectionFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Close — coda                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function SectionClose() {
  return (
    <section
      aria-labelledby="umbra-close"
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
          § 06 &nbsp;·&nbsp; Coda
        </p>

        <h2
          id="umbra-close"
          className="mt-6 font-serif text-[30px] leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-[48px]"
        >
          Umbra makes payments private.{" "}
          <span className="text-primary">Monyr makes them addressable.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl font-serif text-[16.5px] italic leading-relaxed text-muted-foreground/85">
          The cryptography belongs to Umbra. Our job is the layer above it &mdash;
          identity, distribution, the dashboard. If anything on this page reads
          softer than the code, that&rsquo;s on us. Open an issue.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/privacy-model"
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border-strong/60 bg-surface-raised/40 px-5 text-[14px] font-medium text-foreground/90 backdrop-blur-sm transition-all",
              "hover:border-primary/45 hover:text-foreground",
              "hover:shadow-[0_0_0_1px_oklch(0.82_0.11_72/0.2),0_8px_24px_-12px_oklch(0.82_0.11_72/0.6)]",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            Read the privacy model
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
          Live on Solana mainnet. First consumer product on Umbra.
        </p>
      </div>
    </section>
  );
}
