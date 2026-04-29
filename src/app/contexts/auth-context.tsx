"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { KeyPairSigner } from "@solana/kit";

import { useWallet } from "./wallet-context";
import { createLoginChallenge, getCurrentWalletSession, verifyLoginSignature } from "@/app/actions/auth";
import { getMyHandles, type UmbraStatus } from "@/app/actions/handles";
import { signMessage } from "@/lib/payments/wallet";

export type AuthUser = {
  handle: string;
  displayName: string | null;
  vaultPubkey: string;
  encryptedVaultSecret: string;
  umbraStatus: UmbraStatus;
  bio: string | null;
};

export type UnlockedVault = {
  vaultPubkey: string;
  keyPairSigner: KeyPairSigner;
};

type AuthContextType = {
  isConnected: boolean;
  walletAddress: string | null;
  user: AuthUser | null;
  isUserLoading: boolean;
  refreshUser: () => Promise<void>;
  unlockedVault: UnlockedVault | null;
  setUnlockedVault: (vault: UnlockedVault | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ConnectedWalletForSession = NonNullable<ReturnType<typeof useWallet>["connectedWallet"]>;

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function ensureWalletSession(connectedWallet: ConnectedWalletForSession) {
  const walletAddress = connectedWallet.account.address;
  const currentSession = await getCurrentWalletSession();

  if (currentSession?.walletAddress === walletAddress) return;

  const { message } = await createLoginChallenge(walletAddress);
  const signature = await signMessage({
    wallet: connectedWallet.wallet,
    account: connectedWallet.account,
    text: message,
  });

  await verifyLoginSignature({
    walletAddress,
    message,
    signature: bytesToBase64(signature),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { connectedWallet, isConnected } = useWallet();
  const walletAddress = connectedWallet?.account.address ?? null;

  // Cache the in-memory vault keypair alongside the wallet it was unlocked
  // for. If the wallet changes, the cached value is no longer valid — we
  // detect that during render and reset, per the React docs pattern for
  // "resetting state when a prop changes".
  const [vaultState, setVaultState] = useState<{
    vault: UnlockedVault | null;
    boundAddress: string | null;
  }>({ vault: null, boundAddress: walletAddress });

  if (vaultState.boundAddress !== walletAddress) {
    setVaultState({ vault: null, boundAddress: walletAddress });
  }

  const unlockedVault = vaultState.vault;
  const setUnlockedVault = useCallback(
    (vault: UnlockedVault | null) => {
      setVaultState({ vault, boundAddress: walletAddress });
    },
    [walletAddress],
  );

  const { data, isLoading, refetch } = useQuery({
    enabled: Boolean(connectedWallet),
    queryKey: ["auth", "my-handles", walletAddress],
    queryFn: async () => {
      if (!connectedWallet) return [];
      await ensureWalletSession(connectedWallet);
      return getMyHandles();
    },
    staleTime: 30_000,
    retry: false,
  });

  const user: AuthUser | null = useMemo(() => {
    const row = data?.[0];
    if (!row) return null;
    return {
      handle: row.handle,
      displayName: row.displayName,
      vaultPubkey: row.vaultPubkey,
      encryptedVaultSecret: row.encryptedVaultSecret,
      umbraStatus: row.umbraStatus,
      bio: row.bio,
    };
  }, [data]);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo<AuthContextType>(
    () => ({
      isConnected,
      walletAddress,
      user,
      isUserLoading: Boolean(walletAddress) && isLoading,
      refreshUser,
      unlockedVault,
      setUnlockedVault,
    }),
    [
      isConnected,
      walletAddress,
      user,
      isLoading,
      refreshUser,
      unlockedVault,
      setUnlockedVault,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
