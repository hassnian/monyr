"use client";

import { handleUrl } from "@/lib/brand";
import { useEffect, useMemo, useState } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQuery } from "@tanstack/react-query";

import {
  Search,
  MoreHorizontal,
  Shield,
  Loader2,
  CircleAlert,
  Lock,
  RefreshCw,
  CircleCheck,
} from "lucide-react";

import { GradientAvatar } from "@/components/payments/gradient-avatar";

import { AmountDisplay } from "@/components/payments/amount-display";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { Payment } from "../_data";
import { useAuth } from "@/app/contexts/auth-context";
import { useUmbra } from "@/app/hooks/useUmbra";
import { useUnlockDashboard } from "@/app/hooks/useUnlockDashboard";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";

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
export function Inbox({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const { user, unlockedVault } = useAuth();
  const { scanRecentClaimableUtxos } = useUmbra();
  const { isLocked, isUnlocked, isActive } = useUnlockDashboard();

  const {
    data: payments = [],
    isFetching: loading,
    refetch,
    dataUpdatedAt,
    error: queryError,
  } = useQuery<Payment[]>({
    enabled: isUnlocked && Boolean(unlockedVault),
    queryKey: ["inbox", "claimable", user?.handle, unlockedVault?.vaultPubkey],
    queryFn: async () => {
      if (!unlockedVault) return [];
      const result = await scanRecentClaimableUtxos({
        signer: createUmbraSignerFromKeyPair(unlockedVault.keyPairSigner),
      });
      const claimable = [...result.received, ...result.publicReceived];
      return claimable.map((utxo) => ({
        id: `${utxo.treeIndex}:${utxo.insertionIndex}`,
        amount: Number(utxo.amount) / 10 ** solanaPaymentConfig.tokenDecimals,
        memo: null,
        payerLabel: null,
        payerPubkey: null,
        subPath: null,
        subLabel: null,
        createdAt: new Date().toISOString(),
        status: "pending",
        txSig: `${utxo.treeIndex}:${utxo.insertionIndex}`,
      }));
    },
    staleTime: 60_000,
    retry: false,
  });

  const lastRefreshedAt = useMemo(
    () => (dataUpdatedAt ? new Date(dataUpdatedAt) : null),
    [dataUpdatedAt],
  );
  const scanError = queryError
    ? "Couldn't reach the network. Try refreshing."
    : null;

  useEffect(() => {
    onCountChange?.(payments.length);
  }, [onCountChange, payments.length]);

  const inboxFilterOptions = useMemo(
    () => [
      { value: "all", label: "All payments", count: payments.length },
      {
        value: "root",
        label: "Root handle",
        count: payments.filter((p) => p.subPath === null).length,
      },
    ],
    [payments],
  );

  const filtered = useMemo(() => {
    return payments.filter((p) => {
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
    });
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
  const isInactive = !isActive;

  return (
    <div className="flex flex-col gap-5">
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
      {isLocked ? (
        <LockedState />
      ) : isInactive ? (
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
                    <PaymentRow payment={p} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <StatusFooter
        isLocked={isLocked}
        isInactive={isInactive}
        loading={loading}
        lastRefreshedAt={lastRefreshedAt}
        error={scanError}
        shown={filtered.length}
        total={payments.length}
        onRefresh={() => {
          refetch();
        }}
      />
    </div>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const payerHandle =
    payment.payerLabel ??
    (payment.payerPubkey ?? "Anonymous payer");
  const anonymous = !payment.payerPubkey && !payment.payerLabel;

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised/30">
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
          <StatusPill status={payment.status} />
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
        <AmountDisplay amount={payment.amount} size="md" className="text-foreground" />
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
    return null; // quiet — success is the default, don't shout
  }
  if (status === "claiming") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-primary">
        <Loader2 className="size-3 animate-spin" strokeWidth={2.5} />
        Auto-claiming
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-warning/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-warning">
        Pending
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

function LockedState() {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-dashed border-border bg-surface-raised/15 px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-12 -top-16 h-44 -z-10 blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(40% 100% at 50% 0%, oklch(0.82 0.11 72 / 0.16), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="grid size-11 place-items-center rounded-full border border-primary/30 bg-primary/8 text-primary"
      >
        <Lock className="size-4" strokeWidth={2} />
      </div>
      <p className="font-serif text-xl italic text-foreground/85">
        Your inbox is locked.
      </p>
      <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground/75">
        Decryption keys live on your device. Use the{" "}
        <span className="font-medium text-foreground/85">Unlock dashboard</span>{" "}
        button at the top to see incoming payments.
      </p>
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

function StatusFooter({
  isLocked,
  isInactive,
  loading,
  lastRefreshedAt,
  error,
  shown,
  total,
  onRefresh,
}: {
  isLocked: boolean;
  isInactive: boolean;
  loading: boolean;
  lastRefreshedAt: Date | null;
  error: string | null;
  shown: number;
  total: number;
  onRefresh: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second so "X seconds ago" stays honest. Cheap; only one
  // setInterval per inbox mount.
  useEffect(() => {
    if (!lastRefreshedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastRefreshedAt]);

  if (isInactive) return null;

  if (isLocked) {
    return (
      <p className="flex items-center justify-center gap-2 pt-1 text-center font-mono tabular text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
        <Lock className="size-3" strokeWidth={2.25} />
        Locked
        <span aria-hidden className="text-muted-foreground/30">·</span>
        <span className="font-sans normal-case tracking-normal italic">
          unlock to refresh your inbox
        </span>
      </p>
    );
  }

  if (loading && !lastRefreshedAt) {
    return (
      <p className="flex items-center justify-center gap-2 pt-1 text-center font-mono tabular text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
        <Loader2 className="size-3 animate-spin text-primary" />
        Decrypting your inbox…
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-center text-[11.5px] text-destructive/85">
        <CircleAlert className="size-3" strokeWidth={2.25} />
        <span>{error}</span>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1 text-center font-mono tabular text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
      <span className="inline-flex items-center gap-1.5">
        {loading ? (
          <Loader2 className="size-3 animate-spin text-primary" />
        ) : (
          <CircleCheck className="size-3 text-success" strokeWidth={2.25} />
        )}
        {loading ? "Refreshing" : "Live"}
      </span>
      {lastRefreshedAt ? (
        <>
          <span aria-hidden className="text-muted-foreground/30">·</span>
          <span className="font-sans normal-case tracking-normal text-muted-foreground/80">
            {agoLabel(lastRefreshedAt, now)}
          </span>
        </>
      ) : null}
      <span aria-hidden className="text-muted-foreground/30">·</span>
      <span className="font-sans normal-case tracking-normal text-muted-foreground/80">
        {shown} of {total} shown
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh inbox"
        className={cn(
          "ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-foreground/80 transition-colors",
          "hover:text-foreground hover:bg-surface-raised/40",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "font-sans normal-case tracking-normal",
        )}
      >
        <RefreshCw
          className={cn("size-3", loading && "animate-spin")}
          strokeWidth={2.25}
        />
        Refresh
      </button>
    </div>
  );
}

function agoLabel(when: Date, now: number) {
  const diff = Math.max(0, Math.floor((now - when.getTime()) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
