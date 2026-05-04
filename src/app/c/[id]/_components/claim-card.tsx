"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWalletModal } from "@/app/components/wallet/ConnectWalletModal";
import { useWallet } from "@/app/contexts/wallet-context";
import { formatDecimalAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { cn } from "@/lib/utils";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import type { ClaimableLink } from "../_data";

type Phase = "idle" | "claiming" | "claimed";

export function ClaimCard({ link }: { link: ClaimableLink }) {
  const { connectedWallet } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [connectOpen, setConnectOpen] = useState(false);

  const isClaiming = phase === "claiming";
  const isClaimed = phase === "claimed";

  function startClaim() {
    if (!connectedWallet) {
      setConnectOpen(true);
      return;
    }
    runClaim();
  }

  function runClaim() {
    setPhase("claiming");
    window.setTimeout(() => setPhase("claimed"), 1500);
  }

  const formatted = formatDecimalAmount(link.amount, {
    decimals: solanaPaymentConfig.tokenDecimals,
  });
  const [whole, decimal = "00"] = formatted.split(".");

  return (
    <>
      {isClaimed && <ConfettiBurst />}

      <section
        aria-labelledby="gift-amount"
        className="relative w-full max-w-md"
      >
        {/* Amber candlelight glow — a touch warmer than the profile, this is the moment */}
        <div
          aria-hidden
          className={cn(
            "absolute -inset-x-10 -inset-y-14 -z-10 blur-3xl transition-opacity duration-1000",
            isClaimed ? "opacity-90" : "opacity-70",
          )}
          style={{
            background:
              "radial-gradient(60% 50% at 50% 30%, oklch(0.82 0.11 72 / 0.22), transparent 70%)",
          }}
        />

        <div
          className={cn(
            "relative rounded-2xl border bg-card px-7 py-9 md:px-9 md:py-11",
            "transition-colors duration-700",
            isClaimed ? "border-success/30" : "border-border",
          )}
        >
          {/* Eyebrow — flips to "Claimed" on success */}
          <div className="flex justify-center">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                "font-mono tabular text-[10px] uppercase tracking-[0.24em]",
                "transition-all duration-500",
                isClaimed
                  ? "border-success/45 bg-success/10 text-success"
                  : "border-border bg-surface-raised/40 text-muted-foreground/85",
              )}
            >
              {isClaimed ? (
                <>
                  <Check className="size-3" strokeWidth={2.5} />
                  Claimed
                </>
              ) : (
                "Private gift"
              )}
            </span>
          </div>

          {/* Hero amount — the moment */}
          <div className="mt-7 text-center">
            <h1
              id="gift-amount"
              className={cn(
                "inline-flex items-baseline gap-1 font-mono tabular leading-none tracking-tight text-foreground",
                "text-[clamp(3.6rem,16vw,5.6rem)]",
                "transition-transform duration-700",
                isClaimed && "[transform:scale(1.02)]",
              )}
            >
              <span>{whole}</span>
              <span className="text-[0.42em] text-muted-foreground/55">
                .{decimal}
              </span>
            </h1>
            <p className="mt-3 font-mono tabular text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground/70">
              USDC · Solana
            </p>
          </div>

          {/* Memo — the letter content */}
          {link.memo && (
            <p className="mt-7 text-center font-serif italic text-[15.5px] leading-relaxed text-foreground/85">
              &ldquo;{link.memo}&rdquo;
            </p>
          )}

          <div className="my-7 h-px w-full bg-border" />

          {/* Attribution */}
          <div className="flex items-center justify-center gap-2 text-center">
            <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              From
            </span>
            {link.sender ? (
              <span className="inline-flex items-baseline gap-0.5 text-[14px] font-medium tracking-tight">
                <span className="text-muted-foreground/70">@</span>
                <span className="text-foreground">{link.sender.handle}</span>
              </span>
            ) : (
              <span className="font-serif italic text-[14px] text-muted-foreground/85">
                someone who knows you
              </span>
            )}
          </div>

          {/* CTA — single primary action that morphs by phase */}
          <div className="mt-7">
            {isClaimed ? (
              <Link
                href="/app"
                className={cn(
                  "group/cta flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                  "bg-success/12 text-success ring-1 ring-success/40",
                  "text-base font-semibold transition-all",
                  "hover:bg-success/18",
                  "shadow-[0_0_0_1px_rgba(86,179,140,0.18),0_8px_24px_-8px_rgba(86,179,140,0.45)]",
                )}
              >
                <Check className="size-4" strokeWidth={2.5} />
                Open your vault
                <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
              </Link>
            ) : (
              <Button
                type="button"
                onClick={startClaim}
                disabled={isClaiming}
                className={cn(
                  "h-12 w-full rounded-xl text-base font-semibold transition-all",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "ring-1 ring-primary/30",
                  "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
                  "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
                  "disabled:opacity-90",
                )}
              >
                {isClaiming ? (
                  <>
                    <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Opening…
                  </>
                ) : connectedWallet ? (
                  "Claim this gift"
                ) : (
                  "Connect wallet to claim"
                )}
              </Button>
            )}
          </div>

          {/* Footnote — security context */}
          <p
            className={cn(
              "mt-4 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed",
              "transition-colors duration-500",
              isClaimed ? "text-success/85" : "text-muted-foreground/85",
            )}
          >
            <Lock className="size-3" strokeWidth={2} />
            {isClaimed
              ? "Sealed, encrypted, yours."
              : "One-time link · Sealed until claim"}
          </p>
        </div>
      </section>

      <ConnectWalletModal
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={() => {
          setConnectOpen(false);
          window.setTimeout(runClaim, 220);
        }}
      />
    </>
  );
}

