"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  FileText,
  CalendarDays,
  MoreHorizontal,
} from "lucide-react";

import { getMyPaymentContexts, type PaymentContext } from "@/app/actions/payment-contexts";
import { useAuth } from "@/app/contexts/auth-context";
import { useInboxPayments } from "@/app/hooks/useInboxPayments";
import { handleUrl } from "@/lib/brand";
import { AmountDisplay } from "@/components/payments/amount-display";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { formatDateShort } from "../_utils";

import { CreateInvoiceDialog } from "./create-invoice-dialog";

type StatusFilter = "all" | "outstanding" | "paid" | "expired";

type InvoiceContext = PaymentContext & {
  fixedAmount: number;
  memoTemplate: string | null;
  paid: boolean;
  expired: boolean;
  paidAmount: number;
  expiresAt: string | null;
};

function getConfigNumber(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getConfigString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export function InvoicesPane() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: payments = [] } = useInboxPayments();
  const invoiceContextsQueryKey = ["payment-contexts", "invoice", user?.handle] as const;

  const { data: contexts = [], isLoading } = useQuery({
    queryKey: invoiceContextsQueryKey,
    queryFn: () => getMyPaymentContexts("invoice"),
    enabled: Boolean(user),
  });

  const invoices = useMemo<InvoiceContext[]>(
    () =>
      contexts.map((context) => {
        const invoicePayments = payments.filter((payment) => payment.subPath === context.path);
        const paidAmount = invoicePayments.reduce((sum, payment) => sum + payment.amount, 0);
        const expiresAt = getConfigString(context.config, "expiresAt");
        return {
          ...context,
          fixedAmount: getConfigNumber(context.config, "amount"),
          memoTemplate: getConfigString(context.config, "memo"),
          paid: context.status === "paid" || invoicePayments.length > 0,
          expired: context.status === "expired" || isExpired(expiresAt),
          paidAmount,
          expiresAt,
        };
      }),
    [contexts, payments],
  );

  const outstanding = invoices.filter((s) => !s.paid && !s.expired);
  const paid = invoices.filter((s) => s.paid);
  const expired = invoices.filter((s) => !s.paid && s.expired);

  const counts = {
    all: invoices.length,
    outstanding: outstanding.length,
    paid: paid.length,
    expired: expired.length,
  } as const;

  const totalOutstanding = outstanding.reduce(
    (sum, s) => sum + s.fixedAmount,
    0,
  );
  const totalPaid = paid.reduce((sum, s) => sum + (s.paidAmount || s.fixedAmount), 0);
  const totalExpired = expired.reduce((sum, s) => sum + s.fixedAmount, 0);

  const sections =
    filter === "outstanding"
      ? [
          {
            key: "outstanding" as const,
            label: "Outstanding",
            invoices: outstanding,
            total: totalOutstanding,
          },
        ]
      : filter === "paid"
        ? [
            {
              key: "paid" as const,
              label: "Paid",
              invoices: paid,
              total: totalPaid,
            },
          ]
        : filter === "expired"
          ? [
              {
                key: "expired" as const,
                label: "Expired",
                invoices: expired,
                total: totalExpired,
              },
            ]
          : [
              {
                key: "outstanding" as const,
                label: "Outstanding",
                invoices: outstanding,
                total: totalOutstanding,
              },
              {
                key: "paid" as const,
                label: "Paid",
                invoices: paid,
                total: totalPaid,
              },
              {
                key: "expired" as const,
                label: "Expired",
                invoices: expired,
                total: totalExpired,
              },
            ];

  const visibleSections = sections.filter((s) => s.invoices.length > 0);
  const handle = user?.handle ?? "";

  return (
    <>
      <div className="flex flex-col gap-6">
        <Header
          totalOutstanding={totalOutstanding}
          totalPaid={totalPaid}
          outstandingCount={outstanding.length}
          paidCount={paid.length}
          loading={isLoading}
          onCreate={() => setOpen(true)}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "outstanding", "paid", "expired"] as const).map((opt) => {
            const selected = filter === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                aria-pressed={selected}
                disabled={isLoading}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium capitalize transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-70",
                  selected
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-surface-raised/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {opt}
                {isLoading ? (
                  <Skeleton className="h-3 w-3 rounded bg-muted/60" />
                ) : (
                  <span
                    className={cn(
                      "rounded px-1 font-mono tabular text-[11px]",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-border/40 text-muted-foreground/70",
                    )}
                  >
                    {counts[opt]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <InvoicesSkeleton />
        ) : invoices.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : visibleSections.length === 0 ? (
          <FilteredEmptyState filter={filter} />
        ) : (
          <div className="flex flex-col gap-5">
            {visibleSections.map((section) => (
              <section
                key={section.key}
                aria-labelledby={`invoice-section-${section.key}`}
              >
                <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                  <h3
                    id={`invoice-section-${section.key}`}
                    className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/70"
                  >
                    {section.label}
                  </h3>
                  <div className="flex items-baseline gap-2 text-[10.5px] uppercase tracking-wider text-muted-foreground/60">
                    <span className="font-mono tabular">
                      {section.invoices.length}
                    </span>
                    <span aria-hidden className="text-muted-foreground/30">·</span>
                    <AmountDisplay
                      amount={section.total}
                      size="sm"
                      className="text-[11px] text-muted-foreground/80"
                    />
                  </div>
                </div>
                <ol
                  aria-label={`${section.label} invoices`}
                  className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60"
                >
                  {section.invoices.map((sub) => (
                    <li key={sub.id}>
                      <InvoiceRow sub={sub} handle={handle} />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>

      <CreateInvoiceDialog
        open={open}
        onOpenChange={setOpen}
        handle={handle}
        onCreated={(context) => {
          queryClient.setQueryData<PaymentContext[]>(invoiceContextsQueryKey, (current = []) => {
            if (current.some((item) => item.id === context.id)) return current;
            return [...current, context];
          });
          void queryClient.invalidateQueries({ queryKey: invoiceContextsQueryKey });
        }}
      />
    </>
  );
}

function Header({
  totalOutstanding,
  totalPaid,
  outstandingCount,
  paidCount,
  loading,
  onCreate,
}: {
  totalOutstanding: number;
  totalPaid: number;
  outstandingCount: number;
  paidCount: number;
  loading?: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl space-y-1">
        <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
          Invoices
        </h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground/80">
          Fixed-amount, time-bound. Share the URL — the payer just clicks Pay.
        </p>
      </div>

      <div className="flex items-stretch gap-2">
        <Stat
          label="Outstanding"
          amount={totalOutstanding}
          count={outstandingCount}
          loading={loading}
          highlight
        />
        <Stat
          label="Paid"
          amount={totalPaid}
          count={paidCount}
          loading={loading}
        />
        <button
          type="button"
          onClick={onCreate}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground",
            "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
            "transition-all hover:bg-primary/90 active:translate-y-px",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <FileText className="size-3.5" strokeWidth={2.25} />
          New invoice
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  amount,
  count,
  highlight,
  loading,
}: {
  label: string;
  amount: number;
  count: number;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border px-3 py-1.5 min-w-[120px]",
        highlight
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-border bg-surface-raised/30",
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/85">
        {label}
      </span>
      <div className="flex items-baseline justify-between gap-2">
        {loading ? (
          <Skeleton className="h-3.5 w-14 bg-muted/60" />
        ) : (
          <AmountDisplay amount={amount} size="sm" className="text-foreground" />
        )}
        {loading ? (
          <Skeleton className="h-2.5 w-4 bg-muted/60" />
        ) : (
          <span className="font-mono tabular text-[10.5px] text-muted-foreground/70">
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

function InvoiceRow({ sub, handle }: { sub: InvoiceContext; handle: string }) {
  const url = handleUrl(handle, sub.path);
  const paid = sub.paid;
  const expired = sub.expired;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    try {
      navigator.clipboard?.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised/30">
      <div
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-full",
          paid
            ? "bg-success/10 text-success"
            : "bg-primary/10 text-primary ring-1 ring-primary/20",
        )}
      >
        {paid ? (
          <Check className="size-4" strokeWidth={2.5} />
        ) : (
          <FileText className="size-4" strokeWidth={2} />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-serif text-[16px] leading-tight tracking-tight text-foreground">
            {sub.title}
          </h4>
          {!paid && (
            <span className="inline-flex shrink-0 items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              {expired ? "Expired" : "Outstanding"}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground/75">
          <span className="truncate font-mono tabular">{url}</span>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded text-muted-foreground/60 transition-colors",
              "hover:bg-surface-raised hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
            aria-label="Copy URL"
          >
            {copied ? (
              <Check className="size-3 text-success" strokeWidth={2.5} />
            ) : (
              <Copy className="size-3" strokeWidth={2} />
            )}
          </button>
        </div>
        {sub.memoTemplate && (
          <p className="mt-1 truncate font-serif text-[13px] italic text-muted-foreground/70">
            “{sub.memoTemplate}”
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <AmountDisplay
          amount={sub.fixedAmount}
          size="md"
          className="text-foreground"
        />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          {sub.expiresAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays
                className="size-2.5 text-muted-foreground/55"
                strokeWidth={2}
              />
              <span className="uppercase tracking-wider text-[10px] text-muted-foreground/55">
                {paid ? "Settled" : expired ? "Expired" : "Expires"}
              </span>
              <span className="font-mono tabular">
                {formatDateShort(sub.expiresAt)}
              </span>
            </span>
          )}
          <button
            type="button"
            aria-label="Invoice actions"
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

function InvoicesSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <section aria-hidden>
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <Skeleton className="h-2.5 w-20 bg-muted/60" />
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-2.5 w-4 bg-muted/60" />
            <span aria-hidden className="text-muted-foreground/30">·</span>
            <Skeleton className="h-2.5 w-16 bg-muted/60" />
          </div>
        </div>
        <ol className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <InvoiceRowSkeleton />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function InvoiceRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4">
      <Skeleton className="size-9 rounded-full bg-muted/60" />
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-44 bg-muted/60" />
          <Skeleton className="h-3.5 w-16 rounded-sm bg-muted/50" />
        </div>
        <Skeleton className="h-3 w-56 bg-muted/50" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4 w-20 bg-muted/60" />
        <Skeleton className="h-3 w-32 bg-muted/50" />
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-raised/15 px-6 py-14 text-center">
      <FileText className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="font-serif text-xl italic text-foreground/80">
        No invoices yet.
      </p>
      <p className="max-w-md text-[13px] text-muted-foreground/70">
        Bill a client with a fixed amount and a memo. Share the link — they just
        click Pay.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground",
          "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
          "transition-all hover:bg-primary/90 active:translate-y-px",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <FileText className="size-3.5" strokeWidth={2.25} />
        New invoice
      </button>
    </div>
  );
}

function FilteredEmptyState({ filter }: { filter: StatusFilter }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/15 px-6 py-12 text-center">
      <p className="font-serif text-lg italic text-foreground/75">
        Nothing in this view.
      </p>
      <p className="max-w-md text-[12.5px] text-muted-foreground/70">
        {filter === "outstanding"
          ? "Every invoice is settled or expired. Quiet ledger."
          : filter === "expired"
            ? "No expired invoices yet."
            : "No paid invoices yet."}
      </p>
    </div>
  );
}
