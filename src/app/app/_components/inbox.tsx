"use client";

import { handleUrl } from "@/lib/brand";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Search,
  MoreHorizontal,
  Shield,
  Loader2,
  CircleAlert,
  Wallet,
  Check,
} from "lucide-react";

import { GradientAvatar } from "@/components/payments/gradient-avatar";

import { AmountDisplay } from "@/components/payments/amount-display";

import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import type { Payment } from "../_data";
import { useAuth } from "@/app/contexts/auth-context";
import {
  hasCelebratedFirstClaim,
  markFirstClaimCelebrated,
  readStoredClaimStatus,
  useInboxPayments,
  writeStoredClaimStatus,
} from "@/app/hooks/useInboxPayments";
import {
  isUmbraUtxoAlreadySpentError,
  useUmbra,
} from "@/app/hooks/useUmbra";
import { useUnlockDashboard } from "@/app/hooks/useUnlockDashboard";

import {
  dateBucket,
  dateBucketLabels,
  dateBucketOrder,
  relativeTime,
  type DateBucket,
} from "../_utils";

/**
 * Canonical "list of money" surface. Rows are dense-but-breathable; the memo
 * renders in italic serif to echo the figcaption voice from the landing page —
 * it's editorial, not log output.
 */
function paymentTimestamp(payment: Payment) {
  const time = new Date(payment.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

type ClaimPhase = "idle" | "claiming" | "settled" | "failed";

export function Inbox({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [claimPhase, setClaimPhase] = useState<ClaimPhase>("idle");
  const [claimingIds, setClaimingIds] = useState<Set<string>>(() => new Set());
  const [claimedIds, setClaimedIds] = useState<Set<string>>(() => new Set());
  const [claimStorageRevision, setClaimStorageRevision] = useState(0);
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  const settledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staggerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { user, unlockedVault } = useAuth();
  const { claimReceiverClaimableUtxos } = useUmbra();
  const queryClient = useQueryClient();
  const { isUnlocked, isActive } = useUnlockDashboard();
  const isInactive = !isActive;

  const {
    data: payments = [],
    isFetching: loading,
  } = useInboxPayments();

  // Inbox is a ledger, not a queue: claimed payments stay in place as history.
  // The optimistic overlay tags ids with their post-claim state so the pill
  // flips ("Incoming" → "Claiming" → "Claimed") without an immediate refetch.
  useEffect(() => {
    onCountChange?.(payments.length);
  }, [onCountChange, payments.length]);

  useEffect(() => {
    return () => {
      if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
      staggerTimersRef.current.forEach(clearTimeout);
      staggerTimersRef.current = [];
    };
  }, []);

  const persistedClaimedIds = useMemo(() => {
    void claimStorageRevision;
    if (!unlockedVault) return new Set<string>();

    const ids = new Set<string>();
    for (const payment of payments) {
      const status = readStoredClaimStatus(unlockedVault.vaultPubkey, payment.id);
      if (status === "claiming" || status === "claimed") {
        ids.add(payment.id);
      }
    }
    return ids;
  }, [payments, unlockedVault, claimStorageRevision]);

  const effectiveClaimedIds = useMemo(
    () => new Set([...persistedClaimedIds, ...claimedIds]),
    [persistedClaimedIds, claimedIds],
  );

  const claimablePayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.status === "pending" &&
          !claimingIds.has(p.id) &&
          !effectiveClaimedIds.has(p.id),
      ),
    [payments, claimingIds, effectiveClaimedIds],
  );

  const visibleClaimPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.status === "pending" &&
          !effectiveClaimedIds.has(p.id) &&
          (claimingIds.has(p.id) || claimablePayments.some((c) => c.id === p.id)),
      ),
    [payments, effectiveClaimedIds, claimingIds, claimablePayments],
  );

  const visibleClaimTotalBaseUnits = useMemo(
    () =>
      visibleClaimPayments.reduce((sum, p) => {
        if (!p.amountBaseUnits) return sum;
        try {
          return sum + BigInt(p.amountBaseUnits);
        } catch {
          return sum;
        }
      }, 0n),
    [visibleClaimPayments],
  );

  const handleClaimAll = useCallback(async () => {
    if (claimPhase === "claiming") return;
    if (claimablePayments.length === 0) return;

    if (settledTimerRef.current) {
      clearTimeout(settledTimerRef.current);
      settledTimerRef.current = null;
    }
    staggerTimersRef.current.forEach(clearTimeout);
    staggerTimersRef.current = [];

    const batchIds = claimablePayments.map((p) => p.id);
    console.info("[Inbox] Claim requested", {
      count: claimablePayments.length,
      paymentIds: batchIds,
      vaultPubkey: unlockedVault?.vaultPubkey,
    });

    setClaimPhase("claiming");
    if (unlockedVault) {
      for (const id of batchIds) {
        writeStoredClaimStatus(unlockedVault.vaultPubkey, id, "claiming");
      }
    }
    setClaimingIds((prev) => {
      const next = new Set(prev);
      for (const id of batchIds) next.add(id);
      return next;
    });

    try {
      if (!unlockedVault) throw new Error("Vault is locked");

      await claimReceiverClaimableUtxos({
        signer: createUmbraSignerFromKeyPair(unlockedVault.keyPairSigner),
        utxos: claimablePayments.map((payment) => payment.utxo),
      });

      if (unlockedVault) {
        for (const id of batchIds) {
          writeStoredClaimStatus(unlockedVault.vaultPubkey, id, "claimed");
        }
      }
      await queryClient.invalidateQueries({
        queryKey: ["metrics", "private-balance", unlockedVault.vaultPubkey],
      });
      console.info("[Inbox] Claim marked settled", {
        count: batchIds.length,
        paymentIds: batchIds,
        invalidatedPrivateBalance: unlockedVault.vaultPubkey,
      });
      setClaimPhase("settled");

      if (!hasCelebratedFirstClaim(unlockedVault.vaultPubkey)) {
        markFirstClaimCelebrated(unlockedVault.vaultPubkey);
        setConfettiKey(Date.now());
        if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = setTimeout(() => {
          setConfettiKey(null);
          confettiTimerRef.current = null;
        }, 5200);
      }

      // Cascade row flips so success feels alive, not a single state snap.
      const staggerStep = 70;
      batchIds.forEach((id, index) => {
        const timer = setTimeout(() => {
          setClaimedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
          setClaimingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, index * staggerStep);
        staggerTimersRef.current.push(timer);
      });

      const staggerDuration = batchIds.length * staggerStep;
      const revisionTimer = setTimeout(() => {
        setClaimStorageRevision((revision) => revision + 1);
      }, staggerDuration);
      staggerTimersRef.current.push(revisionTimer);

      settledTimerRef.current = setTimeout(() => {
        setClaimPhase("idle");
        settledTimerRef.current = null;
      }, 2200 + staggerDuration);
    } catch (error) {
      if (isUmbraUtxoAlreadySpentError(error)) {
        console.info("[Inbox] Claim rejected as already spent; marking claimed", {
          count: batchIds.length,
          paymentIds: batchIds,
          error,
        });

        if (unlockedVault) {
          for (const id of batchIds) {
            writeStoredClaimStatus(unlockedVault.vaultPubkey, id, "claimed");
          }
        }
        setClaimedIds((prev) => {
          const next = new Set(prev);
          for (const id of batchIds) next.add(id);
          return next;
        });
        setClaimingIds((prev) => {
          const next = new Set(prev);
          for (const id of batchIds) next.delete(id);
          return next;
        });
        setClaimStorageRevision((revision) => revision + 1);
        if (unlockedVault) {
          await queryClient.invalidateQueries({
            queryKey: ["metrics", "private-balance", unlockedVault.vaultPubkey],
          });
        }
        setClaimPhase("settled");
        toast.success("Incoming payments already claimed");
        return;
      }

      console.error("[Inbox] Umbra claim failed", {
        count: batchIds.length,
        paymentIds: batchIds,
        error,
      });
      setClaimingIds((prev) => {
        const next = new Set(prev);
        for (const id of batchIds) next.delete(id);
        return next;
      });
      setClaimPhase("failed");
      toast.error("Couldn't claim incoming payments", {
        description: "Try again — the UTXOs are still claimable unless already spent.",
      });
    }
  }, [
    claimPhase,
    claimablePayments,
    claimReceiverClaimableUtxos,
    queryClient,
    unlockedVault,
  ]);

  const inboxFilterOptions = useMemo(
    () => [
      { value: "all", label: "All payments", count: payments.length },
      {
        value: "root",
        label: "Handle",
        count: payments.filter((p) => p.subPath === null).length,
      },
    ],
    [payments],
  );

  const filtered = useMemo(() => {
    return payments
      .filter((p) => {
        if (filter === "all") {
          // include everything
        } else if (filter === "invoice") {
          if (!p.subPath?.startsWith("invoice/")) return false;
        } else if (filter === "root") {
          if (p.subPath !== null) return false;
        } else {
          if (p.subPath !== filter) return false;
        }

        if (query.trim()) {
          const q = query.toLowerCase();
          const hay = [
            p.memo,
            p.payerLabel,
            p.payerPubkey,
            p.subLabel,
            p.amount.toString(),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => paymentTimestamp(b) - paymentTimestamp(a));
  }, [filter, query, payments]);

  const groups = useMemo(() => {
    const buckets: Record<DateBucket, Payment[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const p of filtered) {
      buckets[dateBucket(p.createdAt)].push(p);
    }
    return dateBucketOrder
      .map((key) => ({ key, label: dateBucketLabels[key], payments: buckets[key] }))
      .filter((g) => g.payments.length > 0);
  }, [filtered]);

  const showSkeleton = loading && payments.length === 0;
  const showClaimBanner =
    isUnlocked &&
    !isInactive &&
    (claimablePayments.length > 0 ||
      claimPhase === "claiming" ||
      claimPhase === "settled" ||
      claimPhase === "failed");

  return (
    <div className="flex flex-col gap-5">
      {confettiKey !== null && <ConfettiBurst key={confettiKey} />}

      {showClaimBanner && (
        <ClaimBanner
          phase={claimPhase}
          claimableCount={visibleClaimPayments.length || claimablePayments.length}
          claimableTotalBaseUnits={visibleClaimTotalBaseUnits}
          onRetry={handleClaimAll}
        />
      )}

      {/* Filter rail */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {inboxFilterOptions.map((opt) => {
            const selected = filter === opt.value;
            const disabled = !isUnlocked;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                aria-pressed={selected}
                disabled={disabled}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-surface-raised/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                  disabled && "cursor-not-allowed opacity-55 hover:border-border hover:text-muted-foreground",
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    "rounded px-1 font-mono tabular text-[11px]",
                    selected
                      ? "bg-primary/15 text-primary"
                      : "bg-border/40 text-muted-foreground/70",
                  )}
                >
                  {disabled ? "—" : opt.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <label className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memo, payer, amount…"
            disabled={!isUnlocked}
            className={cn(
              "h-9 w-64 rounded-md border border-border bg-surface-raised/30 pl-9 pr-3 text-[12.5px]",
              "placeholder:text-muted-foreground/50",
              "outline-none transition-all focus-visible:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring/40",
              "disabled:cursor-not-allowed disabled:opacity-55",
            )}
            aria-label="Search payments"
          />
        </label>
      </div>

      {/* Body */}
      {isInactive ? (
        <InactiveState />
      ) : showSkeleton ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} handle={user?.handle ?? "alice"} />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`inbox-group-${g.key}`}>
              <h3
                id={`inbox-group-${g.key}`}
                className="mb-2 px-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/70"
              >
                {g.label}
              </h3>
              <ol
                aria-label={`${g.label} payments`}
                className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60"
              >
                {g.payments.map((p) => (
                  <li key={p.id}>
                    <PaymentRow
                      payment={p}
                      claiming={claimingIds.has(p.id)}
                      claimed={effectiveClaimedIds.has(p.id)}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

    </div>
  );
}

function PaymentRow({
  payment,
  claiming,
  claimed,
}: {
  payment: Payment;
  claiming: boolean;
  claimed: boolean;
}) {
  const payerHandle =
    payment.payerLabel ??
    (payment.payerPubkey ?? "Anonymous payer");
  const anonymous = !payment.payerPubkey && !payment.payerLabel;
  const effectiveStatus: Payment["status"] = claiming
    ? "claiming"
    : claimed
      ? "claimed"
      : payment.status;

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised/30",
        claiming &&
          "bg-primary/[0.04] before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:rounded-full before:bg-primary/55",
      )}
    >
      <GradientAvatar
        handle={payment.payerLabel ?? payment.payerPubkey ?? `anon-${payment.id}`}
        size={36}
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium text-foreground">
            {anonymous ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Shield className="size-3.5" strokeWidth={2} />
                Anonymous
              </span>
            ) : payment.payerLabel ? (
              payment.payerLabel
            ) : (
              <span className="font-mono tabular text-foreground/90">{payerHandle}</span>
            )}
          </span>
          {payment.subLabel && (
            <>
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              <span className="truncate rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                {payment.subLabel}
              </span>
            </>
          )}
          {!claiming && <StatusPill status={effectiveStatus} />}
        </div>
        {payment.memo ? (
          <p className="mt-1 truncate font-serif text-[13.5px] italic text-muted-foreground/80">
            “{payment.memo}”
          </p>
        ) : (
          <p className="mt-1 text-[12.5px] text-muted-foreground/50">No memo</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <AmountDisplay
          amount={payment.amount}
          amountBaseUnits={payment.amountBaseUnits}
          decimals={solanaPaymentConfig.tokenDecimals}
          size="md"
          className="text-foreground"
        />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <span>{relativeTime(payment.createdAt)}</span>
          <span aria-hidden>·</span>
          <span className="font-mono tabular">{payment.txSig}</span>
          <button
            type="button"
            aria-label="Payment actions"
            className={cn(
              "grid size-6 place-items-center rounded-md text-muted-foreground/70 transition-colors",
              "hover:bg-surface-raised hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Payment["status"] }) {
  if (status === "claimed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-success">
        <Check className="size-3" strokeWidth={2.5} />
        Claimed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-warning/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-warning">
        Incoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-destructive">
      <CircleAlert className="size-3" strokeWidth={2.5} />
      Failed
    </span>
  );
}

function ClaimBanner({
  phase,
  claimableCount,
  claimableTotalBaseUnits,
  onRetry,
}: {
  phase: ClaimPhase;
  claimableCount: number;
  claimableTotalBaseUnits: bigint;
  onRetry: () => void;
}) {
  const isClaiming = phase === "claiming";
  const isSettled = phase === "settled";
  const isFailed = phase === "failed";

  const headline = isSettled
    ? "Incoming payments claimed."
    : isFailed
      ? "Couldn’t claim payments"
      : isClaiming
        ? `Claiming ${claimableCount} incoming payment${claimableCount === 1 ? "" : "s"}…`
        : `${claimableCount} incoming payment${claimableCount === 1 ? "" : "s"} detected`;

  const sub = isSettled
    ? "Encrypted balance updated."
    : isFailed
      ? "Your funds are still safe. Try again when you’re ready."
      : isClaiming
        ? "Encrypting into your vault."
        : "Claim them into your encrypted balance when you’re ready.";

  return (
    <div
      role="region"
      aria-label="Claimable payments"
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/60 px-5 py-4 transition-colors",
        isSettled
          ? "border-success/40 bg-success/[0.04]"
          : isFailed
            ? "border-destructive/35 bg-destructive/[0.035]"
            : "border-primary/35 bg-primary/[0.04]",
      )}
    >
      {/* Candlelight wash — same idiom as the activate dialog. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 blur-2xl"
        style={{
          background: isSettled
            ? "radial-gradient(60% 120% at 20% 50%, oklch(0.74 0.13 152 / 0.16), transparent 70%)"
            : isFailed
              ? "radial-gradient(60% 120% at 20% 50%, oklch(0.63 0.20 25 / 0.14), transparent 70%)"
              : "radial-gradient(60% 120% at 20% 50%, oklch(0.82 0.11 72 / 0.20), transparent 70%)",
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
              isSettled
                ? "border-success/35 bg-success/10 text-success"
                : isFailed
                  ? "border-destructive/35 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            {isSettled ? (
              <Check className="size-4" strokeWidth={2.25} />
            ) : isFailed ? (
              <CircleAlert className="size-4" strokeWidth={2.25} />
            ) : isClaiming ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
            ) : (
              <Wallet className="size-4" strokeWidth={2.25} />
            )}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p
                key={headline}
                className="text-[13.5px] font-medium leading-tight text-foreground animate-[claim-fade_280ms_ease-out]"
              >
                {headline}
              </p>
              {!isSettled && claimableTotalBaseUnits > 0n && (
                <span className="inline-flex items-baseline gap-1 text-[12.5px] text-muted-foreground/85">
                  <span aria-hidden>·</span>
                  <AmountDisplay
                    amount={null}
                    amountBaseUnits={claimableTotalBaseUnits.toString()}
                    decimals={solanaPaymentConfig.tokenDecimals}
                    size="sm"
                    className="text-foreground/90"
                  />
                  <span className="text-muted-foreground/70">total</span>
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground/80">
              {sub}
            </p>
          </div>
        </div>

        {isFailed || phase === "idle" ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={claimableCount === 0}
            className={cn(
              "inline-flex h-10 shrink-0 items-center justify-center gap-2 self-end rounded-lg px-4 text-[13px] font-semibold transition-all sm:self-auto",
              "bg-primary text-primary-foreground ring-1 ring-primary/30 active:translate-y-px hover:bg-primary/90",
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {isFailed ? "Try again" : "Claim now"}
          </button>
        ) : isSettled ? (
          <div
            aria-live="polite"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-success/15 px-4 text-[13px] font-semibold text-success ring-1 ring-success/35 sm:self-auto"
          >
            <Check className="size-3.5" strokeWidth={2.5} />
            All caught up
          </div>
        ) : null}
      </div>

      {isClaiming && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
        >
          <div className="h-full w-1/3 animate-[claim-progress_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        </div>
      )}

      <style jsx>{`
        @keyframes claim-fade {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes claim-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}

function InactiveState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/15 px-6 py-14 text-center">
      <Shield className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="mt-2 font-serif text-xl italic text-foreground/80">
        Private payments aren&apos;t active yet.
      </p>
      <p className="max-w-md text-[13px] text-muted-foreground/70">
        Activate private payments from the top of your dashboard to start
        receiving into an encrypted vault.
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="mb-2 ml-1 h-3 w-16 rounded-sm bg-surface-raised/40" />
        <ol
          aria-busy
          aria-label="Loading payments"
          className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/40"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4"
            >
              <Skeleton className="size-9 rounded-full bg-surface-raised/50" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-40 rounded-sm bg-surface-raised/50" />
                <Skeleton className="h-3 w-56 rounded-sm bg-surface-raised/30" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-4 w-20 rounded-sm bg-surface-raised/50" />
                <Skeleton className="h-2.5 w-28 rounded-sm bg-surface-raised/30" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function EmptyState({ filter, handle }: { filter: string; handle: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/20 px-6 py-14 text-center">
      <Shield className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="mt-2 font-serif text-xl italic text-foreground/80">
        Nothing in this view.
      </p>
      <p className="max-w-md text-[13px] text-muted-foreground/70">
        {filter === "all"
          ? `Share your handle — ${handleUrl(handle)} — and payments will land here, decrypted only for you.`
          : "No payments match this filter yet. Adjust the filter above to see more."}
      </p>
    </div>
  );
}
