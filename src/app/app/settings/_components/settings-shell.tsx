"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useDashboard } from "@/app/hooks/useDashboard";
import { useWallet } from "@/app/contexts/wallet-context";

import { TopBar } from "@/app/app/_components/top-bar";
import { DashboardSkeleton } from "@/app/app/_components/dashboard-skeleton";

import { SettingsView } from "./settings-view";

/**
 * Mirrors the dashboard shell guard so the Settings page enforces the same
 * "wallet connected + handle claimed" invariants. The header and skeleton are
 * reused so the navigation across /app routes feels like one application.
 */
export function SettingsShell() {
  const router = useRouter();
  const { isConnected, user, isLoading, refresh } = useDashboard();
  const { isReconnecting } = useWallet();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const redirectedRef = useRef(false);
  const shouldRedirect = hydrated && !isConnected && !isReconnecting;

  useEffect(() => {
    if (!shouldRedirect || redirectedRef.current) return;
    redirectedRef.current = true;
    toast.error("You must connect a wallet", {
      description: "Connect a Solana wallet to view your vault settings.",
    });
    router.replace("/");
  }, [shouldRedirect, router]);

  if (!hydrated || isReconnecting || isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isConnected || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <TopBar handle={user.handle} />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-10 md:px-10 md:pt-12">
        <SettingsView user={user} onRefresh={refresh} />
      </main>
    </>
  );
}
