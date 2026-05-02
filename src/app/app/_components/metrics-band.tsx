"use client";

import { useState } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, ShieldCheck, Clock, Loader2, Lock } from "lucide-react";
import { AmountDisplay } from "@/components/payments/amount-display";
import { cn } from "@/lib/utils";
import { ActivitySpark } from "./activity-spark";
import { DashboardSyncIndicator } from "./dashboard-sync-indicator";
import { useAuth, type AuthUser } from "@/app/contexts/auth-context";
import { useUmbra } from "@/app/hooks/useUmbra";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { dailyFlow, metrics } from "../_data";

/**
 * The "prospectus strip" — four editorial metric tiles, plus an oversized hero
 * tile holding the 30-day sparkline. Vault unlock is owned by the dashboard's
 * locked banner; this band only fetches the encrypted balance once the vault
 * is already unlocked, and exposes a cosmetic blur toggle for users who want
 * to hide on-screen amounts.
 */
export function MetricsBand({ user }: { user: AuthUser }) {
  const [revealed, setRevealed] = useState(true);
  const { unlockedVault } = useAuth();
  const { getPrivateUsdcBalance } = useUmbra();

  const isActive = user.umbraStatus === "active";
  const isUnlocked =
    isActive && unlockedVault?.vaultPubkey === user.vaultPubkey;

  const { data: privateBalance, isFetching: isLoadingBalance } = useQuery({
    enabled: isUnlocked && Boolean(unlockedVault),
    queryKey: ["metrics", "private-balance", unlockedVault?.vaultPubkey],
    queryFn: async () => {
      if (!unlockedVault) return null;
      const result = await getPrivateUsdcBalance({
        signer: createUmbraSignerFromKeyPair(unlockedVault.keyPairSigner),
      });
      return result.state === "shared"
        ? Number(result.balance) / 10 ** solanaPaymentConfig.tokenDecimals
        : null;
    },
    staleTime: 30_000,
    retry: false,
  });

  // Cosmetic on-screen blur — separate from the vault unlock concept. Shown
  // only after unlock; before that, amounts are inherently hidden.
  const showAmounts = isUnlocked && revealed;

  return (
    <section aria-label="Summary">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          At a glance
        </span>
        <div className="flex items-center gap-1">
          {isUnlocked && <DashboardSyncIndicator />}
          {isUnlocked ? (
            <>
              <span aria-hidden className="mx-0.5 h-3 w-px bg-border/70" />
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                aria-pressed={revealed}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wider",
                  "text-muted-foreground transition-colors hover:text-foreground",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                {revealed ? (
                  <>
                    <Eye className="size-3" strokeWidth={2.25} />
                    Amounts shown
                  </>
                ) : (
                  <>
                    <EyeOff className="size-3" strokeWidth={2.25} />
                    Amounts hidden
                  </>
                )}
              </button>
            </>
          ) : isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono tabular text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
              <Lock className="size-3" strokeWidth={2.25} />
              Locked
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Hero tile — total received + sparkline */}
        <Tile
          className="md:col-span-3"
          label="Total received (private)"
          eyebrow={
            isLoadingBalance ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground/80">
                <Loader2 className="size-3 animate-spin text-primary" />
                Decrypting balance…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground/80">
                <ShieldCheck className="size-3 text-success" strokeWidth={2.25} />
                Only you can decrypt
              </span>
            )
          }
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <AmountDisplay
                amount={privateBalance ?? null}
                hidden={!showAmounts}
                size="xl"
                className="leading-none"
              />
              <p className="mt-2 text-[12px] text-muted-foreground/80">
                <span className="font-mono tabular">{metrics.totalReceivedCount}</span> payments ·
                across <span className="font-mono tabular">6</span> labels & invoices
              </p>
            </div>

          </div>
          <div className="mt-3 -mx-1 text-foreground/60">
            <ActivitySpark data={dailyFlow} height={44} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
            <span>Mar 25</span>
            <span>Apr 24</span>
          </div>
        </Tile>

        {/* Month-to-date */}
        <Tile
          className="md:col-span-1"
          label="This month"
          eyebrow={
            <span className="whitespace-nowrap text-[11px] text-muted-foreground/80">
              April · to date
            </span>
          }
        >
          <AmountDisplay amount={metrics.monthToDate} hidden={!showAmounts} size="lg" />
          <p className="mt-2 text-[12px] text-muted-foreground/80">
            <span className="font-mono tabular">{metrics.monthToDateCount}</span> payments
          </p>
        </Tile>

        {/* Pending claims */}
        <Tile
          className="md:col-span-1"
          label="Pending"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground/80">
              <Clock className="size-3" strokeWidth={2.25} />
              Auto-claiming
            </span>
          }
        >
          <AmountDisplay amount={metrics.pendingAmount} hidden={!showAmounts} size="lg" />
          <p className="mt-2 text-[12px] text-muted-foreground/80">
            <span className="font-mono tabular">{metrics.pendingClaims}</span> UTXO in flight
          </p>
        </Tile>

        {/* Active send-links */}
        <Tile
          className="md:col-span-1"
          label="Active links"
          eyebrow={
            <span className="whitespace-nowrap text-[11px] text-muted-foreground/80">
              one-off sends
            </span>
          }
        >
          <p className="font-serif text-4xl leading-none tracking-tight text-foreground">
            {metrics.activeLinks}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground/80">
            unclaimed · awaiting recipient
          </p>
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  label,
  eyebrow,
  children,
  className,
}: {
  label: string;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[148px] flex-col rounded-xl border border-border bg-card/80 p-5",
        // Inset catch-light + soft drop
        "shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_24px_48px_-32px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {eyebrow}
      </div>
      {/* Content sits flush against the bottom — header pinned up top, the
          number anchors down the page so the empty space lives between them
          as deliberate breathing room, not a hollow tail. */}
      <div className="flex flex-1 flex-col justify-end pt-5">
        {children}
      </div>
    </div>
  );
}

