import Link from "next/link";
import { ArrowUpRight, Check, Hourglass } from "lucide-react";

import { AmountDisplay } from "@/components/payments/amount-display";
import { GradientAvatar } from "@/components/payments/gradient-avatar";
import { HandleText } from "@/components/payments/handle-text";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/utils";

type State = "paid" | "expired";

type Props = {
  state: State;
  handle: string;
  displayName: string | null;
  bio: string | null;
  invoiceId: string;
  amount: number;
  memo: string;
  closedAt: string | null;
};

export function InvoiceTerminalCard({
  state,
  handle,
  displayName,
  bio,
  invoiceId,
  amount,
  memo,
  closedAt,
}: Props) {
  const isPaid = state === "paid";
  const closedLabel = formatShortDate(closedAt);
  const profileHref = `/@${handle}`;

  return (
    <section
      aria-labelledby="invoice-terminal-handle"
      className="relative w-full max-w-md"
    >
      <div
        aria-hidden
        className={cn(
          "absolute -inset-x-10 -inset-y-14 -z-10 blur-3xl transition-opacity",
          isPaid ? "opacity-90" : "opacity-25",
        )}
        style={{
          background: isPaid
            ? "radial-gradient(60% 50% at 50% 30%, oklch(0.74 0.13 162 / 0.22), transparent 70%)"
            : "radial-gradient(60% 50% at 50% 30%, oklch(0.55 0.02 80 / 0.10), transparent 70%)",
        }}
      />

      <div
        className={cn(
          "relative rounded-2xl border bg-card p-8 md:p-10",
          isPaid ? "border-success/35" : "border-border",
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
              "font-mono tabular text-[10.5px] uppercase tracking-[0.22em]",
              isPaid
                ? "border-success/45 bg-success/10 text-success"
                : "border-border bg-surface-raised/50 text-muted-foreground/85",
            )}
          >
            {isPaid ? (
              <>
                <Check className="size-3" strokeWidth={2.5} />
                Paid{closedLabel ? ` · ${closedLabel}` : ""}
              </>
            ) : (
              <>
                <Hourglass className="size-3" strokeWidth={2.25} />
                Expired{closedLabel ? ` · ${closedLabel}` : ""}
              </>
            )}
          </span>
          <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
            #{invoiceId}
          </span>
        </div>

        <div className="flex flex-col items-start gap-5">
          <div className={cn("transition-opacity", !isPaid && "opacity-90")}>
            <GradientAvatar handle={handle} size={72} />
          </div>
          <div className="space-y-1">
            {displayName && (
              <h1
                id="invoice-terminal-handle"
                className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground"
              >
                {displayName}
              </h1>
            )}
            <HandleText
              handle={handle}
              size="md"
              className="text-muted-foreground/80"
            />
          </div>

          {bio && (
            <p className="text-[15px] leading-relaxed text-muted-foreground max-w-[36ch]">
              {bio}
            </p>
          )}
        </div>

        <div className="my-8 h-px w-full bg-border" />

        <div className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {isPaid ? "Amount paid" : "Amount due"}
            </span>
            {isPaid && (
              <span className="inline-flex items-center gap-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-success/85">
                <Check className="size-3" strokeWidth={2.5} />
                Settled
              </span>
            )}
          </div>
          <div
            className={cn(
              "rounded-xl border p-5",
              isPaid
                ? "border-success/30 bg-success/[0.04]"
                : "border-border bg-surface-raised/30",
            )}
          >
            <div className={cn(!isPaid && "opacity-55")}>
              <AmountDisplay amount={amount} size="xl" />
            </div>
          </div>

          {memo.trim() && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                For
              </p>
              <p
                className={cn(
                  "font-serif text-sm italic leading-relaxed",
                  isPaid ? "text-foreground/90" : "text-muted-foreground/75",
                )}
              >
                &ldquo;{memo}&rdquo;
              </p>
            </div>
          )}
        </div>

        <div className="mt-7">
          {isPaid ? (
            <div
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                "bg-success/12 text-success ring-1 ring-success/35",
                "text-[13.5px] font-medium tracking-tight",
                "shadow-[0_0_0_1px_rgba(86,179,140,0.16),0_8px_24px_-8px_rgba(86,179,140,0.35)]",
              )}
            >
              <Check className="size-3.5" strokeWidth={2.5} />
              Paid to @{handle}
            </div>
          ) : (
            <div
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                "border border-dashed border-border-strong bg-surface-raised/20",
                "text-[13px] text-muted-foreground/85",
              )}
            >
              <Hourglass className="size-3.5" strokeWidth={2} />
              This invoice expired
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[12px] leading-snug text-muted-foreground/85">
          {isPaid ? (
            <>
              Need another invoice?{" "}
              <Link
                href={profileHref}
                className="inline-flex items-baseline gap-1 text-foreground/90 underline underline-offset-4 decoration-success/45 transition-colors hover:decoration-success"
              >
                Visit @{handle}
                <ArrowUpRight
                  className="size-3 -translate-y-0.5"
                  strokeWidth={2}
                />
              </Link>
            </>
          ) : (
            <>
              Ask{" "}
              <Link
                href={profileHref}
                className="text-foreground/90 underline underline-offset-4 decoration-primary/40 transition-colors hover:decoration-primary"
              >
                @{handle}
              </Link>{" "}
              for a new one.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
