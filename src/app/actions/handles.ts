"use server";

import { getDb } from "@/db/drizzle";
import { handles, umbraStatusEnum } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";

export type UmbraStatus = (typeof umbraStatusEnum.enumValues)[number];

function assertUmbraStatus(status: string): asserts status is UmbraStatus {
  if (!umbraStatusEnum.enumValues.includes(status as UmbraStatus)) {
    throw new Error("Invalid Umbra status");
  }
}

export async function addHandle({
  handle,
  vaultPubkey,
  encryptedVaultSecret,
  receiptEncryptionPublicKey,
  bio,
  displayName
}: {
    handle: string,
    vaultPubkey: string,
    encryptedVaultSecret: string,
    receiptEncryptionPublicKey: string,
    bio?: string
    displayName?: string
}) {
  const session = await requireWalletSession();
  try {
    await getDb().insert(handles).values({
      handle,
      vault_pubkey: vaultPubkey,
      encrypted_vault_secret: encryptedVaultSecret,
      receipt_encryption_pubkey: receiptEncryptionPublicKey,
      owner_wallet_lookup: getOwnerWalletLookup(session.walletAddress),
      umbra_status: "inactive",
      bio,
      display_name: displayName
    })

    return true
  } catch {
    return null
  }
}

export async function handleExists(handle: string) {
  try {
    return Boolean((await getDb().select().from(handles).where(eq(handles.handle, handle))).length)
  } catch (error) {
    console.error("Failed to check handle availability", error);
    return null;
  }
}

export async function getHandle(handle: string) {
  try {
    const values = await getDb().select({
      handle: handles.handle,
      displayName: handles.display_name,
      vaultPubkey: handles.vault_pubkey,
      umbraStatus: handles.umbra_status,
      receiptEncryptionPublicKey: handles.receipt_encryption_pubkey,
      bio: handles.bio,
    }).from(handles)
      .where(eq(handles.handle, handle))
      .limit(1)

    return values[0]
  } catch {
    return null
  }
}

export async function getMyHandles() {
  const session = await requireWalletSession();

  try {
    return await getDb().select({
      handle: handles.handle,
      displayName: handles.display_name,
      vaultPubkey: handles.vault_pubkey,
      encryptedVaultSecret: handles.encrypted_vault_secret,
      receiptEncryptionPublicKey: handles.receipt_encryption_pubkey,
      umbraStatus: handles.umbra_status,
      bio: handles.bio,
    }).from(handles)
      .where(eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)))
  } catch {
    return []
  }
}

export async function setUmbraStatus(handle: string, status: UmbraStatus) {
  const session = await requireWalletSession();
  assertUmbraStatus(status);

  try {
    await getDb().update(handles)
      .set({
        umbra_status: status,
        updated_at: new Date(),
      })
      .where(and(
        eq(handles.handle, handle),
        eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
      ));

    return true;
  } catch {
    return null;
  }
}
