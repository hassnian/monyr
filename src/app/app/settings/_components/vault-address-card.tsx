"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";

type Props = {
  vaultPubkey: string;
};

function explorerUrlForAddress(address: string) {
  const cluster = solanaPaymentConfig.chain;
  const isMainnet =
    cluster === "solana:mainnet" || cluster === "solana:mainnet-beta";
  const base = `https://solscan.io/account/${address}`;
  if (isMainnet) return base;
  if (cluster === "solana:devnet") return `${base}?cluster=devnet`;
  if (cluster === "solana:testnet") return `${base}?cluster=testnet`;
  return base;
}

/**
 * Editorial card showing the on-chain vault account. Always visible — the
 * pubkey is public information, the encrypted contents aren't. Copy lives
 * inline; explorer link sits as a quieter ghost button on the right.
 */
export function VaultAddressCard({ vaultPubkey }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    try {
      navigator.clipboard?.writeText(vaultPubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked — ignore. */
    }
  }

  return (
    <section
      aria-labelledby="vault-address-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card/80 p-5 sm:p-6",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_24px_48px_-32px_rgba(0,0,0,0.5)]",
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            Vault address
          </span>
          <h2
            id="vault-address-heading"
            className="font-serif text-[22px] leading-tight tracking-tight text-foreground"
          >
            Where your private payments settle.
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
          <ShieldCheck className="size-3" strokeWidth={2.25} />
          Public · safe to share
        </span>
      </header>

      <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground/90">
        This is the on-chain Solana account derived from your handle. Your
        @handle wraps it for you — recipients never need to see this. Use it
        only for on-chain inspection or recovery.
      </p>

      <div
        className={cn(
          "mt-5 flex flex-col gap-3 rounded-xl border border-border/70 bg-surface-raised/30 p-4",
          "sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        )}
      >
        <code
          className="block min-w-0 break-all font-mono tabular text-[12.5px] leading-relaxed text-foreground/90"
          aria-label="Vault address"
        >
          {vaultPubkey}
        </code>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={copy}
            aria-live="polite"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong/60 bg-surface-raised/40 px-3 text-[12.5px] font-medium",
              "transition-all hover:border-primary/45 hover:bg-surface-raised/70",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-primary" strokeWidth={2.5} />
                <span className="text-primary">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy
              </>
            )}
          </button>
          <a
            href={explorerUrlForAddress(vaultPubkey)}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong/60 bg-surface-raised/40 px-3 text-[12.5px] font-medium text-muted-foreground",
              "transition-all hover:border-primary/45 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <ExternalLink className="size-3.5" />
            Solscan
          </a>
        </div>
      </div>
    </section>
  );
}
