"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Loader2, RefreshCw } from "lucide-react";

import { useDashboardSync } from "@/app/hooks/useDashboardSync";
import { cn } from "@/lib/utils";

/**
 * Compact, dashboard-wide data freshness indicator. Lives in the metrics band
 * header so the whole prospectus reads against one "is this current?" answer
 * — not per-tab footers.
 */
export function DashboardSyncIndicator() {
  const { isFetching, lastUpdatedAt, error, refresh } = useDashboardSync();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lastUpdatedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  if (error) {
    return (
      <button
        type="button"
        onClick={refresh}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
          "text-destructive/85 hover:bg-surface-raised/40 hover:text-destructive",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <CircleAlert className="size-3" strokeWidth={2.25} />
        <span className="uppercase tracking-wider">Sync error</span>
        <span aria-hidden className="text-destructive/40">·</span>
        <span className="font-sans">Retry</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px]">
      <span className="inline-flex items-center gap-1.5 font-mono tabular uppercase tracking-wider text-muted-foreground">
        {isFetching ? (
          <Loader2 className="size-3 animate-spin text-primary" />
        ) : (
          <CircleCheck className="size-3 text-success" strokeWidth={2.25} />
        )}
        {isFetching ? "Syncing" : "Live"}
      </span>
      {lastUpdatedAt && !isFetching && (
        <>
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/85">
            {agoLabel(lastUpdatedAt, now)}
          </span>
        </>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={isFetching}
        aria-label="Refresh dashboard"
        className={cn(
          "ml-0.5 grid size-6 place-items-center rounded-md text-muted-foreground/70 transition-colors",
          "hover:bg-surface-raised hover:text-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <RefreshCw
          className={cn("size-3", isFetching && "animate-spin")}
          strokeWidth={2.25}
        />
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
