"use client";

import { useState } from "react";
import { FileDown, FileText, ShieldCheck, KeyRound, Calendar } from "lucide-react";
import { AmountDisplay } from "@/components/payments/amount-display";
import { cn } from "@/lib/utils";
import { metrics } from "../_data";
import { PreviewEyebrow } from "./preview-eyebrow";

type RangeKey = "mtd" | "30d" | "q1" | "ytd" | "2025";

const RANGES: { key: RangeKey; label: string; helper: string }[] = [
  { key: "mtd", label: "April 2026", helper: "Month to date" },
  { key: "30d", label: "Last 30 days", helper: "Rolling" },
  { key: "q1", label: "Q1 2026", helper: "Jan – Mar" },
  { key: "ytd", label: "Year to date", helper: "2026" },
  { key: "2025", label: "Tax year 2025", helper: "Annual export" },
];

const DUMMY_RANGE_TOTALS: Record<RangeKey, { amount: number; payments: number }> = {
  mtd: { amount: metrics.monthToDate, payments: metrics.monthToDateCount },
  "30d": { amount: 2938.5, payments: 28 },
  q1: { amount: 5276, payments: 55 },
  ytd: { amount: metrics.totalReceived, payments: metrics.totalReceivedCount },
  "2025": { amount: 18420, payments: 162 },
};

/**
 * Receipts & export — the retention killer per PRD §Stickiness.
 * Editorial: pull-quote framing ("your ledger is your business"), then the
 * functional range picker and two export affordances.
 */
export function ReceiptsPanel() {
  const [range, setRange] = useState<RangeKey>("mtd");
  const totals = DUMMY_RANGE_TOTALS[range];

  return (
    <div className="flex flex-col gap-6">
      <PreviewEyebrow note="design preview · totals and exports not yet wired" />
      <header className="max-w-2xl space-y-1">
        <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
          Receipts &amp; selective disclosure
        </h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground/80">
          Your handle is your identity; your ledger is your business. Export a
          signed PDF and CSV locally, or issue a time-scoped viewing grant for
          an accountant — revocable, amount-only, no spend rights.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* Range picker + live preview */}
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-border bg-card/80 p-5",
            "shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_24px_48px_-32px_rgba(0,0,0,0.5)]",
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-muted-foreground" strokeWidth={2} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Select period
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {RANGES.map((r) => {
              const selected = r.key === range;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex flex-col items-start rounded-md border px-3 py-2 text-left transition-all",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    selected
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border bg-surface-raised/40 text-foreground hover:border-border-strong",
                  )}
                >
                  <span className="text-[13px] font-medium">{r.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 text-[10.5px] uppercase tracking-wider",
                      selected ? "text-primary/80" : "text-muted-foreground/70",
                    )}
                  >
                    {r.helper}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Period total
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <AmountDisplay amount={totals.amount} size="xl" />
              <p className="text-[12.5px] text-muted-foreground/80">
                <span className="font-mono tabular">{totals.payments}</span>{" "}
                payments · decrypted locally with your viewing key
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-all",
                "bg-primary text-primary-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)] hover:bg-primary/90 active:translate-y-px",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <FileText className="size-4" strokeWidth={2} />
              Signed PDF receipt
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-all",
                "border border-border-strong/60 bg-surface-raised/40 text-foreground hover:border-primary/45",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <FileDown className="size-4" strokeWidth={2} />
              CSV export
            </button>
          </div>
        </div>

        {/* Viewing grant block */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Viewing grant
              </p>
              <h4 className="mt-1 font-serif text-xl leading-tight tracking-tight text-foreground">
                Share with your accountant
              </h4>
            </div>
            <span className="grid size-10 place-items-center rounded-md bg-accent text-primary">
              <KeyRound className="size-4" strokeWidth={2} />
            </span>
          </div>

          <ul className="mt-5 space-y-3 text-[13px] leading-relaxed text-muted-foreground/85">
            <li className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
              />
              <span>
                <span className="text-foreground">Scoped to this range</span> — no
                other period is decryptable.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
              />
              <span>
                <span className="text-foreground">Amount-only</span> — your
                counterparties, memos, and wallet stay hidden.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
              />
              <span>
                <span className="text-foreground">Revocable on-chain</span>.
                Issued grants can be rotated any time.
              </span>
            </li>
          </ul>

          <div className="mt-6 flex flex-col gap-2">
            <input
              type="text"
              placeholder="accountant.pubkey or SNS name"
              className={cn(
                "h-10 rounded-md border border-border-strong/60 bg-surface-raised/30 px-3 text-[13px] font-mono tabular",
                "placeholder:font-sans placeholder:tabular-nums placeholder:text-muted-foreground/40",
                "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              )}
            />
            <button
              type="button"
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-all",
                "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <ShieldCheck className="size-4" strokeWidth={2} />
              Issue grant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
