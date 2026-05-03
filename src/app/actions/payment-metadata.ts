"use server";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import { handles, paymentContexts, paymentMetadata } from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";

type RecordPaymentMetadataInput = {
  handle: string;
  utxoCreateSignature: string;
  encryptedPayload: string;
  contextPath?: string | null;
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

  const contextPath = input.contextPath?.trim() || null;
  const [context] = contextPath
    ? await getDb()
        .select({ id: paymentContexts.id })
        .from(paymentContexts)
        .where(
          and(
            eq(paymentContexts.handle_id, recipient.id),
            eq(paymentContexts.path, contextPath),
          ),
        )
        .limit(1)
    : [];

  try {
    await getDb().insert(paymentMetadata).values({
      handle_id: recipient.id,
      context_id: context?.id ?? null,
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
      contextId: paymentMetadata.context_id,
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
