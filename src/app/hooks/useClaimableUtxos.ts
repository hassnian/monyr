"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getMyClaimableUtxos } from "@/app/actions/claimable-utxos";
import { useAuth } from "@/app/contexts/auth-context";
import type { DailyFlow } from "@/app/app/_data";
import { decimalAmount } from "@/lib/payments/amount";
import { decryptReceiptPayload, type EncryptedReceiptPayload } from "@/lib/receipts/crypto";

export type EncryptedClaimPayload = {
  version: 1;
  amountBaseUnits: string;
  tokenDecimals: number;
  mint: string;
  treeIndex: string;
  insertionIndex: string;
  claimedAt: string;
};

function parsePaymentTime(createdAt: string) {
  const time = new Date(createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function useClaimableUtxos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["claimable-utxos", user?.handle],
    queryFn: () => getMyClaimableUtxos(user?.handle),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export function useClaimedPaymentSummary() {
  const { unlockedVault } = useAuth();
  const query = useClaimableUtxos();

  const receiptQuery = useQuery({
    enabled: Boolean(unlockedVault) && Boolean(query.data),
    queryKey: ["claimable-utxos", "claimed-receipts", unlockedVault?.vaultPubkey, query.dataUpdatedAt],
    queryFn: async () => {
      if (!unlockedVault || !query.data) return [];

      const claimedRows = query.data.filter(
        (row) => row.status === "claimed" && row.encryptedClaimPayload,
      );

      return Promise.all(
        claimedRows.map(async (row) => {
          const payload = await decryptReceiptPayload<EncryptedClaimPayload>(
            unlockedVault.receiptEncryptionPrivateKey,
            JSON.parse(row.encryptedClaimPayload!) as EncryptedReceiptPayload,
          );

          return {
            id: row.id,
            claimedAt: row.claimedAt?.toISOString() ?? payload.claimedAt,
            amountBaseUnits: payload.amountBaseUnits,
            mint: payload.mint,
            tokenDecimals: payload.tokenDecimals,
          };
        }),
      );
    },
    staleTime: 30_000,
    retry: false,
  });

  return useMemo(() => {
    const receipts = receiptQuery.data ?? [];
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthReceipts = receipts.filter(
      (receipt) => parsePaymentTime(receipt.claimedAt) >= monthStart.getTime(),
    );
    const end = receipts.length
      ? new Date(Math.max(...receipts.map((receipt) => parsePaymentTime(receipt.claimedAt))))
      : now;
    const start = addDays(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())), -30);
    const dailyTotals = new Map<string, number>();
    for (const receipt of receipts) {
      const date = new Date(receipt.claimedAt);
      if (!Number.isFinite(date.getTime())) continue;
      const key = isoDay(date);
      dailyTotals.set(
        key,
        (dailyTotals.get(key) ?? 0) +
          decimalAmount(receipt.amountBaseUnits, receipt.tokenDecimals),
      );
    }
    const dailyFlow: DailyFlow[] = Array.from({ length: 31 }, (_, index) => {
      const date = addDays(start, index);
      const key = isoDay(date);
      return { date: key, received: dailyTotals.get(key) ?? 0 };
    });

    return {
      receipts,
      totalReceivedBaseUnits: receipts
        .reduce((sum, receipt) => sum + BigInt(receipt.amountBaseUnits), 0n)
        .toString(),
      totalReceivedCount: receipts.length,
      monthToDateBaseUnits: monthReceipts
        .reduce((sum, receipt) => sum + BigInt(receipt.amountBaseUnits), 0n)
        .toString(),
      monthToDateCount: monthReceipts.length,
      dailyFlow,
      rangeStartLabel: start.toLocaleDateString("en", { month: "short", day: "2-digit", timeZone: "UTC" }),
      rangeEndLabel: end.toLocaleDateString("en", { month: "short", day: "2-digit", timeZone: "UTC" }),
      isLoading: query.isLoading || receiptQuery.isLoading,
      isFetching: query.isFetching || receiptQuery.isFetching,
    };
  }, [query.isFetching, query.isLoading, receiptQuery.data, receiptQuery.isFetching, receiptQuery.isLoading]);
}
