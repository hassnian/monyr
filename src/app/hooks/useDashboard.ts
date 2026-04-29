"use client";

import { useAuth } from "@/app/contexts/auth-context";
import {
  dailyFlow,
  inboxFilterOptions,
  metrics,
  outgoing,
  payments,
  sendLinks,
  subHandles,
} from "@/app/app/_data";

/**
 * Aggregated read model for the dashboard. The signed-in user (handle, display
 * name, umbra status) is loaded from the database via the auth context;
 * everything else (payments, outgoing, sub-handles, metrics) is mocked.
 */
export function useDashboard() {
  const { user, isUserLoading, isConnected, walletAddress, refreshUser } = useAuth();

  const displayName = user?.displayName?.trim() || user?.handle || "";

  return {
    isConnected,
    walletAddress,
    user,
    displayName,
    isLoading: isUserLoading,
    refresh: refreshUser,
    isUmbraActive: user?.umbraStatus === "active",
    umbraStatus: user?.umbraStatus ?? null,

    // Mocked workspace data — see `_data.ts`.
    metrics,
    payments,
    outgoing,
    subHandles,
    sendLinks,
    inboxFilterOptions,
    dailyFlow,
  };
}
