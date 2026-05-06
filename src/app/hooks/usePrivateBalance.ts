"use client";

import { useMemo } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/app/contexts/auth-context";
import { useUmbra } from "@/app/hooks/useUmbra";
import { nativeAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";

export type PrivateBalance = {
  /** Decrypted available balance in human token units. `null` while locked or loading. */
  balance: number | null;
  /** Same value in base units. `null` while unavailable. */
  balanceBaseUnits: bigint | null;
  /** True while a fetch is in flight (initial or background refetch). */
  isLoading: boolean;
  /** True while the vault is locked and balance can't be read. */
  isLocked: boolean;
  refetch: () => void;
};

/**
 * Shared accessor for the owner's decrypted payment-token balance. Re-uses the
 * `metrics/private-balance` query key so consumers get the same cache as the
 * dashboard metrics tile and stay in lockstep with manual invalidations after
 * sends and withdrawals.
 */
export function usePrivateBalance(): PrivateBalance {
  const { unlockedVault } = useAuth();
  const { getPrivateTokenBalance } = useUmbra();
  const isUnlocked = Boolean(unlockedVault);

  const query = useQuery({
    enabled: isUnlocked,
    queryKey: ["metrics", "private-balance", unlockedVault?.vaultPubkey],
    queryFn: async () => {
      if (!unlockedVault) return null;
      const result = await getPrivateTokenBalance({
        signer: createUmbraSignerFromKeyPair(unlockedVault.keyPairSigner),
      });
      return result.state === "shared"
        ? Number(result.balance) / 10 ** solanaPaymentConfig.tokenDecimals
        : 0;
    },
    staleTime: 30_000,
    retry: false,
  });

  const balance = query.data ?? null;
  const balanceBaseUnits = useMemo(
    () =>
      balance !== null
        ? nativeAmount(balance, solanaPaymentConfig.tokenDecimals)
        : null,
    [balance],
  );

  return {
    balance,
    balanceBaseUnits,
    isLoading: query.isFetching,
    isLocked: !isUnlocked,
    refetch: query.refetch,
  };
}
