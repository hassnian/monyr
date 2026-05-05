"use client";

import { useMemo } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQuery } from "@tanstack/react-query";

import {
  getMyClaimableUtxos,
  syncScannedClaimableUtxos,
} from "@/app/actions/claimable-utxos";
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

export type ClaimPayload = {
  version: 1;
  amountBaseUnits: string;
  tokenDecimals: number;
  mint: string;
  treeIndex: string;
  insertionIndex: string;
  claimedAt: string;
};

export type PendingInboxPayment = Payment & {
  source: "scan";
  utxo: UmbraClaimableUtxo;
};

export type ClaimedInboxPayment = Payment & {
  source: "claim_receipt";
  utxo?: never;
};

export type InboxPayment = PendingInboxPayment | ClaimedInboxPayment;

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

function toSafeNumber(value: string | number | bigint) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error("UTXO index exceeds safe integer range");
  return number;
}

function getPaymentSubLabel(metadata: PaymentMetadataPayload | null) {
  if (metadata?.invoiceId) return `Invoice ${metadata.invoiceId}`;
  if (metadata?.subPath?.startsWith("invoice/")) {
    return `Invoice ${metadata.subPath.slice("invoice/".length)}`;
  }
  return null;
}

type RawInboxPayment = {
  treeIndex: number;
  insertionIndex: number;
  amountBaseUnits: string;
  status: Payment["status"];
  fallbackCreatedAt: string;
  txSigFallback: string;
} & (
  | { source: "scan"; utxo: UmbraClaimableUtxo }
  | { source: "claim_receipt" }
);

export function useInboxPayments() {
  const { user, unlockedVault } = useAuth();
  const { scanRecentClaimableUtxos } = useUmbra();
  const { isActive, isUnlocked } = useUnlockDashboard();

  return useQuery<InboxPayment[]>({
    enabled: isActive && isUnlocked && Boolean(unlockedVault),
    queryKey: ["inbox", "claimable", user?.handle, unlockedVault?.vaultPubkey],
    queryFn: async () => {
      if (!isActive || !unlockedVault) return [];
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
      const scannedClaimable = [...result.received, ...result.publicReceived];
      const claimableRecords = user?.handle
        ? await syncScannedClaimableUtxos({
            handle: user.handle,
            utxos: scannedClaimable.map((utxo) => ({
              treeIndex: toSafeNumber(utxo.treeIndex),
              insertionIndex: toSafeNumber(utxo.insertionIndex),
            })),
          }).catch((error) => {
              console.error("Failed to sync scanned claimable UTXOs", error);
            return getMyClaimableUtxos(user.handle).catch(() => []);
          })
        : [];
      const statusByIndex = new Map(
        claimableRecords
          .filter((record) => record.treeIndex !== null && record.insertionIndex !== null)
          .map((record) => [`${record.treeIndex}:${record.insertionIndex}`, record.status]),
      );
      const rawPendingPayments: RawInboxPayment[] = scannedClaimable
        .filter(
          (utxo) =>
            statusByIndex.get(`${utxo.treeIndex}:${utxo.insertionIndex}`) !==
            "claimed",
        )
        .map((utxo) => {
          const treeIndex = toSafeNumber(utxo.treeIndex);
          const insertionIndex = toSafeNumber(utxo.insertionIndex);
          const status = statusByIndex.get(`${treeIndex}:${insertionIndex}`);

          return {
            treeIndex,
            insertionIndex,
            amountBaseUnits: utxo.amount.toString(),
            status: status === "claiming" ? "claiming" : "pending",
            fallbackCreatedAt: new Date().toISOString(),
            txSigFallback: `${treeIndex}:${insertionIndex}`,
            source: "scan",
            utxo,
          } satisfies RawInboxPayment;
        });

      const rawClaimedPayments = await Promise.all(
        claimableRecords
          .filter(
            (record) =>
              record.status === "claimed" &&
              record.treeIndex !== null &&
              record.insertionIndex !== null &&
              Boolean(record.encryptedClaimPayload),
          )
          .map(async (record) => {
            const payload = await decryptReceiptPayload<ClaimPayload>(
              unlockedVault.receiptEncryptionPrivateKey,
              JSON.parse(record.encryptedClaimPayload!) as EncryptedReceiptPayload,
            ).catch(() => null);

            if (!payload || record.treeIndex === null || record.insertionIndex === null) {
              return null;
            }

            return {
              treeIndex: record.treeIndex,
              insertionIndex: record.insertionIndex,
              amountBaseUnits: payload.amountBaseUnits,
              status: "claimed",
              fallbackCreatedAt: record.claimedAt?.toISOString() ?? payload.claimedAt,
              txSigFallback: `${record.treeIndex}:${record.insertionIndex}`,
              source: "claim_receipt",
            } satisfies RawInboxPayment;
          }),
      );

      const rawPayments = [...rawPendingPayments, ...rawClaimedPayments]
        .filter((payment): payment is RawInboxPayment => payment !== null)
        .sort((a, b) =>
          a.treeIndex === b.treeIndex
            ? a.insertionIndex - b.insertionIndex
            : a.treeIndex - b.treeIndex,
        );

      return rawPayments.map((payment) => {
        const metadata = takeMatchingMetadata(metadataByAmount, payment.amountBaseUnits);
        const common = {
          id: `${payment.treeIndex}:${payment.insertionIndex}`,
          amount: toTokenAmount(payment.amountBaseUnits),
          amountBaseUnits: payment.amountBaseUnits,
          memo: metadata?.memo?.trim() || null,
          payerLabel: null,
          payerPubkey: null,
          subPath: metadata?.subPath ?? null,
          subLabel: getPaymentSubLabel(metadata),
          createdAt: metadata?.createdAt ?? payment.fallbackCreatedAt,
          status: payment.status,
          txSig: metadata?.utxoCreateSignature?.slice(0, 8) ?? payment.txSigFallback,
        } satisfies Payment;

        return payment.source === "scan"
          ? ({ ...common, source: "scan", utxo: payment.utxo } satisfies PendingInboxPayment)
          : ({ ...common, source: "claim_receipt" } satisfies ClaimedInboxPayment);
      });
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useInboxSummary(payments: readonly Payment[]) {
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
      (payment) => payment.status === "pending" || payment.status === "claiming",
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
  }, [payments]);
}
