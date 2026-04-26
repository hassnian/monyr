"use server";

import { db } from "@/db/drizzle";
import { handles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function addHandle({
  handle,
  vaultPubkey,
  encryptedVaultSecret,
  bio,
  displayName
}: {
    handle: string,
    vaultPubkey: string,
    encryptedVaultSecret: string,
    bio?: string
    displayName?: string
}) {
  try {
    await db.insert(handles).values({
      handle,
      vault_pubkey: vaultPubkey,
      encrypted_vault_secret: encryptedVaultSecret,
      bio,
      display_name: displayName
    })

    return true
  } catch {
    return null
  }
}

export async function hadnleExists(handle: string) {
  return Boolean((await db.select().from(handles).where(eq(handles.handle, handle))).length)
}


export async function getHandle(handle: string) {
  try {
    const values = await db.select({
      handle: handles.handle,
      displayName: handles.display_name,
      vaultPubkey: handles.vault_pubkey,
      bio: handles.bio,
    }).from(handles)
      .where(eq(handles.handle, handle))
      .limit(1)

    return values[0]
  } catch {
    return null
  }
}
