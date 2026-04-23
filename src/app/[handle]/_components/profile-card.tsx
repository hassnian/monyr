"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GradientAvatar } from "@/components/hush/gradient-avatar";
import { HandleText } from "@/components/hush/handle-text";
import { AmountDisplay } from "@/components/hush/amount-display";
import { PaySheet } from "./pay-sheet";
import { cn } from "@/lib/utils";

type Variant =
  | { kind: "tipjar"; presets?: number[] }
  | { kind: "label"; label: string }
  | {
      kind: "invoice";
      invoiceId: string;
      amount: number;
      memoTemplate: string;
      dueAt?: string;
    };

type Props = {
  handle: string;
  displayName: string | null;
  bio: string | null;
  subPath?: string;
  variant: Variant;
};

const DEFAULT_PRESETS = [5, 20, 50];

export function ProfileCard({
  handle,
  displayName,
  bio,
  subPath,
  variant,
}: Props) {
  const presets =
    variant.kind === "tipjar" ? (variant.presets ?? DEFAULT_PRESETS) : [];

  const isInvoice = variant.kind === "invoice";

  const [amount, setAmount] = useState<string>(
    isInvoice ? variant.amount.toFixed(2) : "",
  );
  const [memo, setMemo] = useState<string>("");
  const [showMemo, setShowMemo] = useState(false);
  const [open, setOpen] = useState(false);

  const numericAmount = Number.parseFloat(amount || "0");
  const canPay = numericAmount > 0;

  return (
    <section
      aria-labelledby="profile-name"
      className="relative w-full max-w-md"
    >
      {/* Soft amber glow behind the card — candlelight, not neon. */}
      <div
        aria-hidden
        className="absolute -inset-x-6 -inset-y-10 -z-10 blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 20%, oklch(0.82 0.11 72 / 0.15), transparent 70%)",
        }}
      />

      <div className="relative rounded-2xl border border-border bg-card p-8 md:p-10">
        {/* Top badge for sub-paths — invoice # or label */}
        {(variant.kind === "invoice" || variant.kind === "label") && (
          <div className="mb-6 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                "text-[11px] font-medium uppercase tracking-wider",
                variant.kind === "invoice"
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {variant.kind === "invoice" ? (
                <>
                  <Lock className="size-3" />
                  Invoice · #{variant.invoiceId}
                </>
              ) : (
                <>for {variant.label}</>
              )}
            </span>
          </div>
        )}

        {/* Identity block */}
        <div className="flex flex-col items-start gap-5">
          <GradientAvatar handle={handle} size={72} />
          <div className="space-y-1">
            <h1
              id="profile-name"
              className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground"
            >
              {displayName}
            </h1>
            <HandleText
              handle={handle}
              subPath={subPath}
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

        {/* Divider — a breath, not a cut */}
        <div className="my-8 h-px w-full bg-border" />

        {/* Pay block */}
        {isInvoice ? (
          <InvoiceBlock
            amount={variant.amount}
            memo={variant.memoTemplate}
            dueAt={variant.dueAt}
          />
        ) : (
          <TipJarBlock
            presets={presets}
            amount={amount}
            setAmount={setAmount}
          />
        )}

        {/* Optional memo for non-invoice payments */}
        {!isInvoice && (
          <div className="mt-5">
            {showMemo ? (
              <div className="space-y-2">
                <label
                  htmlFor="memo"
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  Note (optional, encrypted)
                </label>
                <Textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Thanks for the essay on Solana privacy."
                  maxLength={140}
                  className="h-10 min-h-10 resize-none text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  {memo.length}/140 · Only {handle} can decrypt this.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMemo(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                + Add a note
              </button>
            )}
          </div>
        )}

        <Button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!canPay}
          className={cn(
            "mt-7 h-12 w-full rounded-xl text-base font-semibold",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
            "transition-all",
          )}
        >
          {isInvoice
            ? `Pay ${variant.amount.toFixed(2)} USDC privately`
            : canPay
              ? `Pay ${numericAmount.toFixed(2)} USDC privately`
              : "Enter an amount"}
        </Button>
      </div>

      <PaySheet
        open={open}
        onOpenChange={setOpen}
        handle={handle}
        displayName={displayName}
        amount={numericAmount}
        memo={memo}
        subPath={subPath}
        invoiceId={isInvoice ? variant.invoiceId : undefined}
      />
    </section>
  );
}

function TipJarBlock({
  presets,
  amount,
  setAmount,
}: {
  presets: number[];
  amount: string;
  setAmount: (v: string) => void;
}) {
  const numeric = Number.parseFloat(amount || "0");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label
          htmlFor="amount"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Amount
        </label>
        <span className="text-[11px] text-muted-foreground/70">
          USDC · Solana
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const selected = numeric === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset.toFixed(2))}
              className={cn(
                "group relative h-11 rounded-lg border text-sm font-medium transition-all",
                "font-mono tabular",
                selected
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-surface-raised/50 text-foreground hover:border-border-strong hover:bg-surface-raised",
              )}
              aria-pressed={selected}
            >
              {preset}
              {selected && (
                <Check className="absolute top-1 right-1 size-3 text-primary" />
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAmount("")}
          className={cn(
            "h-11 rounded-lg border text-xs font-medium transition-all",
            "border-dashed border-border-strong text-muted-foreground hover:text-foreground hover:border-primary/40",
          )}
        >
          Custom
        </button>
      </div>

      <div className="relative">
        <Input
          id="amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.]/g, "");
            setAmount(v);
          }}
          placeholder="0.00"
          aria-describedby="amount-currency"
          className="h-14 pl-4 pr-20 text-2xl font-mono tabular border-border-strong bg-surface-raised/30 placeholder:text-muted-foreground/40 focus-visible:ring-primary/30"
        />
        <span
          id="amount-currency"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground tracking-wide"
        >
          USDC
        </span>
      </div>
    </div>
  );
}

function InvoiceBlock({
  amount,
  memo,
  dueAt,
}: {
  amount: number;
  memo: string;
  dueAt?: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Amount due
        </span>
        {dueAt && (
          <span className="text-[11px] text-muted-foreground">Due {dueAt}</span>
        )}
      </div>
      <div className="rounded-xl border border-border-strong bg-surface-raised/40 p-5">
        <AmountDisplay amount={amount} size="xl" />
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase mb-2">
          For
        </p>
        <p className="text-sm leading-relaxed text-foreground/90 italic font-serif">
          “{memo}”
        </p>
      </div>
    </div>
  );
}
