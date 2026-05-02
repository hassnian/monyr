"use client";

import { useState } from "react";
import { ArrowRight, Copy, Tag } from "lucide-react";

import { handleUrl } from "@/lib/brand";
import { AmountDisplay } from "@/components/payments/amount-display";
import { HandleText } from "@/components/payments/handle-text";
import { cn } from "@/lib/utils";

import { profile, subHandles, type SubHandle } from "../_data";
import { formatDateShort } from "../_utils";

import { CreateLabelDialog } from "./create-label-dialog";
import { PreviewEyebrow } from "./preview-eyebrow";

export function LabelsPane() {
  const [open, setOpen] = useState(false);

  const labels = subHandles.filter((s) => s.kind === "custom");
  const totalReceived = labels.reduce((sum, s) => sum + s.totalReceived, 0);
  const totalCount = labels.reduce((sum, s) => sum + s.paymentCount, 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        <PreviewEyebrow note="design preview · labels not yet wired" />

        <Header
          totalReceived={totalReceived}
          totalCount={totalCount}
          labelCount={labels.length}
          onCreate={() => setOpen(true)}
        />

        {labels.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {labels.map((sub) => (
              <LabelCard key={sub.id} sub={sub} />
            ))}
          </div>
        )}
      </div>

      <CreateLabelDialog
        open={open}
        onOpenChange={setOpen}
        handle={profile.handle}
      />
    </>
  );
}

function Header({
  totalReceived,
  totalCount,
  labelCount,
  onCreate,
}: {
  totalReceived: number;
  totalCount: number;
  labelCount: number;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl space-y-1">
        <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
          Labels
        </h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground/80">
          Per-client paths. Payments through a label group together — context
          for you, simplicity for them.
        </p>
      </div>

      <div className="flex items-stretch gap-2">
        <Stat label="Received" amount={totalReceived} count={totalCount} />
        <Stat label="Labels" count={labelCount} />
        <button
          type="button"
          onClick={onCreate}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground",
            "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
            "transition-all hover:bg-primary/90 active:translate-y-px",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <Tag className="size-3.5" strokeWidth={2.25} />
          New label
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  amount,
  count,
}: {
  label: string;
  amount?: number;
  count: number;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-surface-raised/30 px-3 py-1.5 min-w-[120px]">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/85">
        {label}
      </span>
      <div className="flex items-baseline justify-between gap-2">
        {amount !== undefined ? (
          <AmountDisplay amount={amount} size="sm" className="text-foreground" />
        ) : (
          <span className="font-mono tabular text-base text-foreground">
            {count}
          </span>
        )}
        {amount !== undefined && (
          <span className="font-mono tabular text-[10.5px] text-muted-foreground/70">
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

function LabelCard({ sub }: { sub: SubHandle }) {
  const url = handleUrl(profile.handle, sub.subPath);
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border border-border bg-card/80 p-5 transition-all",
        "hover:border-border-strong hover:bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <HandleText
            handle={profile.handle}
            subPath={sub.subPath}
            size="md"
            className="text-foreground"
          />
          <p className="mt-1 truncate text-[13px] font-medium text-muted-foreground">
            {sub.displayLabel}
          </p>
        </div>
        <CopyUrlMini url={url} />
      </div>

      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Received
          </p>
          <AmountDisplay amount={sub.totalReceived} size="lg" />
          <p className="mt-1 text-[11.5px] text-muted-foreground/70">
            <span className="font-mono tabular">{sub.paymentCount}</span>{" "}
            {sub.paymentCount === 1 ? "payment" : "payments"} · since{" "}
            {formatDateShort(sub.createdAt)}
          </p>
        </div>
        <ArrowRight
          aria-hidden
          className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
          strokeWidth={2}
        />
      </div>
    </article>
  );
}

function CopyUrlMini({ url }: { url: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-surface-raised/50 px-2 py-1",
        "font-mono tabular text-[11px] text-muted-foreground",
      )}
    >
      <span className="truncate max-w-[140px]">{url}</span>
      <Copy className="size-3 shrink-0 text-muted-foreground/70" />
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-raised/15 px-6 py-14 text-center">
      <Tag className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="font-serif text-xl italic text-foreground/80">
        No labels yet.
      </p>
      <p className="max-w-md text-[13px] text-muted-foreground/70">
        Group payments by client or context. Payers see the path; you see the
        bookkeeping.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground",
          "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
          "transition-all hover:bg-primary/90 active:translate-y-px",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <Tag className="size-3.5" strokeWidth={2.25} />
        New label
      </button>
    </div>
  );
}
