"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ConnectWallets } from "./ConnectWallets";

type ConnectWalletModalProps = {
  onConnected: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ConnectWalletModal({
  onConnected,
  open,
  onOpenChange,
}: ConnectWalletModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const actualOpen = open ?? internalOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const handleConnected = useCallback(() => {
    setOpen(false);
    onConnected();
  }, [onConnected, setOpen]);

  return (
    <Dialog open={actualOpen} onOpenChange={setOpen}>
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="font-serif text-2xl leading-tight tracking-tight">
            Select your wallet
          </DialogTitle>
          <DialogDescription>
            Choose a Solana wallet to continue.
          </DialogDescription>
        </DialogHeader>

        <ConnectWallets onConnected={handleConnected} />
      </DialogContent>
    </Dialog>
  );
}
