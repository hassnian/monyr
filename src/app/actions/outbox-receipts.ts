"use server";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import { handles, outboxReceipts } from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";

type RecordOutboxReceiptInput = {
  ownerHandle: string;
  encryptedPayload: string;
};

export async function recordOutboxReceipt(input: RecordOutboxReceiptInput) {
  const session = await requireWalletSession();
  const ownerHandle = input.ownerHandle.trim().replace(/^@/, "").toLowerCase();
  const encryptedPayload = input.encryptedPayload.trim();

  if (!ownerHandle) throw new Error("Missing owner handle");
  if (!encryptedPayload) throw new Error("Missing encrypted outbox receipt");

  const [owner] = await getDb()
    .select({ id: handles.id })
    .from(handles)
    .where(
      and(
        eq(handles.handle, ownerHandle),
        eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
      ),
    )
    .limit(1);

  if (!owner) {
    throw new Error("Not authorized to write outbox receipt for this handle");
  }

  await getDb().insert(outboxReceipts).values({
    owner_handle_id: owner.id,
    encrypted_payload: encryptedPayload,
    encrypted_payload_version: 1,
  });

  return true;
}

export async function getMyOutboxReceipts() {
  const session = await requireWalletSession();

  const rows = await getDb()
    .select({
      id: outboxReceipts.id,
      encryptedPayload: outboxReceipts.encrypted_payload,
      encryptedPayloadVersion: outboxReceipts.encrypted_payload_version,
      createdAt: outboxReceipts.created_at,
    })
    .from(outboxReceipts)
    .innerJoin(handles, eq(outboxReceipts.owner_handle_id, handles.id))
    .where(eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)))
    .orderBy(desc(outboxReceipts.created_at));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}
