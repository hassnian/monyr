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
import { GradientAvatar } from "@/components/hush/gradient-avatar";
import { HandleText } from "@/components/hush/handle-text";
import { AmountDisplay } from "@/components/hush/amount-display";
import { ArrowRight, Check, Wallet, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  handle: string;
  displayName: string;
  amount: number;
  memo?: string;
  subPath?: string;
  invoiceId?: string;
};

type Step = "confirm" | "wallet" | "proving" | "success";

/**
 * The payment confirmation modal. UI-only — no real signing.
 * Steps: confirm → wallet → proving → success. Each step is deliberate;
 * the proving step is a trust-building moment, not a loading screen.
 */
export function PaySheet({
  open,
  onOpenChange,
  handle,
  displayName,
  amount,
  memo,
  subPath,
  invoiceId,
}: Props) {
  const [step, setStep] = useState<Step>("confirm");

  useEffect(() => {
    if (!open) {
      // reset after the close animation so the next open is clean
      const t = setTimeout(() => setStep("confirm"), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Mock: advance through the stages automatically once wallet is "connected"
  useEffect(() => {
    if (step === "proving") {
      const t = setTimeout(() => setStep("success"), 3200);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden bg-popover ring-1 ring-border"
        showCloseButton={step !== "proving"}
      >
        {step === "confirm" && (
          <ConfirmStep
            handle={handle}
            displayName={displayName}
            amount={amount}
            memo={memo}
            subPath={subPath}
            invoiceId={invoiceId}
            onContinue={() => setStep("wallet")}
          />
        )}
        {step === "wallet" && (
          <WalletStep onSigned={() => setStep("proving")} />
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
  displayName: string;
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
          <p className="text-sm font-medium text-foreground truncate">
            {displayName}
          </p>
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
        Continue
        <ArrowRight className="ml-1.5 size-4" />
      </Button>
    </div>
  );
}

function WalletStep({ onSigned }: { onSigned: () => void }) {
  const wallets = [
    { name: "Phantom", color: "oklch(0.55 0.2 285)" },
    { name: "Solflare", color: "oklch(0.78 0.16 55)" },
    { name: "Backpack", color: "oklch(0.72 0.15 25)" },
  ];

  return (
    <div className="p-6">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl font-normal tracking-tight">
          Connect a wallet
        </DialogTitle>
        <DialogDescription>
          One signature. We don&apos;t hold your keys.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-2">
        {wallets.map((w) => (
          <button
            key={w.name}
            type="button"
            onClick={onSigned}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg border border-border bg-surface-raised/40 p-3",
              "hover:border-border-strong hover:bg-surface-raised transition-colors"
            )}
          >
            <span
              className="flex size-9 items-center justify-center rounded-md"
              style={{ backgroundColor: w.color, opacity: 0.18 }}
            >
              <Wallet
                className="size-4"
                style={{ color: w.color, opacity: 1 }}
              />
            </span>
            <span className="flex-1 text-left text-sm font-medium text-foreground">
              {w.name}
            </span>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>

      <p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="size-3" />
        Hush never sees your keys, seed phrase, or balances.
      </p>
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
  displayName: string;
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
        Sent to {displayName}. Only {handle} can see the amount.
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
