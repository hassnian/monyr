"use client";

import { useState } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";
import { AmountDisplay } from "@/components/payments/amount-display";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ActivitySpark } from "./activity-spark";
import { DashboardSyncIndicator } from "./dashboard-sync-indicator";
import { WithdrawDialog } from "./withdraw-dialog";
import { useAuth, type AuthUser } from "@/app/contexts/auth-context";
import { useWallet } from "@/app/contexts/wallet-context";
import { useUmbra } from "@/app/hooks/useUmbra";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { useClaimedPaymentSummary } from "@/app/hooks/useClaimableUtxos";
import {
  useInboxPayments,
  useInboxSummary,
} from "@/app/hooks/useInboxPayments";

/**
 * The "prospectus strip" — four editorial metric tiles, plus an oversized hero
 * tile holding the 30-day sparkline. Vault unlock is owned by the dashboard's
 * locked banner; this band only fetches the encrypted balance once the vault
 * is already unlocked, and exposes a cosmetic blur toggle for users who want
 * to hide on-screen amounts.
 */
export function MetricsBand({ user }: { user: AuthUser }) {
  const [revealed, setRevealed] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { unlockedVault } = useAuth();
  const { account } = useWallet();
  const { getPrivateUsdcBalance } = useUmbra();
  const {
    data: inboxPayments = [],
    isFetching: isLoadingInbox,
    isLoading: isInitialLoadingInbox,
  } = useInboxPayments();
  const inboxSummary = useInboxSummary(inboxPayments);
  const claimedSummary = useClaimedPaymentSummary();

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
      const balance =
        result.state === "shared"
          ? Number(result.balance) / 10 ** solanaPaymentConfig.tokenDecimals
          : null;

      console.info("[Umbra] Private balance query completed", {
        vaultPubkey: unlockedVault.vaultPubkey,
        state: result.state,
        rawBalance: result.state === "shared" ? result.balance.toString() : null,
        balance,
      });

      return balance;
    },
    staleTime: 30_000,
    retry: false,
  });

  // Cosmetic on-screen blur — separate from the vault unlock concept. Shown
  // only after unlock; before that, amounts are inherently hidden.
  const showAmounts = isUnlocked && revealed;

  const canWithdraw =
    isUnlocked &&
    !isLoadingBalance &&
    privateBalance != null &&
    privateBalance > 0;

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
            isLoadingBalance || isLoadingInbox ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground/80">
                <Loader2 className="size-3 animate-spin text-primary" />
                Syncing inbox…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground/80">
                <ShieldCheck className="size-3 text-success" strokeWidth={2.25} />
                Only you can decrypt
              </span>
            )
          }
        >
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            disabled={!canWithdraw}
            aria-label="Withdraw to wallet"
            className={cn(
              "group absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-all",
              "border-border bg-surface-raised/40 text-foreground/90",
              "hover:border-primary/40 hover:bg-primary/[0.06] hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:bg-surface-raised/40 disabled:hover:text-foreground/90",
            )}
          >
            <ArrowUpRight
              className="size-3.5 text-muted-foreground transition-colors group-hover:not-disabled:text-primary"
              strokeWidth={2.25}
            />
            Withdraw
          </button>

          <div className="min-w-0">
            <AmountDisplay
              amount={null}
              amountBaseUnits={claimedSummary.totalReceivedBaseUnits}
              hidden={!showAmounts}
              loading={isInitialLoadingInbox || claimedSummary.isLoading}
              size="xl"
              className="leading-none"
            />
            <div className="mt-2 text-[12px] text-muted-foreground/80">
              {isInitialLoadingInbox || claimedSummary.isLoading ? (
                <Skeleton className="inline-block h-3 w-44 align-middle bg-muted/50" />
              ) : (
                <>
                  <span className="font-mono tabular">
                    {showAmounts ? claimedSummary.totalReceivedCount : "••"}
                  </span>{" "}
                  payments · across{" "}
                  <span className="font-mono tabular">
                    {showAmounts ? inboxSummary.labelsAndInvoicesCount : "••"}
                  </span>{" "}
                  labels & invoices
                </>
              )}
            </div>
          </div>
          <div className="mt-3 -mx-1 text-foreground/60">
            <ActivitySpark data={claimedSummary.dailyFlow} height={44} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
            <span>{claimedSummary.rangeStartLabel}</span>
            <span>{claimedSummary.rangeEndLabel}</span>
          </div>
        </Tile>

        {/* Month-to-date */}
        <Tile
          className="md:col-span-1"
          label="This month"
          eyebrow={
            <span className="whitespace-nowrap text-[11px] text-muted-foreground/80">
              {inboxSummary.monthLabel} · to date
            </span>
          }
        >
          <AmountDisplay
            amount={null}
            amountBaseUnits={claimedSummary.monthToDateBaseUnits}
            hidden={!showAmounts}
            loading={isInitialLoadingInbox || claimedSummary.isLoading}
            size="lg"
          />
          <div className="mt-2 text-[12px] text-muted-foreground/80">
            {isInitialLoadingInbox || claimedSummary.isLoading ? (
              <Skeleton className="inline-block h-3 w-20 align-middle bg-muted/50" />
            ) : (
              <>
                <span className="font-mono tabular">
                  {showAmounts ? claimedSummary.monthToDateCount : "••"}
                </span>{" "}
                payments
              </>
            )}
          </div>
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
          <AmountDisplay
            amount={null}
            amountBaseUnits={inboxSummary.pendingAmountBaseUnits}
            hidden={!showAmounts}
            loading={isInitialLoadingInbox}
            size="lg"
          />
          <div className="mt-2 text-[12px] text-muted-foreground/80">
            {isInitialLoadingInbox ? (
              <Skeleton className="inline-block h-3 w-20 align-middle bg-muted/50" />
            ) : (
              <>
                <span className="font-mono tabular">
                  {showAmounts ? inboxSummary.pendingClaims : "••"}
                </span>{" "}
                incoming
              </>
            )}
          </div>
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
          {isInitialLoadingInbox ? (
            <Skeleton className="h-9 w-12 rounded-md bg-muted/60" />
          ) : (
            <p
              className={cn(
                "font-serif text-4xl leading-none tracking-tight",
                showAmounts ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {showAmounts ? inboxSummary.activeLinks : "••"}
            </p>
          )}
          <p className="mt-2 text-[12px] text-muted-foreground/80">
            unclaimed · awaiting recipient
          </p>
        </Tile>
      </div>

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableBalance={privateBalance ?? null}
        walletAddress={account?.address ?? null}
      />
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
