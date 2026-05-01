"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "./inbox";
import { Outbox } from "./outbox";
import { SubHandlesPane } from "./sub-handles";
import { ReceiptsPanel } from "./receipts";

type TabValue = "inbox" | "outbox" | "sub-handles" | "receipts";

/**
 * Tabbed surface rolling the main workstreams together. Tabs render inline
 * (not the shadcn pill variant) so the dashboard reads as one continuous
 * document — a ledger, not a control panel.
 */
export function DashboardTabs() {
  const [active, setActive] = useState<TabValue>("inbox");
  const [inboxCount, setInboxCount] = useState(0);
  const tabs = [
    { value: "inbox", label: "Inbox", count: inboxCount },
    { value: "outbox", label: "Outbox", count: null },
    { value: "sub-handles", label: "Sub-handles", count: null },
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
        {active === "sub-handles" && <SubHandlesPane />}
        {active === "receipts" && <ReceiptsPanel />}
      </div>
    </section>
  );
}
