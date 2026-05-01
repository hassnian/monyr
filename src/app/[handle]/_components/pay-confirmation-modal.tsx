"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/payments/gradient-avatar";
import { HandleText } from "@/components/payments/handle-text";
import { AmountDisplay } from "@/components/payments/amount-display";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Eye, Loader2, Lock } from "lucide-react";
import { useWallet } from "@/app/contexts/wallet-context";
import { useUmbra } from "@/app/hooks/useUmbra";
import { sendQuickUsdcPayment } from "@/lib/payments/quick-pay";
import { recordPaymentMetadata } from "@/app/actions/payment-metadata";
import { nativeAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { encryptReceiptPayload } from "@/lib/receipts/crypto";
import UmbraRegister from "@/app/components/claim/UmbraRegister";
import type { ProfileIdentity } from "./profile.types";

type Props = ProfileIdentity & {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  memo?: string;
  invoiceId?: string;
};

type Step =
  | "confirm"
  | "private-checking"
  | "register"
  | "quick-confirm"
  | "quick-sending"
  | "proving"
  | "success";

type PaymentRail = "quick" | "private";

/**
 * Payment confirmation modal.
 * Default path is Private Pay (Umbra) when the recipient has umbraStatus
 * "active". Public Quick Pay is a fallback the payer must explicitly opt
 * into via a confirmation step. When the recipient is not Umbra-active,
 * the primary CTA is Quick Pay and there is no fallback link.
 */
export function PayConfirmationModal({
  open,
  onOpenChange,
  handle,
  displayName,
  amount,
  memo,
  subPath,
  invoiceId,
  vaultPubkey,
  umbraStatus,
  receiptEncryptionPublicKey,
}: Props) {
  const isUmbraActive = umbraStatus === "active";
  const [step, setStep] = useState<Step>("confirm");
  const [completedRail, setCompletedRail] = useState<PaymentRail>("quick");
  const [receiptSignature, setReceiptSignature] = useState<string | null>(null);
  const { connectedWallet } = useWallet();
  const { getUserAccount, isAccountFullyRegistered, createReceiverClaimableUtxo } = useUmbra();

  async function buildEncryptedReceiptPayload(receipt: {
    rail: PaymentRail;
    utxoCreateSignature: string;
  }) {
    return JSON.stringify(await encryptReceiptPayload(receiptEncryptionPublicKey, {
      version: 1,
      amountBaseUnits: nativeAmount(amount, solanaPaymentConfig.tokenDecimals).toString(),
      tokenDecimals: solanaPaymentConfig.tokenDecimals,
      mint: solanaPaymentConfig.usdcMint,
      handle,
      memo,
      invoiceId,
      subPath,
      createdAt: new Date().toISOString(),
      ...receipt,
    }));
  }

  useEffect(() => {
    if (!open) {
      // reset after the close animation so the next open starts at the choice screen
      const t = setTimeout(() => {
        setCompletedRail("quick");
        setReceiptSignature(null);
        setStep("confirm");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);



  async function startQuickPay() {
    if (!connectedWallet) return;

    setCompletedRail("quick");
    setStep("quick-sending");

    try {
      const result = await sendQuickUsdcPayment({
        wallet: connectedWallet.wallet,
        account: connectedWallet.account,
        destinationOwner: vaultPubkey,
        amount,
      });
      const receiptSignature = String(result.signature);
      setReceiptSignature(receiptSignature);
      setStep("success");
    } catch (error) {
      console.error("Quick Pay failed", error);
      setStep("confirm");
    }
  }

  async function runPrivateDeposit() {
    setCompletedRail("private");
    setStep("proving");
    try {
      const result = await createReceiverClaimableUtxo({ amount, address: vaultPubkey });
      const utxoCreateSignature = String(result.signature);
      setReceiptSignature(utxoCreateSignature);
      const encryptedPayload = await buildEncryptedReceiptPayload({
        rail: "private",
        utxoCreateSignature,
      });
      await recordPaymentMetadata({
        handle,
        utxoCreateSignature,
        encryptedPayload,
      }).catch((error) => {
        console.error("Failed to save payment metadata", error);
      });
      setStep("success");
    } catch (error) {
      console.error("Private Pay failed", error);
      setStep("confirm");
    }
  }

  async function startPrivatePay() {
    setCompletedRail("private");
    setStep("private-checking");

    const account = await getUserAccount();
    if (isAccountFullyRegistered(account)) {
      await runPrivateDeposit();
    } else {
      setStep("register");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden bg-popover ring-1 ring-border"
        showCloseButton={step !== "proving"}
      >
        {step === "private-checking" && (
          <CheckingStep
            handle={handle}
            displayName={displayName}
            subPath={subPath}
          />
        )}
        {step === "register" && (
          <RegisterStep
            handle={handle}
            displayName={displayName}
            subPath={subPath}
            onComplete={runPrivateDeposit}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            handle={handle}
            displayName={displayName}
            amount={amount}
            memo={memo}
            subPath={subPath}
            invoiceId={invoiceId}
            isUmbraActive={isUmbraActive}
            onPay={isUmbraActive ? startPrivatePay : startQuickPay}
            onChoosePublic={() => setStep("quick-confirm")}
          />
        )}
        {step === "quick-confirm" && (
          <QuickConfirmStep
            handle={handle}
            displayName={displayName}
            amount={amount}
            memo={memo}
            subPath={subPath}
            invoiceId={invoiceId}
            onContinue={startQuickPay}
            onBack={() => setStep("confirm")}
          />
        )}
        {step === "quick-sending" && <QuickSendingStep />}
        {step === "proving" && <ProvingStep />}
        {step === "success" && (
          <SuccessStep
            handle={handle}
            displayName={displayName}
            amount={amount}
            rail={completedRail}
            receiptSignature={receiptSignature}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecipientChip({
  handle,
  displayName,
  subPath,
}: {
  handle: string;
  displayName: string | null;
  subPath?: string;
}) {
  const name = displayName ?? handle;
  return (
    <div className="flex items-center gap-3 pb-5">
      <GradientAvatar handle={handle} size={40} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          Paying {name}
        </p>
        <HandleText
          handle={handle}
          subPath={subPath}
          size="sm"
          className="text-muted-foreground"
        />
      </div>
    </div>
  );
}

function CheckingStep({
  handle,
  displayName,
  subPath,
}: {
  handle: string;
  displayName: string | null;
  subPath?: string;
}) {
  return (
    <div className="p-6">
      <DialogHeader className="sr-only">
        <DialogTitle>Getting things ready</DialogTitle>
        <DialogDescription>Checking your account.</DialogDescription>
      </DialogHeader>
      <RecipientChip
        handle={handle}
        displayName={displayName}
        subPath={subPath}
      />
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Getting things ready…
        </p>
      </div>
    </div>
  );
}

function RegisterStep({
  handle,
  displayName,
  subPath,
  onComplete,
}: {
  handle: string;
  displayName: string | null;
  subPath?: string;
  onComplete: () => void;
}) {
  return (
    <div className="p-6">
      <RecipientChip
        handle={handle}
        displayName={displayName}
        subPath={subPath}
      />
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl font-normal tracking-tight">
          Just the one time.
        </DialogTitle>
        <DialogDescription>
          Private payments use <UmbraLink />. First-time setup — three signatures,
          about 15 seconds.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-5">
        <UmbraRegister onComplete={onComplete} />
      </div>
    </div>
  );
}

function ConfirmStep({
  handle,
  displayName,
  amount,
  memo,
  subPath,
  invoiceId,
  isUmbraActive,
  onPay,
  onChoosePublic,
}: {
  handle: string;
  displayName: string | null;
  amount: number;
  memo?: string;
  subPath?: string;
  invoiceId?: string;
  isUmbraActive: boolean;
  onPay: () => void;
  onChoosePublic: () => void;
}) {
  return (
    <PaymentReview
      handle={handle}
      displayName={displayName}
      amount={amount}
      memo={memo}
      subPath={subPath}
      invoiceId={invoiceId}
    >
      <div className="mt-5 space-y-3">
        <Button
          onClick={onPay}
          className="h-12 w-full rounded-xl text-base font-semibold ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)] transition-all hover:bg-primary/90 hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]"
        >
          Pay {amount.toFixed(2)} USDC
        </Button>

        {isUmbraActive && (
          <button
            type="button"
            onClick={onChoosePublic}
            className="block w-full rounded-md py-1 text-center text-[12px] text-muted-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Having trouble? Pay publicly instead.
          </button>
        )}
      </div>
    </PaymentReview>
  );
}

function QuickConfirmStep({
  handle,
  displayName,
  amount,
  memo,
  subPath,
  invoiceId,
  onContinue,
  onBack,
}: {
  handle: string;
  displayName: string | null;
  amount: number;
  memo?: string;
  subPath?: string;
  invoiceId?: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  const name = displayName ?? `@${handle}`;
  return (
    <PaymentReview
      handle={handle}
      displayName={displayName}
      amount={amount}
      memo={memo}
      subPath={subPath}
      invoiceId={invoiceId}
    >
      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border bg-surface-raised/30 px-3.5 py-3">
        <Eye className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Your wallet and the amount will be visible on-chain.{" "}
          <span className="text-foreground/85">{name}&apos;s main wallet stays private.</span>
        </p>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 rounded-md px-1 py-2 text-[13px] font-medium text-foreground/85 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Keep it private
        </button>
        <Button
          variant="outline"
          onClick={onContinue}
          className="h-11 rounded-xl px-5 text-[13px] font-medium border-border-strong"
        >
          Continue publicly
          <ArrowRight className="ml-1.5 size-3.5" />
        </Button>
      </div>
    </PaymentReview>
  );
}

function PaymentReview({
  handle,
  displayName,
  amount,
  memo,
  subPath,
  invoiceId,
  children,
}: {
  handle: string;
  displayName: string | null;
  amount: number;
  memo?: string;
  subPath?: string;
  invoiceId?: string;
  children: ReactNode;
}) {
  return (
    <div className="p-6">
      <DialogHeader className="sr-only">
        <DialogTitle>Confirm payment to {handle}</DialogTitle>
        <DialogDescription>
          Review the amount and choose how to pay.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 pb-5">
        <GradientAvatar handle={handle} size={40} />
        <div className="min-w-0">
          {displayName && (
            <p className="text-sm font-medium text-foreground truncate">
              {displayName}
            </p>
          )}
          <HandleText
            handle={handle}
            subPath={subPath}
            size="sm"
            className="text-muted-foreground"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border-strong bg-surface-raised/40 p-5 text-center">
        <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase mb-2">
          {invoiceId ? `Invoice · #${invoiceId}` : "You'll send"}
        </p>
        <AmountDisplay amount={amount} size="xl" className="tracking-tight" />
        {memo && (
          <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground italic font-serif">
            “{memo}”
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

function QuickSendingStep() {
  return (
    <div className="p-8 text-center" aria-live="polite">
      <DialogHeader className="sr-only">
        <DialogTitle>Sending payment</DialogTitle>
      </DialogHeader>

      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>

      {/*<h3 className="font-serif text-2xl tracking-tight text-foreground">
        Sending payment.
      </h3>
      <p className="mx-auto mt-2 max-w-[32ch] text-sm text-muted-foreground">
        Quick Pay uses a normal USDC transfer to the recipient’s Hush Vault.
      </p>*/}
    </div>
  );
}

function ProvingStep() {
  return (
    <div className="p-8 text-center" aria-live="polite">
      <DialogHeader className="sr-only">
        <DialogTitle>Sealing your payment</DialogTitle>
      </DialogHeader>

      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 mb-6">
        <Lock className="size-6 text-primary" />
      </div>

      <h3 className="font-serif text-2xl tracking-tight text-foreground">
        Sealing your payment.
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-[32ch] mx-auto">
        Hiding the amount and recipient on-chain.
      </p>

      <div
        className="mt-6 flex items-center justify-center gap-1.5"
        aria-hidden
      >
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground/70 font-mono uppercase tracking-wider">
        Usually 2–8 seconds
      </p>
    </div>
  );
}

function UmbraLink() {
  return (
    <a
      href="https://umbraprivacy.com/"
      target="_blank"
      rel="noreferrer"
      className="group/umbra inline-flex items-baseline gap-0.5 text-foreground/90 transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
    >
      <span className="font-serif italic underline underline-offset-4 decoration-primary/45 transition-colors group-hover/umbra:decoration-primary">
        Umbra
      </span>
      <ArrowUpRight
        className="size-3 self-center text-muted-foreground/80 transition-colors group-hover/umbra:text-primary"
        strokeWidth={2}
      />
    </a>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="block size-1.5 rounded-full bg-primary"
      style={{
        animation: "pulseDot 1.2s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </span>
  );
}

function shortenSignature(signature: string) {
  if (signature.length <= 14) return signature;
  return `${signature.slice(0, 6)}…${signature.slice(-6)}`;
}

function SuccessStep({
  handle,
  displayName,
  amount,
  rail,
  receiptSignature,
  onClose,
}: {
  handle: string;
  displayName: string | null;
  amount: number;
  rail: PaymentRail;
  receiptSignature: string | null;
  onClose: () => void;
}) {
  const isPrivate = rail === "private";
  const receipt = receiptSignature ? shortenSignature(receiptSignature) : "Pending…";

  return (
    <div className="p-8 text-center">
      <DialogHeader className="sr-only">
        <DialogTitle>{isPrivate ? "Payment sent privately" : "Payment sent"}</DialogTitle>
      </DialogHeader>

      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30 mb-5 animate-in fade-in zoom-in-95 duration-300">
        <Check className="size-7 text-primary" strokeWidth={2.5} />
      </div>

      <h3 className="font-serif text-3xl tracking-tight text-foreground leading-tight">
        {isPrivate ? "Paid. Privately." : "Paid."}
      </h3>
      <div className="mt-3">
        <AmountDisplay amount={amount} size="lg" className="text-foreground/90" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {displayName
          ? `Sent to ${displayName}.`
          : `Sent to ${handle}.`}
      </p>

      <div className="mt-6 rounded-lg border border-border bg-surface-raised/40 p-3.5 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Receipt
            </p>
            <p className="mt-0.5 text-xs font-mono text-foreground/80 truncate">
              {receipt}
            </p>
          </div>
          {receiptSignature && (
            <a
              href={`https://solscan.io/tx/${receiptSignature}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              View
            </a>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          variant="outline"
          className="h-10 flex-1 rounded-lg"
          onClick={onClose}
        >
          Save {handle}
        </Button>
        <Button
          className="h-10 flex-1 rounded-lg hover:bg-primary/90"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
