"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Wallet as WalletIcon,
  ChevronDown,
  Copy,
  Check,
  LogOut,
} from "lucide-react";
import type { WalletWithFeatures } from "@wallet-standard/base";
import {
  StandardDisconnect,
  type StandardDisconnectFeature,
} from "@wallet-standard/features";
import { cn } from "@/lib/utils";
import { useWallet } from "@/app/contexts/wallet-context";
import { ConnectWalletModal } from "./ConnectWalletModal";

function truncateAddress(address: string, prefix = 4, suffix = 4) {
  if (address.length <= prefix + suffix + 1) return address;
  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`;
}

export function WalletConnectButton() {
  const { connectedWallet, setConnectedWallet } = useWallet();

  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const address = connectedWallet?.account.address ?? "";
  const truncated = useMemo(() => truncateAddress(address), [address]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch (error) {
      console.error("Failed to copy address", error);
    }
  }, [address]);

  const disconnect = useCallback(async () => {
    if (!connectedWallet) return;
    setIsDisconnecting(true);
    try {
      const disconnectFeature = (
        connectedWallet.wallet as WalletWithFeatures<StandardDisconnectFeature>
      ).features[StandardDisconnect];
      await disconnectFeature?.disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet", error);
    } finally {
      setConnectedWallet(null);
      setIsDisconnecting(false);
      setMenuOpen(false);
    }
  }, [connectedWallet, setConnectedWallet]);

  if (!connectedWallet) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn(
            "group relative inline-flex items-center gap-2 rounded-lg",
            "border border-border-strong/60 bg-surface-raised/40 backdrop-blur-sm",
            "h-9 px-3.5 text-[13px] font-medium text-foreground/90",
            "transition-all duration-200",
            "hover:border-primary/50 hover:bg-surface-raised hover:text-foreground",
            "hover:shadow-[0_0_0_1px_oklch(0.82_0.11_72/0.2),0_8px_24px_-12px_oklch(0.82_0.11_72/0.6)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <WalletIcon className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
          <span>Connect wallet</span>
        </button>

        <ConnectWalletModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onConnected={() => setModalOpen(false)}
        />
      </>
    );
  }

  const walletIcon = connectedWallet.wallet.icon;
  const walletName = connectedWallet.wallet.name;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={cn(
          "group inline-flex h-9 items-center gap-2 rounded-lg",
          "border border-border-strong/60 bg-surface-raised/50 backdrop-blur-sm",
          "pr-2.5 pl-1.5 text-[13px] font-medium text-foreground/90",
          "transition-all duration-200",
          "hover:border-primary/40 hover:bg-surface-raised",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          menuOpen && "border-primary/40 bg-surface-raised",
        )}
      >
        <span
          aria-hidden
          className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background ring-1 ring-border"
        >
          {walletIcon ? (
            <Image
              src={walletIcon}
              alt=""
              width={16}
              height={16}
              unoptimized
              className="size-4 object-contain"
            />
          ) : (
            <WalletIcon className="size-3 text-muted-foreground" />
          )}
          <span
            aria-hidden
            className="absolute -right-px -bottom-px size-2 rounded-full bg-success ring-2 ring-background"
          />
        </span>
        <span className="font-mono tabular">{truncated}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            menuOpen && "rotate-180 text-foreground",
          )}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Wallet options"
          className={cn(
            "absolute top-[calc(100%+8px)] right-0 z-50 w-[264px]",
            "overflow-hidden rounded-xl border border-border-strong/70 bg-popover",
            "shadow-2xl shadow-black/50",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150",
          )}
        >
          <div className="flex items-center gap-2.5 border-b border-border/70 px-3 py-3">
            <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-raised ring-1 ring-border">
              {walletIcon ? (
                <Image
                  src={walletIcon}
                  alt=""
                  width={22}
                  height={22}
                  unoptimized
                  className="size-5 object-contain"
                />
              ) : (
                <WalletIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">
                {walletName}
              </p>
              <p className="flex items-center gap-1.5 text-[10.5px] tracking-wider text-muted-foreground uppercase">
                <span className="inline-block size-1.5 rounded-full bg-success" />
                Solana · Connected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={copyAddress}
            role="menuitem"
            className={cn(
              "group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left",
              "transition-colors hover:bg-accent/40",
              "focus-visible:bg-accent/40 focus-visible:outline-none",
            )}
          >
            <div className="min-w-0">
              <p className="text-[10.5px] tracking-wider text-muted-foreground uppercase">
                Address
              </p>
              <p className="truncate font-mono tabular text-[12.5px] text-foreground/90">
                {address}
              </p>
            </div>
            <span
              aria-live="polite"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-background/60 group-hover:text-foreground"
            >
              {copied ? (
                <Check className="size-3.5 text-primary" strokeWidth={2.5} />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span className="sr-only">
                {copied ? "Address copied" : "Copy address"}
              </span>
            </span>
          </button>

          <div className="h-px w-full bg-border/70" />

          <button
            type="button"
            onClick={disconnect}
            disabled={isDisconnecting}
            role="menuitem"
            className={cn(
              "group flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px]",
              "text-muted-foreground transition-colors",
              "hover:bg-destructive/10 hover:text-destructive",
              "focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            <LogOut className="size-3.5" />
            <span>{isDisconnecting ? "Disconnecting…" : "Disconnect wallet"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
