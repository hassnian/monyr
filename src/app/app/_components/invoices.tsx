"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  FileText,
  CalendarDays,
  MoreHorizontal,
} from "lucide-react";

import { handleUrl } from "@/lib/brand";
import { AmountDisplay } from "@/components/payments/amount-display";
import { cn } from "@/lib/utils";

import { profile, subHandles, type SubHandle } from "../_data";
import { formatDateShort } from "../_utils";

import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { PreviewEyebrow } from "./preview-eyebrow";

type StatusFilter = "all" | "outstanding" | "paid";

export function InvoicesPane() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const invoices = subHandles.filter((s) => s.kind === "invoice");
  const outstanding = invoices.filter((s) => s.status !== "paid");
  const paid = invoices.filter((s) => s.status === "paid");

  const counts = {
    all: invoices.length,
    outstanding: outstanding.length,
    paid: paid.length,
  } as const;

  const totalOutstanding = outstanding.reduce(
    (sum, s) => sum + (s.fixedAmount ?? 0),
    0,
  );
  const totalPaid = paid.reduce((sum, s) => sum + (s.fixedAmount ?? 0), 0);

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
          ];

  const visibleSections = sections.filter((s) => s.invoices.length > 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        <PreviewEyebrow note="design preview · invoices not yet wired" />

        <Header
          totalOutstanding={totalOutstanding}
          totalPaid={totalPaid}
          outstandingCount={outstanding.length}
          paidCount={paid.length}
          onCreate={() => setOpen(true)}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "outstanding", "paid"] as const).map((opt) => {
            const selected = filter === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium capitalize transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-surface-raised/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {opt}
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
              </button>
            );
          })}
        </div>

        {invoices.length === 0 ? (
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
                      <InvoiceRow sub={sub} />
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
        handle={profile.handle}
      />
    </>
  );
}

function Header({
  totalOutstanding,
  totalPaid,
  outstandingCount,
  paidCount,
  onCreate,
}: {
  totalOutstanding: number;
  totalPaid: number;
  outstandingCount: number;
  paidCount: number;
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
          highlight
        />
        <Stat label="Paid" amount={totalPaid} count={paidCount} />
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
}: {
  label: string;
  amount: number;
  count: number;
  highlight?: boolean;
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
        <AmountDisplay amount={amount} size="sm" className="text-foreground" />
        <span className="font-mono tabular text-[10.5px] text-muted-foreground/70">
          {count}
        </span>
      </div>
    </div>
  );
}

function InvoiceRow({ sub }: { sub: SubHandle }) {
  const url = handleUrl(profile.handle, sub.subPath);
  const paid = sub.status === "paid";
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
            {sub.displayLabel}
          </h4>
          {!paid && (
            <span className="inline-flex shrink-0 items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              Outstanding
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
          amount={sub.fixedAmount ?? 0}
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
                {paid ? "Settled" : "Expires"}
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
          ? "Every invoice is settled. Quiet ledger."
          : "No paid invoices yet."}
      </p>
    </div>
  );
}
