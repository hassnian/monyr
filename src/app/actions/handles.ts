"use server";

import { createHmac } from "node:crypto";
import { getDb } from "@/db/drizzle";
import { handles, umbraStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UmbraStatus = (typeof umbraStatusEnum.enumValues)[number];

function assertUmbraStatus(status: string): asserts status is UmbraStatus {
  if (!umbraStatusEnum.enumValues.includes(status as UmbraStatus)) {
    throw new Error("Invalid Umbra status");
  }
}

function getOwnerWalletLookup(ownerWalletAddress: string) {
  const secret = process.env.OWNER_WALLET_LOOKUP_SECRET;

  if (!secret) {
    throw new Error("OWNER_WALLET_LOOKUP_SECRET is not configured");
  }

  return createHmac("sha256", secret)
    .update(ownerWalletAddress)
    .digest("base64url");
}

export async function addHandle({
  handle,
  vaultPubkey,
  encryptedVaultSecret,
  ownerWalletAddress,
  bio,
  displayName
}: {
    handle: string,
    vaultPubkey: string,
    encryptedVaultSecret: string,
    ownerWalletAddress: string,
    bio?: string
    displayName?: string
}) {
  try {
    await getDb().insert(handles).values({
      handle,
      vault_pubkey: vaultPubkey,
      encrypted_vault_secret: encryptedVaultSecret,
      owner_wallet_lookup: getOwnerWalletLookup(ownerWalletAddress),
      umbra_status: "inactive",
      bio,
      display_name: displayName
    })

    return true
  } catch {
    return null
  }
}

export async function hadnleExists(handle: string) {
  return Boolean((await getDb().select().from(handles).where(eq(handles.handle, handle))).length)
}


export async function getHandle(handle: string) {
  try {
    const values = await getDb().select({
      handle: handles.handle,
      displayName: handles.display_name,
      vaultPubkey: handles.vault_pubkey,
      umbraStatus: handles.umbra_status,
      bio: handles.bio,
    }).from(handles)
      .where(eq(handles.handle, handle))
      .limit(1)

    return values[0]
  } catch {
    return null
  }
}

export async function getHandlesByOwnerWallet(ownerWalletAddress: string) {
  try {
    console.log('getHandlesByOwnerWallet', ownerWalletAddress)
    return await getDb().select({
      handle: handles.handle,
      displayName: handles.display_name,
      vaultPubkey: handles.vault_pubkey,
      encryptedVaultSecret: handles.encrypted_vault_secret,
      umbraStatus: handles.umbra_status,
      bio: handles.bio,
    }).from(handles)
      .where(eq(handles.owner_wallet_lookup, getOwnerWalletLookup(ownerWalletAddress)))
  } catch {
    return []
  }
}

export async function setUmbraStatus(handle: string, status: UmbraStatus) {
  assertUmbraStatus(status);

  try {
    await getDb().update(handles)
      .set({
        umbra_status: status,
        updated_at: new Date(),
      })
      .where(eq(handles.handle, handle));

    return true;
  } catch {
    return null;
  }
}
