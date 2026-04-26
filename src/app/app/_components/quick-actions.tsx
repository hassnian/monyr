"use client";

import { FileText, Send, Tag, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type Action = {
  key: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
};

const ACTIONS: Action[] = [
  {
    key: "invoice",
    title: "New invoice",
    detail: "Fixed amount, shareable link",
    icon: <FileText className="size-4" strokeWidth={2} />,
  },
  {
    key: "sub-handle",
    title: "New sub-handle",
    detail: "Per-client label (e.g. /acme)",
    icon: <Tag className="size-4" strokeWidth={2} />,
  },
  {
    key: "send",
    title: "Send privately",
    detail: "To @handle or one-off link",
    icon: <Send className="size-4" strokeWidth={2} />,
  },
  {
    key: "receipts",
    title: "Export receipts",
    detail: "Signed PDF · CSV · viewing grant",
    icon: <Receipt className="size-4" strokeWidth={2} />,
  },
];

/**
 * Quick action rail — four flat tiles. Resting state is neutral; amber lifts in
 * on hover. Per design §14.4 — don't pre-glow a "next action" unless we know
 * what's next for this user.
 */
export function QuickActions() {
  return (
    <section aria-label="Quick actions">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            className={cn(
              "group relative flex items-start gap-3 rounded-xl p-4 text-left transition-all",
              "border border-border bg-card/70",
              "hover:border-primary/35 hover:bg-card",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-md transition-colors",
                "bg-surface-raised text-muted-foreground",
                "group-hover:bg-primary/15 group-hover:text-primary",
              )}
            >
              {a.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {a.title}
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                {a.detail}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
