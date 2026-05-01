"use server";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import { handles, paymentMetadata } from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";

type RecordPaymentMetadataInput = {
  handle: string;
  utxoCreateSignature: string;
  encryptedPayload: string;
};

export async function recordPaymentMetadata(input: RecordPaymentMetadataInput) {
  await requireWalletSession();

  const utxoCreateSignature = input.utxoCreateSignature.trim();
  const encryptedPayload = input.encryptedPayload.trim();

  if (!utxoCreateSignature) throw new Error("Missing UTXO create signature");
  if (!encryptedPayload) throw new Error("Missing encrypted payment metadata");

  const [recipient] = await getDb()
    .select({ id: handles.id })
    .from(handles)
    .where(eq(handles.handle, input.handle))
    .limit(1);

  if (!recipient) throw new Error("Recipient handle not found");

  try {
    await getDb().insert(paymentMetadata).values({
      handle_id: recipient.id,
      utxo_create_signature: utxoCreateSignature,
      encrypted_payload: encryptedPayload,
      encrypted_payload_version: 1,
    });
  } catch {
    return null;
  }

  return true;
}

export async function getMyPaymentMetadata() {
  const session = await requireWalletSession();

  return getDb()
    .select({
      id: paymentMetadata.id,
      utxoCreateSignature: paymentMetadata.utxo_create_signature,
      encryptedPayload: paymentMetadata.encrypted_payload,
      encryptedPayloadVersion: paymentMetadata.encrypted_payload_version,
      createdAt: paymentMetadata.created_at,
    })
    .from(paymentMetadata)
    .innerJoin(handles, eq(paymentMetadata.handle_id, handles.id))
    .where(
      and(
        eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
      ),
    )
    .orderBy(paymentMetadata.created_at);
}
