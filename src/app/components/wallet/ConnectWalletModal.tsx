"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useState } from "react";

import { ConnectWallets } from "./ConnectWallets";

export function ConnectWalletModal({
  onConnected,
}: {
  onConnected: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button>Connect</Button>}></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select your wallet</DialogTitle>

          <ConnectWallets
            onConnected={() => {
              setOpen(false);
              onConnected();
            }}
          />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
