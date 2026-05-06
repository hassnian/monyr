"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GradientAvatar } from "@/components/payments/gradient-avatar";
import { HandleText } from "@/components/payments/handle-text";
import { AmountDisplay } from "@/components/payments/amount-display";
import { AmountInput } from "@/components/payments/amount-input";
import { PayConfirmationModal } from "./pay-confirmation-modal";
import { formatDecimalAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useWallet } from "@/app/contexts/wallet-context";
import { ConnectWalletModal } from "@/app/components/wallet/ConnectWalletModal";
import type { ProfileDetails } from "./profile.types";

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

type Props = ProfileDetails & {
  variant: Variant;
};

const DEFAULT_PRESETS = [5, 20, 50];

export function ProfileCard({
  handle,
  displayName,
  bio,
  subPath,
  variant,
  vaultPubkey,
  umbraStatus,
  receiptEncryptionPublicKey,
}: Props) {
  const presets =
    variant.kind === "invoice"
      ? []
      : variant.kind === "tipjar"
        ? (variant.presets ?? DEFAULT_PRESETS)
        : DEFAULT_PRESETS;
  const isInvoice = variant.kind === "invoice";

  const [amount, setAmount] = useState<string>(isInvoice ? variant.amount.toFixed(2) : "");
  const [memo, setMemo] = useState<string>("");
  const [showMemo, setShowMemo] = useState(false);
  const [openConfirmationModal, setConfirmationModalOpen] = useState(false);
  const [openConnectWalletModal, setConnectWalletModalOpen] = useState(false);

  const { connectedWallet } = useWallet();

  const numericAmount = Number.parseFloat(amount || "0");
  const canPay = numericAmount > 0;

  const isPayDisabled = !isInvoice && !canPay;

  const label = isInvoice
    ? `Pay ${formatDecimalAmount(variant.amount, { decimals: solanaPaymentConfig.tokenDecimals })} ${solanaPaymentConfig.tokenSymbol}`
    : canPay
      ? `Pay ${formatDecimalAmount(numericAmount, { decimals: solanaPaymentConfig.tokenDecimals })} ${solanaPaymentConfig.tokenSymbol}`
      : "Enter an amount";

  const isUmbraActive = umbraStatus === "active";

  function confirmPay() {
    if (!connectedWallet) {
      setConnectWalletModalOpen(true);
      return;
    }

    if (!canPay) {
      return;
    }

    setConfirmationModalOpen(true);
  }

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
        {/* Top badge — chip on the left, document reference (invoice id) on the right.
            Mirrors the terminal-state card so the silhouette stays steady across
            active → paid → expired. */}
        {(variant.kind === "invoice" || variant.kind === "label") && (
          <div className="mb-6 flex items-center justify-between gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                "font-mono tabular text-[10.5px] uppercase tracking-[0.22em]",
                variant.kind === "invoice"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {variant.kind === "invoice" ? (
                <>
                  <Lock className="size-3" strokeWidth={2.25} />
                  Invoice
                </>
              ) : (
                <>for {variant.label}</>
              )}
            </span>
            {variant.kind === "invoice" && (
              <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
                #{variant.invoiceId}
              </span>
            )}
          </div>
        )}

        {/* Identity block */}
        <div className="flex flex-col items-start gap-5">
          <GradientAvatar handle={handle} size={72} />
          <div className="space-y-1">
            {displayName && (
              <h1
                id="profile-name"
                className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground"
              >
                {displayName}
              </h1>
            )}
            <HandleText
              handle={handle}
              subPath={isInvoice ? undefined : subPath}
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
          onClick={confirmPay}
          disabled={isPayDisabled}
          className={cn(
            "mt-7 h-12 w-full rounded-xl text-base font-semibold",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
            "transition-all",
          )}
        >
          {label}
        </Button>

        {isUmbraActive && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground/85">
            <Lock className="size-3" strokeWidth={2} />
            Encrypted via Umbra · No wallet address exposed
          </p>
        )}
      </div>

      <PayConfirmationModal
        open={openConfirmationModal}
        onOpenChange={setConfirmationModalOpen}
        handle={handle}
        vaultPubkey={vaultPubkey}
        umbraStatus={umbraStatus}
        receiptEncryptionPublicKey={receiptEncryptionPublicKey}
        displayName={displayName}
        amount={numericAmount}
        memo={isInvoice ? variant.memoTemplate : memo || undefined}
        subPath={subPath}
        invoiceId={isInvoice ? variant.invoiceId : undefined}
      />

      <ConnectWalletModal
        open={openConnectWalletModal}
        onOpenChange={setConnectWalletModalOpen}
        onConnected={() => {
          setConnectWalletModalOpen(false);
          if (canPay) {
            setConfirmationModalOpen(true);
          }
        }}
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

      <AmountInput
        variant="visitor"
        id="amount"
        label="Amount"
        hint={`${solanaPaymentConfig.tokenSymbol} · Solana`}
        size="lg"
        value={amount}
        onValueChange={setAmount}
      />
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
  const dueLabel = formatShortDate(dueAt);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Amount due
        </span>
        {dueLabel && (
          <span className="text-[11px] text-muted-foreground">Due {dueLabel}</span>
        )}
      </div>
      <div className="rounded-xl border border-border-strong bg-surface-raised/40 p-5">
        <AmountDisplay amount={amount} size="xl" />
      </div>
      {memo.trim() && (
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase mb-2">
            For
          </p>
          <p className="text-sm leading-relaxed text-foreground/90 italic font-serif">
            “{memo}”
          </p>
        </div>
      )}
    </div>
  );
}
