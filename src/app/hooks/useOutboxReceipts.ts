"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyOutboxReceipts } from "@/app/actions/outbox-receipts";
import { useAuth } from "@/app/contexts/auth-context";
import type { Outgoing } from "@/app/app/_data";
import { decimalAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import {
  decryptReceiptPayload,
  type EncryptedReceiptPayload,
} from "@/lib/receipts/crypto";

export type OutboxReceiptPayload = {
  version: 1;
  recipient: string;
  recipientKind: Outgoing["recipientKind"];
  amountBaseUnits: string;
  tokenDecimals: number;
  mint: string;
  memo?: string | null;
  utxoCreateSignature: string;
  createdAt: string;
};

function truncateSignature(signature: string) {
  if (signature.length <= 9) return signature;
  return `${signature.slice(0, 4)}…${signature.slice(-4)}`;
}

export function useOutboxReceipts() {
  const { user, unlockedVault } = useAuth();

  return useQuery<Outgoing[]>({
    enabled: Boolean(user && unlockedVault),
    queryKey: ["outbox", "receipts", user?.handle, unlockedVault?.vaultPubkey],
    queryFn: async () => {
      if (!unlockedVault) return [];
      const rows = await getMyOutboxReceipts();
      const decrypted = await Promise.all(
        rows.map(async (row) => {
          const payload = await decryptReceiptPayload<OutboxReceiptPayload>(
            unlockedVault.receiptEncryptionPrivateKey,
            JSON.parse(row.encryptedPayload) as EncryptedReceiptPayload,
          ).catch(() => null);

          if (!payload) return null;

          const entry: Outgoing = {
            id: row.id,
            recipient: payload.recipient,
            recipientKind: payload.recipientKind,
            amount: decimalAmount(
              payload.amountBaseUnits,
              payload.tokenDecimals ?? solanaPaymentConfig.tokenDecimals,
            ),
            memo: payload.memo?.trim() || null,
            status: "confirmed",
            createdAt: payload.createdAt || row.createdAt,
            txSig: truncateSignature(payload.utxoCreateSignature),
          };

          return entry;
        }),
      );

      return decrypted.filter((entry): entry is Outgoing => entry !== null);
    },
    staleTime: 30_000,
    retry: false,
  });
}
