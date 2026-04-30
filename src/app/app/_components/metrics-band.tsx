"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Eye, EyeOff, ShieldCheck, Clock } from "lucide-react";
import { AmountDisplay } from "@/components/payments/amount-display";
import { cn } from "@/lib/utils";
import { ActivitySpark } from "./activity-spark";
import { dailyFlow, metrics } from "../_data";

/**
 * The "prospectus strip" — four editorial metric tiles, plus an oversized hero
 * tile holding the 30-day sparkline. Privacy-first: a single toggle blurs all
 * amounts on screen.
 */
export function MetricsBand() {
  const [revealed, setRevealed] = useState(true);

  return (
    <section aria-label="Summary">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          At a glance
        </span>
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Hero tile — total received + sparkline */}
        <Tile
          className="md:col-span-3"
          label="Total received (private)"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground/80">
              <ShieldCheck className="size-3 text-success" strokeWidth={2.25} />
              Only you can decrypt
            </span>
          }
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <AmountDisplay
                amount={metrics.totalReceived}
                hidden={!revealed}
                size="xl"
                className="leading-none"
              />
              <p className="mt-2 text-[12px] text-muted-foreground/80">
                <span className="font-mono tabular">{metrics.totalReceivedCount}</span> payments ·
                across <span className="font-mono tabular">6</span> sub-handles
              </p>
            </div>
            <Delta value={metrics.monthOverMonthDelta} />
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
          <AmountDisplay amount={metrics.monthToDate} hidden={!revealed} size="lg" />
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
          <AmountDisplay amount={metrics.pendingAmount} hidden={!revealed} size="lg" />
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

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const pct = `${positive ? "+" : ""}${Math.round(value * 100)}%`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium font-mono tabular",
        positive
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {positive ? (
        <ArrowUpRight className="size-3" strokeWidth={2.5} />
      ) : (
        <ArrowDownRight className="size-3" strokeWidth={2.5} />
      )}
      {pct}
    </span>
  );
}
