"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useDashboard } from "@/app/hooks/useDashboard";
import { useWallet } from "@/app/contexts/wallet-context";

import { TopBar } from "./top-bar";
import { IdentityStrip } from "./identity-strip";
import { MetricsBand } from "./metrics-band";
import { QuickActions } from "./quick-actions";
import { DashboardTabs } from "./dashboard";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { LockedDashboardBanner } from "./locked-dashboard-banner";

/**
 * Client shell for the dashboard. Handles the wallet/auth guard, loading
 * states, and fans the resolved user data into the strip and the top bar.
 * Payment/revenue rows below the identity strip stay mocked.
 */
export function DashboardShell() {
  const router = useRouter();
  const { isConnected, user, isLoading, refresh } = useDashboard();
  const { isReconnecting } = useWallet();

  // Wait for at least one client effect tick before evaluating the guard so
  // the wallet reconnect logic can populate the connected wallet on refresh.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const redirectedRef = useRef(false);
  const shouldRedirect =
    hydrated && !isConnected && !isReconnecting;

  useEffect(() => {
    if (!shouldRedirect || redirectedRef.current) return;
    redirectedRef.current = true;
    toast.error("You must connect a wallet", {
      description: "Connect a Solana wallet to open your private workspace.",
    });
    router.replace("/");
  }, [shouldRedirect, router]);

  if (!hydrated || isReconnecting || isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isConnected) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <NoHandleScreen />;
  }

  return (
    <>
      <TopBar handle={user.handle} />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-10 md:px-10 md:pt-12">
        <div className="flex flex-col gap-10">
          <IdentityStrip user={user} onActivated={refresh} />
          <LockedDashboardBanner />
          <MetricsBand user={user} />
          <QuickActions handle={user.handle} />
          <div className="h-px w-full bg-border/60" />
          <DashboardTabs />
        </div>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6 text-[12px] text-muted-foreground/70">
          <p className="font-serif italic">
            Non-custodial. Amounts, memos, and senders stay off the public ledger.
          </p>
          <p className="font-mono tabular text-[11px] uppercase tracking-[0.2em]">
            Monyr v0.1 · Solana mainnet
          </p>
        </footer>
      </main>
    </>
  );
}

function NoHandleScreen() {
  return (
    <main className="relative z-10 mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/80">
        No handle yet
      </p>
      <h1 className="font-serif text-3xl leading-[1.05] tracking-tight text-foreground md:text-4xl">
        This wallet hasn&apos;t claimed a handle.
      </h1>
      <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
        Claim one to open your private workspace — payments land in a vault only
        you can decrypt.
      </p>
      <Link
        href="/claim"
        className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground ring-1 ring-primary/30 transition-all hover:bg-primary/90 active:translate-y-px shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]"
      >
        Claim your handle
      </Link>
    </main>
  );
}
