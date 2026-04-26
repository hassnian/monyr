"use client";

import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import { useMemo, useSyncExternalStore } from "react";
import { Wallet as WalletIcon, Lock } from "lucide-react";
import { useWallet } from "@/app/contexts/wallet-context";
import { ConnectWalletModalListItem } from "./ConnectWalletModalListItem";

function subscribe(onStoreChange: () => void) {
  const wallets = getWallets();
  const offRegister = wallets.on("register", onStoreChange);
  const offUnregister = wallets.on("unregister", onStoreChange);

  return () => {
    offRegister();
    offUnregister();
  };
}

function getSnapshot(): readonly Wallet[] {
  return getWallets().get();
}

export function ConnectWalletsClient({
  onConnected,
}: {
  onConnected: () => void;
}) {
  const wallets = useSyncExternalStore(subscribe, getSnapshot);
  const { setConnectedWallet } = useWallet();

  const solanaWallets = useMemo(() => {
    return wallets.filter(
      (wallet) =>
        wallet.chains.some((chain) => chain.startsWith("solana:")) &&
        wallet.features["solana:signTransaction"] &&
        wallet.features["solana:signMessage"]
    );
  }, [wallets]);

  if (solanaWallets.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-surface-raised/30 p-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-secondary">
          <WalletIcon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            No Solana wallets detected.
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Install{" "}
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
            >
              Phantom
            </a>
            ,{" "}
            <a
              href="https://solflare.com"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
            >
              Solflare
            </a>
            , or{" "}
            <a
              href="https://backpack.app"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
            >
              Backpack
            </a>{" "}
            to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {solanaWallets.map((wallet, index) => (
        <ConnectWalletModalListItem
          key={`${wallet.name}-${wallet.version}-${wallet.chains.join(",")}-${index}`}
          wallet={wallet}
          onDisconnect={() => {
            setConnectedWallet(null);
          }}
          onConnected={(accounts) => {
            setConnectedWallet({
              account: accounts[0],
              wallet,
            });
            onConnected();
          }}
        />
      ))}

      <p className="mt-4 flex items-center gap-1.5 font-serif italic text-[12.5px] leading-relaxed text-muted-foreground/80">
        <Lock className="size-3 not-italic" />
        Monyr never holds your keys. One signature derives your privacy keys locally.
      </p>
    </div>
  );
}
