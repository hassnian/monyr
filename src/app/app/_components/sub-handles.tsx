"use client";

import { handleUrl } from "@/lib/brand";
import { Copy, FileText, Plus, Tag, Check, ArrowRight } from "lucide-react";

import { AmountDisplay } from "@/components/payments/amount-display";

import { HandleText } from "@/components/payments/handle-text";

import { cn } from "@/lib/utils";

import { profile, subHandles, type SubHandle } from "../_data";

import { formatDateShort } from "../_utils";
import { PreviewEyebrow } from "./preview-eyebrow";

/**
 * Per-client labels and invoices, rendered as editorial cards.
 * Two kinds share the layout but diverge on meta: custom shows cumulative
 * received; invoice shows the fixed amount + paid/open state.
 */
export function SubHandlesPane() {
  const customs = subHandles.filter((s) => s.kind === "custom");
  const invoices = subHandles.filter((s) => s.kind === "invoice");

  return (
    <div className="flex flex-col gap-10">
      <PreviewEyebrow note="design preview · sub-handles not yet wired" />
      <Section
        title="Labels"
        caption="Per-client paths. Payments through /label group under a tab — you see the context, the payer sees the label."
        action={<CreateAction icon={<Tag className="size-3.5" />} label="New label" />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {customs.map((s) => (
            <CustomCard key={s.id} sub={s} />
          ))}
          <CreateTile kind="label" />
        </div>
      </Section>

      <Section
        title="Invoices"
        caption="Fixed-amount, time-bound. Share the URL — the payer just clicks Pay."
        action={<CreateAction icon={<FileText className="size-3.5" />} label="New invoice" primary />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {invoices.map((s) => (
            <InvoiceCard key={s.id} sub={s} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  caption,
  action,
  children,
}: {
  title: string;
  caption: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-xl space-y-1">
          <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-[13px] leading-relaxed text-muted-foreground/80">
            {caption}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CreateAction({
  icon,
  label,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        primary
          ? "bg-primary text-primary-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)] hover:bg-primary/90 active:translate-y-px"
          : "border border-border-strong/60 bg-surface-raised/40 text-foreground hover:border-primary/45",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CustomCard({ sub }: { sub: SubHandle }) {
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
            {sub.paymentCount === 1 ? "payment" : "payments"} · since {formatDateShort(sub.createdAt)}
          </p>
        </div>
        <ArrowRight
          className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
          strokeWidth={2}
        />
      </div>
    </article>
  );
}

function InvoiceCard({ sub }: { sub: SubHandle }) {
  const url = handleUrl(profile.handle, sub.subPath);
  const paid = sub.status === "paid";
  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-xl border p-5 transition-all",
        paid
          ? "border-border/70 bg-card/60"
          : "border-primary/25 bg-primary/[0.03] ring-1 ring-primary/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            {paid ? "Paid" : "Outstanding"}
          </p>
          <h4 className="mt-0.5 truncate font-serif text-[22px] leading-tight tracking-tight text-foreground">
            {sub.displayLabel}
          </h4>
          <p className="mt-1 truncate font-mono tabular text-[12px] text-muted-foreground/75">
            /{sub.subPath}
          </p>
        </div>
        {paid ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-success">
            <Check className="size-3" strokeWidth={2.5} />
            Paid
          </span>
        ) : (
          <CopyUrlMini url={url} />
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Amount
          </p>
          <AmountDisplay amount={sub.fixedAmount ?? 0} size="lg" />
        </div>
        {sub.expiresAt && !paid && (
          <div className="text-right">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
              Expires
            </p>
            <p className="mt-0.5 text-[13px] text-foreground/80">
              {formatDateShort(sub.expiresAt)}
            </p>
          </div>
        )}
        {paid && sub.expiresAt && (
          <div className="text-right">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
              Settled
            </p>
            <p className="mt-0.5 text-[13px] text-foreground/80">
              {formatDateShort(sub.expiresAt)}
            </p>
          </div>
        )}
      </div>

      {sub.memoTemplate && (
        <p className="font-serif text-[13px] italic leading-relaxed text-muted-foreground/80">
          “{sub.memoTemplate}”
        </p>
      )}
    </article>
  );
}

function CreateTile({ kind }: { kind: "label" | "invoice" }) {
  return (
    <button
      type="button"
      className={cn(
        "group flex min-h-[172px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong/70 bg-transparent p-5 text-center transition-all",
        "hover:border-primary/50 hover:bg-primary/[0.03]",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <span className="grid size-10 place-items-center rounded-full bg-surface-raised text-muted-foreground transition-colors group-hover:text-primary">
        <Plus className="size-4" strokeWidth={2} />
      </span>
      <span className="text-[13px] font-medium text-foreground">
        {kind === "label" ? "New sub-handle" : "New invoice"}
      </span>
      <span className="text-[11.5px] text-muted-foreground/70">
        {kind === "label"
          ? "Group a client or context"
          : "Fixed amount, one-off link"}
      </span>
    </button>
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

