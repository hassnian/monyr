import { useState } from "react";

import { useAuth } from "@/app/contexts/auth-context";
import { useVault } from "./useVault";

/**
 * Single shared "unlock the dashboard" action. Wraps the wallet-signature
 * decrypt flow plus the auth-context cache so any surface (banner, metrics
 * tile, inbox) can trigger one consistent unlock.
 */
export function useUnlockDashboard() {
  const { user, unlockedVault, setUnlockedVault } = useAuth();
  const { decryptEncryptedVault } = useVault();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = user?.umbraStatus === "active";
  const isUnlocked =
    Boolean(user) && unlockedVault?.vaultPubkey === user?.vaultPubkey;
  const isLocked = isActive && !isUnlocked;

  async function unlock() {
    if (!user || !isActive || isUnlocking) return null;
    setIsUnlocking(true);
    setError(null);
    try {
      const vault = await decryptEncryptedVault(
        user.encryptedVaultSecret,
        user.vaultPubkey,
      );
      setUnlockedVault(vault);
      return vault;
    } catch (err) {
      console.error("Dashboard unlock failed", err);
      setError("Couldn't unlock. Try again.");
      return null;
    } finally {
      setIsUnlocking(false);
    }
  }

  return {
    unlock,
    isUnlocking,
    isLocked,
    isUnlocked,
    isActive,
    error,
  };
}
