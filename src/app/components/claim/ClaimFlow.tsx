"use client";

import { handleUrl } from "@/lib/brand";
import { useEffect, useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { useClaimFlow } from "@/app/hooks/useClaimFlow";
import { useAuth } from "@/app/contexts/auth-context";
import HandleClaimForm from "./ClaimForm";

import { ConnectWallets } from "../wallet/ConnectWallets";

import { ArrowRight, Check, Copy, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function ClaimFlow() {
  const { step, goTo } = useClaimFlow();
  const { isConnected, isUserLoading, user } = useAuth();
  const [claimedHandle, setClaimedHandle] = useState("");

  useEffect(() => {
    if (isConnected && !isUserLoading && !user && step === "connect-wallet") {
      goTo("claim-handle");
    }
  }, [goTo, isConnected, isUserLoading, step, user]);

  if (user && step === "connect-wallet") {
    redirect("/app");
  }

  if (isConnected && isUserLoading) {
    return <ClaimLoading />;
  }

  const isClaimed = step === "claimed";

  return (
    <section className="relative w-full max-w-lg">
      <div
        aria-hidden
        className="absolute -inset-x-8 -inset-y-12 -z-10 blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 25%, oklch(0.82 0.11 72 / 0.14), transparent 70%)",
        }}
      />

      {isClaimed ? (
        <ClaimedView handle={claimedHandle} />
      ) : (
        <>
          <ClaimHeader step={step} />

          <div className="mt-8 rounded-2xl border border-border bg-card p-7 md:p-9">
            {step === "connect-wallet" && (
              <>
                <StepTitle
                  title="Connect your wallet."
                  description="Bring your own wallet — Monyr never holds your keys or your balance."
                />
                <div className="mt-6">
                  <ConnectWallets onConnected={() => goTo("claim-handle")} />
                </div>
              </>
            )}

            {step === "claim-handle" && (
              <>
                <StepTitle
                  title="Claim your handle."
                  description="Pick a name, click claim. One signature, no gas — your handle is yours."
                />
                <div className="mt-6">
                  <HandleClaimForm
                    onClaimed={(h) => {
                      setClaimedHandle(h);
                      goTo("claimed");
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
            Already have a handle?{" "}
            <Link
              href="/app"
              className="text-foreground/90 underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
            >
              Open your dashboard
            </Link>
            .
          </p>
        </>
      )}
    </section>
  );
}

function ClaimLoading() {
  return (
    <section className="relative flex min-h-[360px] w-full max-w-lg flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="size-5 animate-spin text-primary" />
      <p className="font-serif italic text-[14px] text-muted-foreground/80">
        Checking your handle…
      </p>
    </section>
  );
}

function ClaimHeader({ step }: { step: string }) {
  const steps = [
    { id: "connect-wallet", label: "Wallet" },
    { id: "claim-handle", label: "Handle" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
        Your handle is <br className="hidden sm:block" />
        <em className="text-primary not-italic">your payment profile.</em>
      </h1>
      <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Claim it once, put it in your bio, get paid privately. Your wallet
        history, your balance, and your memos stay off the public ledger.
      </p>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full border text-[10px] font-medium",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary text-primary",
                  !done && !current && "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wider",
                  current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <span className="mx-1 h-px w-6 bg-border" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[48ch]">
        {description}
      </p>
    </div>
  );
}

function ClaimedView({ handle }: { handle: string }) {
  const displayHandle = handle || "yourname";

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-7">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full blur-2xl"
          style={{
            background: "oklch(0.82 0.11 72 / 0.35)",
            animation: "hushPulse 2.6s ease-in-out infinite",
          }}
        />
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30 animate-in fade-in zoom-in-95 duration-500">
          <Check className="size-6 text-primary" strokeWidth={2.5} />
        </div>
        <style>{`
          @keyframes hushPulse {
            0%, 100% { opacity: 0.35; transform: scale(1); }
            50% { opacity: 0.65; transform: scale(1.15); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes hushPulse { 0%, 100% { opacity: 0.4; transform: scale(1); } }
          }
        `}</style>
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-primary/85">
        Handle claimed
      </p>

      <h1 className="mt-4 font-serif text-[2.5rem] leading-[1.02] tracking-tight text-foreground md:text-5xl">
        You&apos;re live,{" "}
        <span className="whitespace-nowrap">
          <span className="text-muted-foreground/60">@</span>
          <span className="text-primary">{displayHandle}</span>
          <span className="text-primary">.</span>
        </span>
      </h1>

      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Your profile is ready. Paste the link anywhere — every payment lands in
        your vault, no wallet address required.
      </p>

      <UrlShowcase handle={displayHandle} />

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/@${displayHandle}`}
          className={cn(
            "inline-flex h-12 items-center justify-center rounded-xl px-6 text-[15px] font-semibold",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "ring-1 ring-primary/30 transition-all",
            "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
            "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
            "active:translate-y-px"
          )}
        >
          See your profile
          <ArrowRight className="ml-1.5 size-4" />
        </Link>
        <Link
          href="/app"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-border-strong bg-transparent px-6 text-[15px] font-medium text-foreground/90 transition-colors hover:bg-surface-raised/50"
        >
          Open dashboard
        </Link>
      </div>

      <p className="mt-12 max-w-sm font-serif text-[13px] italic leading-relaxed text-muted-foreground/70">
        Tip &nbsp;·&nbsp; paste{" "}
        <span className="font-mono not-italic tracking-tight text-foreground/80">
          {handleUrl(displayHandle)}
        </span>{" "}
        into a Twitter bio, a newsletter footer, or a GitHub README. Payers
        don&apos;t need an account.
      </p>
    </div>
  );
}

function UrlShowcase({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);
  const url = handleUrl(handle);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  };

  return (
    <div className="mt-8 flex w-full items-center gap-1.5 rounded-xl border border-border-strong bg-surface-raised/40 p-1.5">
      <div className="flex min-w-0 flex-1 items-center px-3 font-mono text-[14px] tracking-tight text-foreground">
        <span className="truncate">
          <span className="text-muted-foreground/70">https://</span>
          {url}
        </span>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all",
          copied
            ? "bg-primary/15 text-primary"
            : "bg-surface-raised text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        )}
        aria-live="polite"
      >
        {copied ? (
          <>
            <Check className="size-3.5" strokeWidth={3} /> Copied
          </>
        ) : (
          <>
            <Copy className="size-3.5" /> Copy link
          </>
        )}
      </button>
    </div>
  );
}
