"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUnlockDashboard } from "@/app/hooks/useUnlockDashboard";

import { Inbox } from "./inbox";
import { Outbox } from "./outbox";
import { InvoicesPane } from "./invoices";
import { LabelsPane } from "./labels";
import { ReceiptsPanel } from "./receipts";

type TabValue = "inbox" | "outbox" | "invoices" | "labels" | "receipts";

/**
 * Tabbed surface rolling the main workstreams together. Tabs render inline
 * (not the shadcn pill variant) so the dashboard reads as one continuous
 * document — a ledger, not a control panel.
 *
 * When the dashboard is locked, tabs are hidden entirely and the surface
 * collapses to a single locked card. There's nothing useful to switch to
 * before unlock, and the unlock CTA already lives in the banner above.
 */
export function DashboardTabs() {
  const [active, setActive] = useState<TabValue>("inbox");
  const [inboxCount, setInboxCount] = useState(0);
  const { isLocked } = useUnlockDashboard();

  if (isLocked) {
    return <LockedActivityState />;
  }

  const tabs = [
    { value: "inbox", label: "Inbox", count: inboxCount },
    { value: "outbox", label: "Outbox", count: null },
    { value: "invoices", label: "Invoices", count: null },
    { value: "labels", label: "Labels", count: null },
    { value: "receipts", label: "Receipts", count: null },
  ] as const;

  return (
    <section aria-label="Activity" className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="flex items-end gap-1 border-b border-border/80 pb-0"
      >
        {tabs.map((t) => {
          const isActive = active === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.value}`}
              id={`tab-${t.value}`}
              onClick={() => setActive(t.value)}
              className={cn(
                "relative -mb-px inline-flex items-end gap-2 px-3 pb-3 pt-1.5 text-[13px] font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="tracking-tight">{t.label}</span>
              {t.count !== null && (
                <span
                  className={cn(
                    "rounded px-1 font-mono tabular text-[10.5px] transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-border/40 text-muted-foreground/70",
                  )}
                >
                  {t.count}
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-t transition-all",
                  isActive
                    ? "bg-primary opacity-100"
                    : "bg-transparent opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="min-h-[320px]"
      >
        {active === "inbox" && <Inbox onCountChange={setInboxCount} />}
        {active === "outbox" && <Outbox />}
        {active === "invoices" && <InvoicesPane />}
        {active === "labels" && <LabelsPane />}
        {active === "receipts" && <ReceiptsPanel />}
      </div>
    </section>
  );
}

function LockedActivityState() {
  return (
    <section
      aria-label="Activity locked"
      className={cn(
        "flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/70 bg-surface-raised/10 px-6 py-8",
        "text-[12.5px] text-muted-foreground/75",
      )}
    >
      <Lock
        aria-hidden
        className="size-3.5 text-muted-foreground/60"
        strokeWidth={2.25}
      />
      <span>Inbox, invoices, and receipts decrypt after unlock.</span>
    </section>
  );
}
