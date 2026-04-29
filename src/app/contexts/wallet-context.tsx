"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Wallet, WalletAccount, WalletWithFeatures } from "@wallet-standard/base";
import { getWallets } from "@wallet-standard/app";
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardEvents,
  type StandardEventsFeature,
} from "@wallet-standard/features";

export interface ConnectedWallet {
  account: WalletAccount;
  wallet: Wallet;
}

interface WalletContextType {
  account: WalletAccount | null;
  wallet: Wallet | null;
  connectedWallet: ConnectedWallet | null;
  setConnectedWallet: (wallet: ConnectedWallet | null) => void;
  isConnected: boolean;
  /** True while we're trying to silently restore a previous session. */
  isReconnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = "monyr:connected-wallet";
const RECONNECT_TIMEOUT_MS = 4_000;

function readSavedWalletName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistWalletName(name: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (name) {
      window.localStorage.setItem(STORAGE_KEY, name);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* localStorage may be unavailable in some contexts — ignore. */
  }
}

async function silentlyConnectWallet(
  wallet: Wallet,
): Promise<readonly WalletAccount[] | null> {
  const connectFeature = (wallet as WalletWithFeatures<StandardConnectFeature>)
    .features[StandardConnect];
  if (!connectFeature) return null;
  try {
    const { accounts } = await connectFeature.connect({ silent: true });
    return accounts;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWalletState] =
    useState<ConnectedWallet | null>(null);
  // Start in `reconnecting` mode only if a saved session exists. SSR sees
  // `false` (no localStorage), the browser flips it true on mount if needed.
  const [isReconnecting, setIsReconnecting] = useState(false);

  const setConnectedWallet = useCallback((next: ConnectedWallet | null) => {
    setConnectedWalletState(next);
    persistWalletName(next?.wallet.name ?? null);
  }, []);

  // Auto-reconnect to the previously-used wallet on mount.
  useEffect(() => {
    const savedName = readSavedWalletName();
    if (!savedName) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReconnecting(true);

    let cancelled = false;
    const wallets = getWallets();

    async function tryConnect(wallet: Wallet) {
      const accounts = await silentlyConnectWallet(wallet);
      if (cancelled) return false;
      if (accounts && accounts.length > 0) {
        setConnectedWalletState({ account: accounts[0], wallet });
        setIsReconnecting(false);
        return true;
      }
      return false;
    }

    async function attempt() {
      const match = wallets.get().find((w) => w.name === savedName);
      if (match) {
        const ok = await tryConnect(match);
        if (ok) return true;
      }
      return false;
    }

    // Try immediately, then watch for late registrations (most browser wallets
    // attach asynchronously after the page mounts).
    attempt().then((connected) => {
      if (cancelled || connected) return;

      const offRegister = wallets.on("register", (...registered) => {
        for (const wallet of registered) {
          if (wallet.name === savedName) {
            void tryConnect(wallet);
            return;
          }
        }
      });

      // Stop waiting after a short timeout — the wallet probably revoked us.
      const timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setIsReconnecting(false);
        persistWalletName(null);
      }, RECONNECT_TIMEOUT_MS);

      return () => {
        offRegister();
        window.clearTimeout(timeoutId);
      };
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for wallet-side disconnects and account changes so our context
  // mirrors reality even when the user manages the connection from the wallet.
  useEffect(() => {
    if (!connectedWallet) return;

    const events = (
      connectedWallet.wallet as WalletWithFeatures<StandardEventsFeature>
    ).features[StandardEvents];
    if (!events) return;

    const off = events.on("change", (changes) => {
      if (!changes.accounts) return;
      const next = changes.accounts[0];
      if (!next) {
        setConnectedWalletState(null);
        persistWalletName(null);
      } else if (next.address !== connectedWallet.account.address) {
        setConnectedWalletState({
          account: next,
          wallet: connectedWallet.wallet,
        });
      }
    });

    return () => {
      off();
    };
  }, [connectedWallet]);

  const value = useMemo<WalletContextType>(
    () => ({
      account: connectedWallet?.account ?? null,
      wallet: connectedWallet?.wallet ?? null,
      isConnected: Boolean(connectedWallet),
      connectedWallet,
      setConnectedWallet,
      isReconnecting,
    }),
    [connectedWallet, setConnectedWallet, isReconnecting],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }

  return context;
}
