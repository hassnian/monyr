"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Copy, Tag } from "lucide-react";

import { getMyPaymentContexts, type PaymentContext } from "@/app/actions/payment-contexts";
import { useAuth } from "@/app/contexts/auth-context";
import { useInboxPayments } from "@/app/hooks/useInboxPayments";
import { handleUrl } from "@/lib/brand";
import { AmountDisplay } from "@/components/payments/amount-display";
import { HandleText } from "@/components/payments/handle-text";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { formatDateShort } from "../_utils";

import { CreateLabelDialog } from "./create-label-dialog";

type LabelContext = PaymentContext & {
  totalReceived: number;
  paymentCount: number;
};

export function LabelsPane() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: payments = [] } = useInboxPayments();

  const labelContextsQueryKey = ["payment-contexts", "label", user?.handle] as const;

  const { data: contexts = [], isLoading } = useQuery({
    queryKey: labelContextsQueryKey,
    queryFn: () => getMyPaymentContexts("label"),
    enabled: Boolean(user),
  });

  const labels = useMemo<LabelContext[]>(
    () =>
      contexts.map((context) => {
        const labelPayments = payments.filter((payment) => payment.subPath === context.path);
        return {
          ...context,
          totalReceived: labelPayments.reduce((sum, payment) => sum + payment.amount, 0),
          paymentCount: labelPayments.length,
        };
      }),
    [contexts, payments],
  );

  const totalReceived = labels.reduce((sum, s) => sum + s.totalReceived, 0);
  const totalCount = labels.reduce((sum, s) => sum + s.paymentCount, 0);
  const handle = user?.handle ?? "";

  return (
    <>
      <div className="flex flex-col gap-6">
        <Header
          totalReceived={totalReceived}
          totalCount={totalCount}
          labelCount={labels.length}
          loading={isLoading}
          onCreate={() => setOpen(true)}
        />

        {isLoading ? (
          <LabelsSkeleton />
        ) : labels.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {labels.map((sub) => (
              <LabelCard key={sub.id} sub={sub} handle={handle} />
            ))}
          </div>
        )}
      </div>

      <CreateLabelDialog
        open={open}
        onOpenChange={setOpen}
        handle={handle}
        onCreated={(context) => {
          queryClient.setQueryData<PaymentContext[]>(labelContextsQueryKey, (current = []) => {
            if (current.some((item) => item.id === context.id)) return current;
            return [...current, context];
          });
          void queryClient.invalidateQueries({ queryKey: labelContextsQueryKey });
        }}
      />
    </>
  );
}

function Header({
  totalReceived,
  totalCount,
  labelCount,
  loading,
  onCreate,
}: {
  totalReceived: number;
  totalCount: number;
  labelCount: number;
  loading?: boolean;
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
        <Stat
          label="Received"
          amount={totalReceived}
          count={totalCount}
          loading={loading}
        />
        <Stat label="Labels" count={labelCount} loading={loading} />
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
  loading,
}: {
  label: string;
  amount?: number;
  count: number;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-surface-raised/30 px-3 py-1.5 min-w-[120px]">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/85">
        {label}
      </span>
      <div className="flex items-baseline justify-between gap-2">
        {loading ? (
          <Skeleton
            className={cn(
              "bg-muted/60",
              amount !== undefined ? "h-3.5 w-14" : "h-4 w-8",
            )}
          />
        ) : amount !== undefined ? (
          <AmountDisplay amount={amount} size="sm" className="text-foreground" />
        ) : (
          <span className="font-mono tabular text-base text-foreground">
            {count}
          </span>
        )}
        {amount !== undefined &&
          (loading ? (
            <Skeleton className="h-2.5 w-4 bg-muted/60" />
          ) : (
            <span className="font-mono tabular text-[10.5px] text-muted-foreground/70">
              {count}
            </span>
          ))}
      </div>
    </div>
  );
}

function LabelCard({ sub, handle }: { sub: LabelContext; handle: string }) {
  const url = handleUrl(handle, sub.path);
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
            handle={handle}
            subPath={sub.path}
            size="md"
            className="text-foreground"
          />
          <p className="mt-1 truncate text-[13px] font-medium text-muted-foreground">
            {sub.title}
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
            {formatDateShort(sub.createdAt.toISOString())}
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

function LabelsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <LabelCardSkeleton key={i} />
      ))}
    </div>
  );
}

function LabelCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-4 rounded-xl border border-border bg-card/80 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-36 bg-muted/60" />
          <Skeleton className="h-3 w-44 bg-muted/50" />
        </div>
        <Skeleton className="h-6 w-32 rounded-md bg-muted/50" />
      </div>

      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16 bg-muted/60" />
          <Skeleton className="h-7 w-28 bg-muted/60" />
          <Skeleton className="h-3 w-40 bg-muted/50" />
        </div>
        <Skeleton className="size-4 bg-muted/50" />
      </div>
    </div>
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
