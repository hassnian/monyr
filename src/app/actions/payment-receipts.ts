"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import { handles, paymentReceipts, paymentRailEnum } from "@/db/schema";
import { requireWalletSession } from "@/lib/auth/session";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";

type PaymentRail = (typeof paymentRailEnum.enumValues)[number];

type RecordPaymentReceiptInput = {
  handle: string;
  rail: PaymentRail;
  receiptSignature: string;
  queueSignature?: string;
  callbackSignature?: string;
  callbackStatus?: string;
  callbackElapsedMs?: number;
  rentClaimSignature?: string;
};

function assertPaymentRail(rail: string): asserts rail is PaymentRail {
  if (!paymentRailEnum.enumValues.includes(rail as PaymentRail)) {
    throw new Error("Invalid payment rail");
  }
}

function normalizeOptionalSignature(signature?: string) {
  return signature?.trim() || null;
}

export async function recordPaymentReceipt(input: RecordPaymentReceiptInput) {
  await requireWalletSession();
  assertPaymentRail(input.rail);

  const receiptSignature = input.receiptSignature.trim();
  if (!receiptSignature) {
    throw new Error("Missing receipt signature");
  }

  const [recipient] = await getDb()
    .select({ id: handles.id })
    .from(handles)
    .where(eq(handles.handle, input.handle))
    .limit(1);

  if (!recipient) {
    throw new Error("Recipient handle not found");
  }

  try {
    await getDb().insert(paymentReceipts).values({
      handle_id: recipient.id,
      rail: input.rail,
      mint: solanaPaymentConfig.usdcMint,
      receipt_signature: receiptSignature,
      queue_signature: normalizeOptionalSignature(input.queueSignature),
      callback_signature: normalizeOptionalSignature(input.callbackSignature),
      callback_status: input.callbackStatus?.trim() || null,
      callback_elapsed_ms: input.callbackElapsedMs ?? null,
      rent_claim_signature: normalizeOptionalSignature(input.rentClaimSignature),
    });
  } catch {
    return null;
  }

  return true;
}
