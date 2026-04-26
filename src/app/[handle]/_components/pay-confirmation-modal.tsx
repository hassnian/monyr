"use client";

import { useEffect, useState } from "react";
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
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/app/contexts/wallet-context";
import { useUmbra } from "@/app/hooks/useUmbra";
import UmbraRegister from "@/app/components/claim/UmbraRegister";
import type { ProfileIdentity } from "./profile.types";

type Props = ProfileIdentity & {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  memo?: string;
  invoiceId?: string;
};

type Step = "checking" | "register" | "confirm" | "proving" | "success";

/**
 * The payment confirmation modal. UI-only — no real signing yet.
 * Steps: checking → (register) → confirm → proving → success.
 * The register step only appears the first time a payer uses Monyr;
 * returning payers skip straight to confirm.
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
  ownerPubkey
}: Props) {
  const [step, setStep] = useState<Step>("checking");
  const { connectedWallet } = useWallet();
  const { getUserAccount, isAccountFullyRegistered, depositAmount } = useUmbra();

  const { data: userAccount, isPending } = useQuery({
    enabled: open && Boolean(connectedWallet),
    queryKey: ["umbra-user-account", connectedWallet?.account.address],
    queryFn: getUserAccount,
  });

  useEffect(() => {
    if (!open || step !== "checking" || isPending) return;
    setStep(
      isAccountFullyRegistered(userAccount ?? undefined)
        ? "confirm"
        : "register",
    );
  }, [open, step, isPending, userAccount, isAccountFullyRegistered]);

  useEffect(() => {
    if (!open) {
      // reset after the close animation so the next open re-checks cleanly
      const t = setTimeout(() => setStep("checking"), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // useEffect(() => {
  //   if (step === "proving") {
  //     const t = setTimeout(() => setStep("success"), 3200);
  //     return () => clearTimeout(t);
  //   }
  // }, [step]);

  function confirm() {
    depositAmount({ address: ownerPubkey, amount })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden bg-popover ring-1 ring-border"
        showCloseButton={step !== "proving"}
      >
        {step === "checking" && (
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
            onComplete={() => setStep("confirm")}
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
            onContinue={() => confirm()}
          />
        )}
        {step === "proving" && <ProvingStep />}
        {step === "success" && (
          <SuccessStep
            handle={handle}
            displayName={displayName}
            amount={amount}
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
          A quick setup for your private account — three signatures, then
          paying is a single tap. Forever.
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
  onContinue,
}: {
  handle: string;
  displayName: string | null;
  amount: number;
  memo?: string;
  subPath?: string;
  invoiceId?: string;
  onContinue: () => void;
}) {
  return (
    <div className="p-6">
      <DialogHeader className="sr-only">
        <DialogTitle>Confirm payment to {handle}</DialogTitle>
        <DialogDescription>
          Review the amount and memo before signing.
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

      <p className="mt-4 text-center text-[11.5px] text-muted-foreground/80">
        Hidden on-chain · Gas on us
      </p>

      <Button
        onClick={onContinue}
        className="mt-5 h-12 w-full rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Sign & send
        <ArrowRight className="ml-1.5 size-4" />
      </Button>
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
        Generating a privacy proof so no one can see the amount or where it went.
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

function SuccessStep({
  handle,
  displayName,
  amount,
  onClose,
}: {
  handle: string;
  displayName: string | null;
  amount: number;
  onClose: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <DialogHeader className="sr-only">
        <DialogTitle>Payment sent privately</DialogTitle>
      </DialogHeader>

      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30 mb-5 animate-in fade-in zoom-in-95 duration-300">
        <Check className="size-7 text-primary" strokeWidth={2.5} />
      </div>

      <h3 className="font-serif text-3xl tracking-tight text-foreground leading-tight">
        Paid. Privately.
      </h3>
      <div className="mt-3">
        <AmountDisplay amount={amount} size="lg" className="text-foreground/90" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {displayName
          ? `Sent to ${displayName}. Only ${handle} can see the amount.`
          : `Sent privately. Only ${handle} can see the amount.`}
      </p>

      <div className="mt-6 rounded-lg border border-border bg-surface-raised/40 p-3.5 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Receipt
            </p>
            <p className="mt-0.5 text-xs font-mono text-foreground/80 truncate">
              rcpt_4xKp…9wQz
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline shrink-0"
          >
            Download PDF
          </button>
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
          className="h-10 flex-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
