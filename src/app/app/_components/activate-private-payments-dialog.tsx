"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShieldCheck, Check, Sparkles, KeyRound, Coins, Clock3 } from "lucide-react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { delay } from "@/lib/delay";

import { useAuth, type AuthUser, type UnlockedVault } from "@/app/contexts/auth-context";
import { useVault } from "@/app/hooks/useVault";
import { useUmbra } from "@/app/hooks/useUmbra";
import { getVaultBalance, sponsorVault } from "@/app/actions/vault";
import { setUmbraStatus } from "@/app/actions/handles";

type StepKey =
  | "unlock"
  | "sponsor"
  | "userAccountInitialisation"
  | "registerX25519PublicKey"
  | "registerUserForAnonymousUsage"
  | "finalize";

const SPONSOR_MIN_LAMPORTS = 50_000_000n; // 0.05 SOL — matches sponsorVault().

const STATUS_COPY: Record<StepKey, string> = {
  unlock: "Asking your wallet for permission…",
  sponsor: "Funding your vault…",
  userAccountInitialisation: "Creating your private account…",
  registerX25519PublicKey: "Enabling encrypted balances…",
  registerUserForAnonymousUsage: "Going private…",
  finalize: "Almost done…",
};

async function waitForVaultBalance(
  vaultPubkey: string,
  minimumLamports: bigint,
  timeoutMs = 30_000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const balance = await getVaultBalance(vaultPubkey);
    const lamports = BigInt(balance.lamports);
    if (lamports >= minimumLamports) return lamports;
    await delay(1_000);
  }

  throw new Error("Timed out waiting for vault funding");
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser;
  onActivated?: () => void | Promise<void>;
};

export function ActivatePrivatePaymentsDialog({
  open,
  onOpenChange,
  user,
  onActivated,
}: Props) {
  const { unlockedVault, setUnlockedVault } = useAuth();
  const { decryptEncryptedVault } = useVault();
  const { registerAccount } = useUmbra();

  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");

  const isWorking = phase === "running";
  const isDone = phase === "done";

  // When the dialog reopens after a transient error, clear the error so the
  // user starts fresh — but leave the cached unlock state alone.
  const lastOpenRef = useRef(open);
  useEffect(() => {
    if (open && !lastOpenRef.current) {
      setError(null);
    }
    lastOpenRef.current = open;
  }, [open]);

  async function ensureUnlockedVault(): Promise<UnlockedVault> {
    if (unlockedVault?.vaultPubkey === user.vaultPubkey) {
      return unlockedVault;
    }
    setActiveStep("unlock");
    const result = await decryptEncryptedVault(
      user.encryptedVaultSecret,
      user.vaultPubkey,
    );
    setUnlockedVault(result);
    return result;
  }

  async function ensureFundedVault(vaultPubkey: string) {
    setActiveStep("sponsor");
    const balance = await getVaultBalance(vaultPubkey);
    const lamports = BigInt(balance.lamports);

    if (lamports >= SPONSOR_MIN_LAMPORTS) return;

    const result = await sponsorVault(vaultPubkey);
    await waitForVaultBalance(vaultPubkey, BigInt(result.lamports));
  }

  async function ensureUmbraRegistered(vault: UnlockedVault) {
    const umbraSigner = createUmbraSignerFromKeyPair(vault.keyPairSigner);

    // Callbacks fire only for sub-steps that still need to run; already-done
    // sub-steps are skipped, so this is safe to re-run after a partial failure.
    await registerAccount({
      signer: umbraSigner,
      callbacks: {
        userAccountInitialisation: {
          pre: async () => {
            setActiveStep("userAccountInitialisation");
          },
        },
        registerX25519PublicKey: {
          pre: async () => {
            setActiveStep("registerX25519PublicKey");
          },
        },
        registerUserForAnonymousUsage: {
          pre: async () => {
            setActiveStep("registerUserForAnonymousUsage");
          },
        },
      },
    });
  }

  async function handleActivate() {
    setError(null);
    setPhase("running");

    try {
      const vault = await ensureUnlockedVault();
      await ensureFundedVault(vault.vaultPubkey);
      await ensureUmbraRegistered(vault);

      setActiveStep("finalize");
      await setUmbraStatus(user.handle, "active");

      setActiveStep(null);
      setPhase("done");
      await onActivated?.();
    } catch (err) {
      console.error("Activation failed", err);
      setActiveStep(null);
      setPhase("idle");
      setError("That didn't go through. Try again.");
    }
  }

  const buttonLabel = useMemo(() => {
    if (isDone) return "Done";
    if (!isWorking) {
      return unlockedVault?.vaultPubkey === user.vaultPubkey
        ? "Continue activation"
        : "Activate";
    }
    return "Activating…";
  }, [isDone, isWorking, unlockedVault, user.vaultPubkey]);

  const statusLine = activeStep ? STATUS_COPY[activeStep] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[460px] gap-0 overflow-hidden border border-border-strong/60 bg-popover p-0",
          "shadow-2xl shadow-black/50",
        )}
      >
        {/* Candlelight glow behind the dialog body. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -top-16 h-56 -z-10 blur-3xl opacity-80"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, oklch(0.82 0.11 72 / 0.22), transparent 70%)",
          }}
        />

        <div className="flex flex-col items-center gap-6 px-7 pb-7 pt-9">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">
              <Sparkles className="size-3 text-primary" strokeWidth={2.25} />
              One-time setup
            </span>
            <DialogTitle className="font-serif text-[28px] leading-[1.05] tracking-tight text-foreground">
              {isDone
                ? "Private payments are live."
                : "Activate private payments."}
            </DialogTitle>
            <DialogDescription className="max-w-[36ch] text-[13px] leading-relaxed text-muted-foreground">
              {isDone
                ? "Encrypted account registered. Payments to your handle now land in a vault only you can decrypt."
                : "Registers an encrypted account on Solana. Payments to your handle land in a vault only you can decrypt."}
            </DialogDescription>
          </div>

          {/* Body swaps between value props (idle) and live status (running). */}
          {isWorking ? (
            <ActivatingStatus line={statusLine} />
          ) : !isDone ? (
            <ValueProps />
          ) : null}

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="text-center text-[12px] text-destructive"
            >
              {error}
            </p>
          )}

          <div className="flex w-full flex-col items-center gap-3">
            <Button
              type="button"
              onClick={isDone ? () => onOpenChange(false) : handleActivate}
              disabled={isWorking}
              className={cn(
                "h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90",
                "ring-1 ring-primary/30 transition-all active:translate-y-px",
                "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
                "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
                "disabled:opacity-95 disabled:hover:bg-primary",
              )}
            >
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {buttonLabel}
                </>
              ) : isDone ? (
                <>
                  <Check className="mr-2 size-4" strokeWidth={2.5} />
                  {buttonLabel}
                </>
              ) : (
                buttonLabel
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
              <ShieldCheck className="size-3" />
              Non-custodial. Monyr never holds your keys.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ValueProps() {
  return (
    <ul className="flex w-full flex-col gap-2.5">
      <ValueRow
        icon={<KeyRound className="size-3.5" strokeWidth={2.25} />}
        title="One signature, that's it"
        sub="Keys never leave your device"
      />
      <ValueRow
        icon={<Coins className="size-3.5" strokeWidth={2.25} />}
        title="No upfront cost"
        sub={
          <>
            <span className="font-mono tabular text-foreground/85">~$1</span>{" "}
            in setup fees, deducted from your first private payment
          </>
        }
      />
      <ValueRow
        icon={<Clock3 className="size-3.5" strokeWidth={2.25} />}
        title="About five seconds"
        sub="Once you approve in your wallet"
      />
    </ul>
  );
}

function ValueRow({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/8 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] font-medium leading-tight text-foreground">
          {title}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground/85">
          {sub}
        </p>
      </div>
    </li>
  );
}

function ActivatingStatus({ line }: { line: string | null }) {
  return (
    <div className="flex h-[72px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/[0.04] px-4">
      <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-primary/75">
        Working
      </span>
      <p
        key={line}
        className="text-center text-[13px] leading-snug text-foreground/90 animate-[status-fade_360ms_ease-out]"
      >
        {line ?? "Preparing…"}
      </p>
      <style jsx>{`
        @keyframes status-fade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
