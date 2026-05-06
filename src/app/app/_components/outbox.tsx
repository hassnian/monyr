"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { cn } from "@/lib/utils";

import { SendPrivatelyDialog } from "./send-privately-dialog";

/**
 * Outgoing payments surface. Real send tracking is intentionally not backed by
 * dashboard fixtures; keep the list empty until sent-payment persistence exists.
 */
export function Outbox() {
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl space-y-1">
            <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
              Sent privately
            </h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground/80">
              Direct payments to handles and pubkeys. Amounts and memos hidden
              from the chain; only you and the recipient can decrypt.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all",
              "bg-primary text-primary-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)] hover:bg-primary/90 active:translate-y-px",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <Send className="size-3.5" strokeWidth={2} />
            Send payment
          </button>
        </div>

        <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center">
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground/75">
            No sent payments yet. Private sends you create from this workspace
            will appear here once outbox persistence is available.
          </p>
        </div>
      </section>

      <SendPrivatelyDialog open={sendOpen} onOpenChange={setSendOpen} />
    </div>
  );
}
