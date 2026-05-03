"use client";

import { useState } from "react";
import { FileText, Send, Tag, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { CreateLabelDialog } from "./create-label-dialog";
import { SendPrivatelyDialog } from "./send-privately-dialog";

type ActionKey = "invoice" | "label" | "send" | "receipts";

type Action = {
  key: ActionKey;
  title: string;
  detail: string;
  icon: React.ReactNode;
  /** Disabled actions render as ghosted, non-interactive surfaces. */
  disabled?: boolean;
};

const ACTIONS: Action[] = [
  {
    key: "invoice",
    title: "New invoice",
    detail: "Fixed amount, shareable link",
    icon: <FileText className="size-4" strokeWidth={2} />,
  },
  {
    key: "label",
    title: "New label",
    detail: "Per-client path (e.g. /acme)",
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
    disabled: true,
  },
];

/**
 * Quick action rail — four flat tiles. Resting state is neutral; amber lifts in
 * on hover. Per design §14.4 — don't pre-glow a "next action" unless we know
 * what's next for this user.
 */
export function QuickActions({ handle }: { handle: string }) {
  const [openAction, setOpenAction] = useState<ActionKey | null>(null);

  const close = () => setOpenAction(null);

  return (
    <>
      <section aria-label="Quick actions">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={a.disabled}
              onClick={() => {
                if (a.disabled) return;
                setOpenAction(a.key);
              }}
              className={cn(
                "group relative flex items-start gap-3 rounded-xl p-4 text-left transition-all",
                "border border-border bg-card/70",
                "hover:border-primary/35 hover:bg-card",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border disabled:hover:bg-card/70",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-md transition-colors",
                  "bg-surface-raised text-muted-foreground",
                  "group-hover:not-disabled:bg-primary/15 group-hover:not-disabled:text-primary",
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

      <CreateInvoiceDialog
        open={openAction === "invoice"}
        onOpenChange={(open) => (open ? setOpenAction("invoice") : close())}
        handle={handle}
      />
      <CreateLabelDialog
        open={openAction === "label"}
        onOpenChange={(open) => (open ? setOpenAction("label") : close())}
        handle={handle}
      />
      <SendPrivatelyDialog
        open={openAction === "send"}
        onOpenChange={(open) => (open ? setOpenAction("send") : close())}
      />
    </>
  );
}
