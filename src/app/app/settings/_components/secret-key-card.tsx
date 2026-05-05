"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useVault } from "@/app/hooks/useVault";
import type { AuthUser } from "@/app/contexts/auth-context";

type Props = {
  user: AuthUser;
};

const AUTO_HIDE_SECONDS = 30;

/**
 * Danger zone. The vault secret is the single piece of credential material
 * that, if leaked, drains every payment a recipient ever received. Treat the
 * reveal as a one-off action: each click re-prompts the wallet for a fresh
 * signature, the secret is held only in component state, and we auto-hide it
 * after a short countdown so an unattended screen doesn't leak it.
 */
export function SecretKeyCard({ user }: Props) {
  const { revealVaultSecretBase58 } = useVault();
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = user.umbraStatus === "active";

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCountdown() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(AUTO_HIDE_SECONDS);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setSecretKey(null);
          return AUTO_HIDE_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
  }

  function hide() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecretKey(null);
    setSecondsLeft(AUTO_HIDE_SECONDS);
    setCopied(false);
  }

  async function reveal() {
    if (isRevealing) return;
    setIsRevealing(true);
    setError(null);
    try {
      const { secretKeyBase58 } = await revealVaultSecretBase58(
        user.encryptedVaultSecret,
        user.vaultPubkey,
      );
      setSecretKey(secretKeyBase58);
      startCountdown();
    } catch (err) {
      console.error("Reveal vault secret failed", err);
      setError(
        "Couldn't decrypt your vault secret. Make sure you signed with the wallet that owns this handle.",
      );
    } finally {
      setIsRevealing(false);
    }
  }

  function copy() {
    if (!secretKey) return;
    try {
      navigator.clipboard?.writeText(secretKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked — ignore. */
    }
  }

  return (
    <section
      aria-labelledby="secret-key-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-destructive/35 bg-card/80 p-5 sm:p-6",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_24px_48px_-32px_rgba(0,0,0,0.5)]",
      )}
    >
      {/* Faint red wash anchored to the icon corner — same atmospheric trick
          as LockedDashboardBanner, but in destructive tones so the eye
          registers "this is the danger zone" before it reads a word. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-12 -z-10 h-40 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(40% 100% at 18% 0%, oklch(0.62 0.18 26 / 0.18), transparent 70%)",
        }}
      />

      <header className="flex items-start gap-4">
        <div
          aria-hidden
          className={cn(
            "relative grid size-12 shrink-0 place-items-center rounded-xl",
            "border border-destructive/35 bg-destructive/10 text-destructive",
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
          )}
        >
          <KeyRound className="size-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 space-y-1.5">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-destructive/85">
            Decryption secret · Danger zone
          </span>
          <h2
            id="secret-key-heading"
            className="font-serif text-[22px] leading-tight tracking-tight text-foreground"
          >
            Your vault secret key.
          </h2>
          <p className="max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground/90">
            Anyone holding this key can move every payment that has ever
            settled into your vault. Hush will never ask for it. Only export
            it if you&apos;re moving funds to your own wallet.
          </p>
        </div>
      </header>

      {!isActive ? (
        <InactiveNotice />
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {secretKey ? (
            <RevealedState
              secretKey={secretKey}
              copied={copied}
              onCopy={copy}
              onHide={hide}
              secondsLeft={secondsLeft}
            />
          ) : (
            <LockedState
              isRevealing={isRevealing}
              error={error}
              onReveal={reveal}
            />
          )}
        </div>
      )}
    </section>
  );
}

function LockedState({
  isRevealing,
  error,
  onReveal,
}: {
  isRevealing: boolean;
  error: string | null;
  onReveal: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-surface-raised/20 px-4 py-3.5",
          "text-[12.5px] text-muted-foreground/85",
        )}
      >
        <AlertTriangle
          aria-hidden
          className="size-4 shrink-0 text-destructive/85"
          strokeWidth={2.25}
        />
        <span>
          Revealing requires a wallet signature. The key stays in memory for
          {" "}
          <span className="font-mono tabular text-foreground/90">
            {AUTO_HIDE_SECONDS}s
          </span>{" "}
          after reveal, then auto-hides.
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive/90">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onReveal}
          disabled={isRevealing}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold",
            "border border-destructive/45 bg-destructive/10 text-destructive",
            "transition-all hover:bg-destructive/15 active:translate-y-px",
            "outline-none focus-visible:ring-2 focus-visible:ring-destructive/50",
            "disabled:cursor-not-allowed disabled:opacity-70",
          )}
        >
          {isRevealing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Awaiting signature…
            </>
          ) : (
            <>
              <Eye className="size-4" strokeWidth={2.25} />
              Reveal secret key
            </>
          )}
        </button>
      </div>
    </>
  );
}

function RevealedState({
  secretKey,
  copied,
  onCopy,
  onHide,
  secondsLeft,
}: {
  secretKey: string;
  copied: boolean;
  onCopy: () => void;
  onHide: () => void;
  secondsLeft: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.22em]">
        <span className="font-mono text-destructive/85">Revealed</span>
        <span
          aria-live="polite"
          className="inline-flex items-center gap-1.5 font-mono tabular text-muted-foreground/80"
        >
          Auto-hides in {secondsLeft.toString().padStart(2, "0")}s
        </span>
      </div>

      <div
        className={cn(
          "rounded-xl border border-destructive/30 bg-surface-raised/40 p-4",
        )}
      >
        <code className="block break-all font-mono tabular text-[12.5px] leading-relaxed text-foreground">
          {secretKey}
        </code>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onHide}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong/60 bg-surface-raised/40 px-3 text-[12.5px] font-medium text-muted-foreground",
            "transition-all hover:border-primary/45 hover:text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <EyeOff className="size-3.5" />
          Hide
        </button>
        <button
          type="button"
          onClick={onCopy}
          aria-live="polite"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/35 bg-destructive/10 px-3 text-[12.5px] font-medium text-destructive",
            "transition-all hover:bg-destructive/15",
            "outline-none focus-visible:ring-2 focus-visible:ring-destructive/50",
          )}
        >
          {copied ? (
            <>
              <Check className="size-3.5" strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy key
            </>
          )}
        </button>
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground/85">
        This is the 64-byte secret key in base58 — the format Phantom,
        Solflare, and Backpack accept on import. Treat it like cash.
      </p>
    </>
  );
}

function InactiveNotice() {
  return (
    <div
      className={cn(
        "mt-5 flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-surface-raised/20 px-4 py-3.5",
        "text-[12.5px] text-muted-foreground/85",
      )}
    >
      <AlertTriangle
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground/70"
        strokeWidth={2.25}
      />
      <span>
        Activate private payments first. There&apos;s no decryption secret to show
        until your vault is created.
      </span>
    </div>
  );
}
