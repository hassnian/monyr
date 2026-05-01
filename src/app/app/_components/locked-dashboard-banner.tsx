"use client";

import { KeyRound, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUnlockDashboard } from "@/app/hooks/useUnlockDashboard";

/**
 * Single source-of-truth unlock surface for the dashboard. Renders only when
 * the user has private payments active but their vault is not unlocked in this
 * session. Other surfaces (metrics tiles, inbox) show passive 🔒 indicators
 * that point here — there is one place to click "Unlock," not four.
 */
export function LockedDashboardBanner() {
  const { isLocked, isUnlocking, error, unlock } = useUnlockDashboard();

  if (!isLocked) return null;

  return (
    <section
      aria-label="Dashboard locked"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border-strong/60 bg-card/80 p-5 sm:p-6",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_24px_48px_-32px_rgba(0,0,0,0.5)]",
      )}
    >
      {/* Candlelight wash — anchored top-left where the lock icon sits, so the
          eye is led from the warmth into the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-12 h-40 -z-10 blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(40% 100% at 18% 0%, oklch(0.82 0.11 72 / 0.18), transparent 70%)",
        }}
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className={cn(
              "relative grid size-12 shrink-0 place-items-center rounded-xl",
              "border border-primary/30 bg-primary/8 text-primary",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
            )}
          >
            <Lock className="size-5" strokeWidth={2} />
          </div>

          <div className="min-w-0 space-y-1.5">
            <h2 className="font-serif text-[22px] leading-tight tracking-tight text-foreground sm:text-2xl">
              Your dashboard is locked.
            </h2>
            <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground/90">
              Unlock with your wallet to decrypt your balance, inbox, and
              receipts. One signature — keys never leave your device.
            </p>
            {error ? (
              <p
                role="alert"
                className="pt-1 text-[12px] text-destructive/90"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 sm:items-center">
          <Button
            type="button"
            onClick={unlock}
            disabled={isUnlocking}
            className={cn(
              "h-11 gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90",
              "ring-1 ring-primary/30 transition-all active:translate-y-px",
              "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
              "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
              "disabled:opacity-95 disabled:hover:bg-primary",
            )}
          >
            {isUnlocking ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Unlocking…
              </>
            ) : (
              <>
                <KeyRound className="size-4" strokeWidth={2.25} />
                Unlock dashboard
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
