"use client";

import { useEffect, useMemo, useState } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQuery } from "@tanstack/react-query";

import { getMyPaymentMetadata } from "@/app/actions/payment-metadata";
import { useAuth } from "@/app/contexts/auth-context";
import { useUmbra, type UmbraClaimableUtxo } from "@/app/hooks/useUmbra";
import { useUnlockDashboard } from "@/app/hooks/useUnlockDashboard";
import type { DailyFlow, Payment } from "@/app/app/_data";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { decryptReceiptPayload, type EncryptedReceiptPayload } from "@/lib/receipts/crypto";

export type PaymentMetadataPayload = {
  amountBaseUnits?: string;
  memo?: string | null;
  subPath?: string | null;
  invoiceId?: string | null;
  utxoCreateSignature?: string;
  createdAt?: string;
};

export type InboxPayment = Payment & {
  utxo: UmbraClaimableUtxo;
};

export type StoredClaimStatus = "claiming" | "claimed";

const CLAIM_STATUS_EVENT = "hush:umbra-claim-status-changed";

export function getStoredClaimKey(vaultPubkey: string, paymentId: string) {
  return `hush:umbra-claim:${vaultPubkey}:${paymentId}`;
}

export function readStoredClaimStatus(vaultPubkey: string, paymentId: string) {
  try {
    return window.localStorage.getItem(
      getStoredClaimKey(vaultPubkey, paymentId),
    ) as StoredClaimStatus | null;
  } catch {
    return null;
  }
}

export function writeStoredClaimStatus(
  vaultPubkey: string,
  paymentId: string,
  status: StoredClaimStatus,
) {
  try {
    window.localStorage.setItem(getStoredClaimKey(vaultPubkey, paymentId), status);
    window.dispatchEvent(new CustomEvent(CLAIM_STATUS_EVENT));
  } catch {
    // Non-critical UI dedupe only.
  }
}

function getFirstClaimCelebratedKey(vaultPubkey: string) {
  return `hush:first-claim-celebrated:${vaultPubkey}`;
}

export function hasCelebratedFirstClaim(vaultPubkey: string) {
  try {
    return window.localStorage.getItem(getFirstClaimCelebratedKey(vaultPubkey)) === "1";
  } catch {
    return false;
  }
}

export function markFirstClaimCelebrated(vaultPubkey: string) {
  try {
    window.localStorage.setItem(getFirstClaimCelebratedKey(vaultPubkey), "1");
  } catch {
    // Confetti is decorative — silent failure is fine.
  }
}

export function useStoredClaimedPaymentIds(
  payments: readonly Pick<Payment, "id">[],
  vaultPubkey?: string | null,
) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(CLAIM_STATUS_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(CLAIM_STATUS_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  return useMemo(() => {
    void revision;
    if (!vaultPubkey) return new Set<string>();

    const ids = new Set<string>();
    for (const payment of payments) {
      const status = readStoredClaimStatus(vaultPubkey, payment.id);
      if (status === "claimed") {
        ids.add(payment.id);
      }
    }
    return ids;
  }, [payments, vaultPubkey, revision]);
}

function takeMatchingMetadata(
  metadataByAmount: Map<string, PaymentMetadataPayload[]>,
  amountBaseUnits: string,
) {
  const matches = metadataByAmount.get(amountBaseUnits);
  return matches?.shift() ?? null;
}

function toTokenAmount(amountBaseUnits: string | bigint) {
  return Number(amountBaseUnits) / 10 ** solanaPaymentConfig.tokenDecimals;
}

function parsePaymentTime(payment: Pick<Payment, "createdAt">) {
  const time = new Date(payment.createdAt).getTime();
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

export function useInboxPayments() {
  const { user, unlockedVault } = useAuth();
  const { scanRecentClaimableUtxos } = useUmbra();
  const { isUnlocked } = useUnlockDashboard();

  return useQuery<InboxPayment[]>({
    enabled: isUnlocked && Boolean(unlockedVault),
    queryKey: ["inbox", "claimable", user?.handle, unlockedVault?.vaultPubkey],
    queryFn: async () => {
      if (!unlockedVault) return [];
      const [result, metadataRows] = await Promise.all([
        scanRecentClaimableUtxos({
          signer: createUmbraSignerFromKeyPair(unlockedVault.keyPairSigner),
        }),
        getMyPaymentMetadata(),
      ]);
      const metadata = await Promise.all(
        metadataRows.map(async (row) =>
          decryptReceiptPayload<PaymentMetadataPayload>(
            unlockedVault.receiptEncryptionPrivateKey,
            JSON.parse(row.encryptedPayload) as EncryptedReceiptPayload,
          ).catch(() => null),
        ),
      );
      const metadataByAmount = metadata.reduce((map, payload) => {
        if (!payload?.amountBaseUnits) return map;
        const matches = map.get(payload.amountBaseUnits) ?? [];
        matches.push(payload);
        map.set(payload.amountBaseUnits, matches);
        return map;
      }, new Map<string, PaymentMetadataPayload[]>());

      // TODO: replace amount-only metadata matching with a stable UTXO index
      // match (commitmentIndex/leafIndex) once creation stores that index.
      const claimable = [...result.received, ...result.publicReceived];
      return claimable.map((utxo) => {
        const amountBaseUnits = utxo.amount.toString();
        const metadata = takeMatchingMetadata(metadataByAmount, amountBaseUnits);

        return {
          id: `${utxo.treeIndex}:${utxo.insertionIndex}`,
          amount: toTokenAmount(utxo.amount),
          amountBaseUnits,
          memo: metadata?.memo?.trim() || null,
          payerLabel: null,
          payerPubkey: null,
          subPath: metadata?.subPath ?? null,
          subLabel: metadata?.invoiceId ? `Invoice ${metadata.invoiceId}` : null,
          createdAt: metadata?.createdAt ?? new Date().toISOString(),
          status: "pending",
          txSig: metadata?.utxoCreateSignature?.slice(0, 8) ?? `${utxo.treeIndex}:${utxo.insertionIndex}`,
          utxo,
        } satisfies InboxPayment;
      });
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useInboxSummary(
  payments: readonly Payment[],
  settledPaymentIds: ReadonlySet<string> = new Set(),
) {
  return useMemo(() => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthLabel = new Intl.DateTimeFormat("en", { month: "long" }).format(now);

    const totalBaseUnits = payments.reduce(
      (sum, payment) => sum + BigInt(payment.amountBaseUnits ?? 0),
      0n,
    );
    const monthPayments = payments.filter((payment) => parsePaymentTime(payment) >= monthStart.getTime());
    const monthBaseUnits = monthPayments.reduce(
      (sum, payment) => sum + BigInt(payment.amountBaseUnits ?? 0),
      0n,
    );
    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending" && !settledPaymentIds.has(payment.id),
    );
    const pendingBaseUnits = pendingPayments.reduce(
      (sum, payment) => sum + BigInt(payment.amountBaseUnits ?? 0),
      0n,
    );

    const labelKeys = new Set(
      payments
        .map((payment) => payment.subPath)
        .filter((subPath): subPath is string => Boolean(subPath)),
    );

    const end = payments.length
      ? new Date(Math.max(...payments.map(parsePaymentTime)))
      : now;
    const start = addDays(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())), -30);
    const dailyTotals = new Map<string, number>();
    for (const payment of payments) {
      const date = new Date(payment.createdAt);
      if (!Number.isFinite(date.getTime())) continue;
      const key = isoDay(date);
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + payment.amount);
    }
    const dailyFlow: DailyFlow[] = Array.from({ length: 31 }, (_, index) => {
      const date = addDays(start, index);
      const key = isoDay(date);
      return { date: key, received: dailyTotals.get(key) ?? 0 };
    });

    return {
      totalReceivedBaseUnits: totalBaseUnits.toString(),
      totalReceivedCount: payments.length,
      monthToDateBaseUnits: monthBaseUnits.toString(),
      monthToDateCount: monthPayments.length,
      monthLabel,
      pendingAmountBaseUnits: pendingBaseUnits.toString(),
      pendingClaims: pendingPayments.length,
      labelsAndInvoicesCount: labelKeys.size,
      dailyFlow,
      rangeStartLabel: start.toLocaleDateString("en", { month: "short", day: "2-digit", timeZone: "UTC" }),
      rangeEndLabel: end.toLocaleDateString("en", { month: "short", day: "2-digit", timeZone: "UTC" }),
      activeLinks: 0,
    };
  }, [payments, settledPaymentIds]);
}
