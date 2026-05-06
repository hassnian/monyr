"use client";

import { handleUrl } from "@/lib/brand";
import { Link2, Send, Check, Clock3, Copy } from "lucide-react";

import { AmountDisplay } from "@/components/payments/amount-display";

import { GradientAvatar } from "@/components/payments/gradient-avatar";

import { cn } from "@/lib/utils";

import { outgoing, sendLinks, profile, type Outgoing, type SendLink } from "../_data";

import { relativeTime, formatDateShort } from "../_utils";
import { PreviewEyebrow } from "./preview-eyebrow";

/**
 * Outgoing payments live in two buckets:
 * 1. Direct sends to @handle or raw pubkey — confirmed on-chain.
 * 2. One-off send-links — the link holds the funds; show claim state.
 */
export function Outbox() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewEyebrow note="design preview · live sends coming soon" />
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

        <ol className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60">
          {outgoing.map((o) => (
            <li key={o.id}>
              <OutgoingRow entry={o} />
            </li>
          ))}
        </ol>
      </section>

      {/* <section>
        <div className="mb-4 max-w-xl space-y-1">
          <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
            Active send-links
          </h3>
          <p className="text-[13px] leading-relaxed text-muted-foreground/80">
            One-off URLs carrying funds for someone who isn’t on Monyr yet. The
            secret lives in the URL fragment; the server never sees it.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sendLinks.map((l) => (
            <SendLinkCard key={l.id} link={l} />
          ))}
        </div>
      </section> */}
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

function SendLinkCard({ link }: { link: SendLink }) {
  const claimed = link.claimedAt !== null;
  const url = handleUrl(profile.handle, link.publicId);
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-5 transition-all",
        claimed
          ? "border-border/70 bg-card/60 opacity-80"
          : "border-border bg-card/80 hover:border-primary/35",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              <Link2 className="size-3" strokeWidth={2.25} />
              One-off send
            </span>
            {claimed ? (
              <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-success">
                <Check className="size-3" strokeWidth={2.5} />
                Claimed {formatDateShort(link.claimedAt!)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-sm bg-warning/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-warning">
                <Clock3 className="size-3" strokeWidth={2.5} />
                Awaiting claim
              </span>
            )}
          </div>
          <p className="truncate font-mono tabular text-[12px] text-foreground/80">
            {url}
            <span className="text-muted-foreground/60">#•••••</span>
          </p>
          {link.memo && (
            <p className="font-serif text-[13px] italic text-muted-foreground/80">
              “{link.memo}”{link.recipientHint && ` · ${link.recipientHint}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-4">
        <AmountDisplay amount={link.amount} size="lg" />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          {!claimed && (
            <>
              <span>Expires {formatDateShort(link.expiresAt)}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-border-strong/50 bg-surface-raised/40 px-2 py-1 font-sans text-[11px] font-medium transition-colors",
              "hover:border-primary/40 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <Copy className="size-3" />
            Copy link
          </button>
        </div>
      </div>
    </article>
  );
}
