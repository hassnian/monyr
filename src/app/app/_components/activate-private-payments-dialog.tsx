"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShieldCheck, Check, Sparkles, KeyRound, Lock, Clock3, ArrowUpRight, Copy } from "lucide-react";
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
import { UmbraMark } from "@/components/payments/umbra-mark";
import { handleUrl } from "@/lib/brand";
import { getVaultBalance, sponsorVaultForUmbraActivation } from "@/app/actions/vault";
import { VAULT_SPONSOR_LAMPORTS } from "@/lib/vault/constants";
import { sweepExcessVaultSol } from "@/lib/vault/sweep";
import { setUmbraStatus } from "@/app/actions/handles";

type StepKey =
  | "unlock"
  | "sponsor"
  | "userAccountInitialisation"
  | "registerX25519PublicKey"
  | "registerUserForAnonymousUsage"
  | "sweep"
  | "finalize";


const STATUS_COPY: Record<StepKey, string> = {
  unlock: "Asking your wallet for permission…",
  sponsor: "Funding your vault…",
  userAccountInitialisation: "Creating your private account…",
  registerX25519PublicKey: "Enabling encrypted balances…",
  registerUserForAnonymousUsage: "Going private…",
  sweep: "Reclaiming unused setup funds…",
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
  const [copied, setCopied] = useState(false);

  const isWorking = phase === "running";
  const isDone = phase === "done";

  function handleCopyPaymentLink() {
    try {
      navigator.clipboard?.writeText(`https://${handleUrl(user.handle)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked in some contexts — ignore. */
    }
  }

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

    if (lamports >= VAULT_SPONSOR_LAMPORTS) return;

    const result = await sponsorVaultForUmbraActivation(vaultPubkey);
    await waitForVaultBalance(vaultPubkey, BigInt(result.lamports));
  }

  async function sweepUnusedSetupSol(vault: UnlockedVault) {
    setActiveStep("sweep");
    await sweepExcessVaultSol(vault);
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
      await sweepUnusedSetupSol(vault);

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

  const statusLine = activeStep ? STATUS_COPY[activeStep] : null;

  const buttonLabel = useMemo(() => {
    if (isDone) return copied ? "Copied" : "Copy your payment link";
    if (!isWorking) {
      return unlockedVault?.vaultPubkey === user.vaultPubkey
        ? "Continue activation"
        : "Activate";
    }
    return statusLine ?? "Activating…";
  }, [isDone, copied, isWorking, statusLine, unlockedVault, user.vaultPubkey]);

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
            {isDone ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/15 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-primary">
                <Check className="size-3" strokeWidth={2.5} />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">
                <Sparkles className="size-3 text-primary" strokeWidth={2.25} />
                One-time setup
              </span>
            )}
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

          {!isDone ? <ValueProps /> : null}

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
              onClick={isDone ? handleCopyPaymentLink : handleActivate}
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
                  <span
                    key={buttonLabel}
                    aria-live="polite"
                    className="animate-[status-fade_360ms_ease-out]"
                  >
                    {buttonLabel}
                  </span>
                </>
              ) : isDone ? (
                <>
                  {copied ? (
                    <Check className="mr-2 size-4" strokeWidth={2.5} />
                  ) : (
                    <Copy className="mr-2 size-4" strokeWidth={2.25} />
                  )}
                  <span
                    key={buttonLabel}
                    aria-live="polite"
                    className="animate-[status-fade_360ms_ease-out]"
                  >
                    {buttonLabel}
                  </span>
                </>
              ) : (
                buttonLabel
              )}
            </Button>
            <style jsx>{`
              @keyframes status-fade {
                from {
                  opacity: 0;
                  transform: translateY(2px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>

            <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] leading-snug text-muted-foreground/85">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" strokeWidth={2} />
                Non-custodial. Monyr never holds your keys.
              </span>
              <span aria-hidden className="hidden size-1 rounded-full bg-border-strong sm:inline-block" />
              <a
                href="https://umbraprivacy.com/"
                target="_blank"
                rel="noreferrer"
                className="group/umbra inline-flex items-center gap-1.5 text-foreground/90 transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
              >
                <span>Powered by</span>
                <span className="inline-flex items-center gap-1">
                  <UmbraMark className="size-3 text-foreground/85 transition-colors group-hover/umbra:text-primary" />
                  <span className="font-serif italic underline underline-offset-4 decoration-primary/45 transition-colors group-hover/umbra:decoration-primary">
                    Umbra
                  </span>
                </span>
                <ArrowUpRight
                  className="size-3 text-muted-foreground/80 transition-colors group-hover/umbra:text-primary"
                  strokeWidth={2}
                />
              </a>
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
        icon={<Lock className="size-3.5" strokeWidth={2.25} />}
        title="End-to-end encrypted"
        sub="Payments land in a vault only your wallet opens"
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

