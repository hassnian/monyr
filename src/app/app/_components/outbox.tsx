"use client";

import { useState } from "react";
import { Check, Clock3, Link2, Send } from "lucide-react";

import { AmountDisplay } from "@/components/payments/amount-display";
import { GradientAvatar } from "@/components/payments/gradient-avatar";
import { useOutboxReceipts } from "@/app/hooks/useOutboxReceipts";
import { cn } from "@/lib/utils";
import type { Outgoing } from "../_data";
import { relativeTime } from "../_utils";

import { SendPrivatelyDialog } from "./send-privately-dialog";

/**
 * Outgoing payments surface. Outbox rows are persisted as encrypted receipts:
 * the server can associate them with the owner handle, but cannot read the
 * recipient, amount, memo, or transaction signature.
 */
export function Outbox() {
  const [sendOpen, setSendOpen] = useState(false);
  const { data: sentPayments = [] } = useOutboxReceipts();

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

        {sentPayments.length > 0 ? (
          <ol className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60">
            {sentPayments.map((entry) => (
              <li key={entry.id}>
                <OutgoingRow entry={entry} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center">
            <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground/75">
              No sent payments yet. Private sends you create from this workspace
              will appear here once outbox persistence is available.
            </p>
          </div>
        )}
      </section>

      <SendPrivatelyDialog open={sendOpen} onOpenChange={setSendOpen} />
    </div>
  );
}

function OutgoingRow({ entry }: { entry: Outgoing }) {
  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised/30">
      <GradientAvatar handle={entry.recipient} size={36} />

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground/80">To</span>
          <span
            className={cn(
              "truncate font-medium",
              entry.recipientKind === "handle"
                ? "text-foreground"
                : "font-mono tabular text-foreground/90",
            )}
          >
            {entry.recipient}
          </span>
          {entry.recipientKind === "send-link" && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-accent px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-accent-foreground">
              <Link2 className="size-3" strokeWidth={2.5} />
              Send-link
            </span>
          )}
          <OutgoingStatus status={entry.status} />
        </div>
        {entry.memo ? (
          <p className="mt-1 truncate font-serif text-[13.5px] italic text-muted-foreground/80">
            “{entry.memo}”
          </p>
        ) : (
          <p className="mt-1 text-[12.5px] text-muted-foreground/50">No memo</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <AmountDisplay amount={entry.amount} size="md" className="text-foreground" />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <span>{relativeTime(entry.createdAt)}</span>
          <span aria-hidden>·</span>
          <span className="font-mono tabular">{entry.txSig}</span>
        </div>
      </div>
    </div>
  );
}

function OutgoingStatus({ status }: { status: Outgoing["status"] }) {
  if (status === "confirmed" || status === "sent") return null;
  if (status === "claimed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-success">
        <Check className="size-3" strokeWidth={2.5} />
        Claimed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-warning/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-warning">
      <Clock3 className="size-3" strokeWidth={2.5} />
      Unclaimed
    </span>
  );
}
