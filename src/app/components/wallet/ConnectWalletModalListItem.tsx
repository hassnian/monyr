"use client";

import { Wallet, WalletAccount, WalletWithFeatures } from "@wallet-standard/base";
import {
  StandardConnect,
  StandardConnectFeature,
  StandardDisconnect,
  StandardDisconnectFeature,
} from "@wallet-standard/features";
import Image from "next/image";
import { useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectWalletModalListItem({
  wallet,
  onConnected,
  onDisconnect,
}: {
  wallet: Wallet;
  onConnected: (accounts: readonly WalletAccount[]) => void;
  onDisconnect: () => void;
}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      const connectFeature = (
        wallet as WalletWithFeatures<StandardConnectFeature>
      ).features[StandardConnect];
      const { accounts } = await connectFeature.connect();
      setConnected(true);
      setIsConnecting(false);
      onConnected(accounts);
    } catch (error) {
      console.log("failed", error);
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const disconnectFeature = (
        wallet as WalletWithFeatures<StandardDisconnectFeature>
      ).features[StandardDisconnect];
      await disconnectFeature.disconnect();
      setConnected(false);
      onDisconnect();
    } catch (error) {
      console.log("failed", error);
    }
  };

  return (
    <button
      type="button"
      onClick={() => (connected ? disconnectWallet() : connectWallet())}
      disabled={isConnecting}
      aria-busy={isConnecting}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        connected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-surface-raised/40 hover:border-border-strong hover:bg-surface-raised",
        isConnecting && "opacity-70"
      )}
    >
      <div className="relative flex size-9 items-center justify-center rounded-md bg-surface-raised ring-1 ring-border overflow-hidden shrink-0">
        <Image
          src={wallet.icon}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-7 object-contain"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{wallet.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {connected
            ? "Connected — tap to disconnect"
            : isConnecting
              ? "Awaiting signature…"
              : "Tap to connect"}
        </p>
      </div>

      <div className="shrink-0 pr-1 text-muted-foreground">
        {connected ? (
          <Check className="size-4 text-primary" strokeWidth={2.5} />
        ) : isConnecting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
    </button>
  );
}
