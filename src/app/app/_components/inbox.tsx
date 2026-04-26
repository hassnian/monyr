"use client";

import { handleUrl } from "@/lib/brand";
import { useMemo, useState } from "react";

import { Search, MoreHorizontal, Shield, Loader2, CircleAlert } from "lucide-react";

import { GradientAvatar } from "@/components/payments/gradient-avatar";

import { AmountDisplay } from "@/components/payments/amount-display";

import { cn } from "@/lib/utils";

import { inboxFilterOptions, payments, type Payment } from "../_data";

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
export function Inbox() {
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

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
  }, [filter, query]);

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

  return (
    <div className="flex flex-col gap-5">
      {/* Filter rail */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {inboxFilterOptions.map((opt) => {
            const selected = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-surface-raised/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    "rounded px-1 font-mono tabular text-[11px]",
                    selected ? "bg-primary/15 text-primary" : "bg-border/40 text-muted-foreground/70",
                  )}
                >
                  {opt.count}
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
            className={cn(
              "h-9 w-64 rounded-md border border-border bg-surface-raised/30 pl-9 pr-3 text-[12.5px]",
              "placeholder:text-muted-foreground/50",
              "outline-none transition-all focus-visible:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring/40",
            )}
            aria-label="Search payments"
          />
        </label>
      </div>

      {/* List — grouped by recency so the river has rhythm. */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
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

      <p className="text-center font-serif text-[12.5px] italic text-muted-foreground/60">
        Only {filtered.length} of {payments.length} payments shown · your wallet
        holds the decryption keys.
      </p>
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

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/20 px-6 py-14 text-center">
      <Shield className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="mt-2 font-serif text-xl italic text-foreground/80">
        Nothing in this view.
      </p>
      <p className="max-w-md text-[13px] text-muted-foreground/70">
        {filter === "all"
          ? `Share your handle — ${handleUrl("alice")} — and payments will land here, decrypted only for you.`
          : "No payments match this filter yet. Adjust the filter above to see more."}
      </p>
    </div>
  );
}
