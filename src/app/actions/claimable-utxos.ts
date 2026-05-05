"use server";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import { claimableUtxos, claimableUtxoStatusEnum, handles } from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";

export type ClaimableUtxoStatus = (typeof claimableUtxoStatusEnum.enumValues)[number];

export type ClaimableUtxoRecord = {
  id: string;
  handle: string;
  treeIndex: number | null;
  insertionIndex: number | null;
  status: ClaimableUtxoStatus;
  encryptedClaimPayload: string | null;
  encryptedClaimPayloadVersion: number | null;
  claimedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type UtxoIndexInput = {
  treeIndex: number;
  insertionIndex: number;
};

type MarkClaimableUtxosClaimedInput = {
  claims: (UtxoIndexInput & { encryptedClaimPayload: string })[];
};

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function mapClaimableUtxo(row: {
  id: string;
  handle: string;
  treeIndex: number | null;
  insertionIndex: number | null;
  status: ClaimableUtxoStatus;
  encryptedClaimPayload: string | null;
  encryptedClaimPayloadVersion: number | null;
  claimedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ClaimableUtxoRecord {
  return row;
}

async function getOwnedHandleId(handle: string) {
  const session = await requireWalletSession();
  const [ownerHandle] = await getDb()
    .select({ id: handles.id, handle: handles.handle })
    .from(handles)
    .where(
      and(
        eq(handles.handle, normalizeHandle(handle)),
        eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
      ),
    )
    .limit(1);

  if (!ownerHandle) throw new Error("Handle not found");
  return ownerHandle;
}

export async function syncScannedClaimableUtxos({
  handle,
  utxos,
}: {
  handle: string;
  utxos: UtxoIndexInput[];
}) {
  const ownerHandle = await getOwnedHandleId(handle);
  const now = new Date();

  for (const utxo of utxos) {
    const [existing] = await getDb()
      .select({ id: claimableUtxos.id })
      .from(claimableUtxos)
      .where(
        and(
          eq(claimableUtxos.owner_handle_id, ownerHandle.id),
          eq(claimableUtxos.tree_index, utxo.treeIndex),
          eq(claimableUtxos.insertion_index, utxo.insertionIndex),
        ),
      )
      .limit(1);

    if (existing) {
      await getDb()
        .update(claimableUtxos)
        .set({ last_seen_at: now, updated_at: now })
        .where(eq(claimableUtxos.id, existing.id));
      continue;
    }

    await getDb().insert(claimableUtxos).values({
      owner_handle_id: ownerHandle.id,
      tree_index: utxo.treeIndex,
      insertion_index: utxo.insertionIndex,
      status: "created",
      last_seen_at: now,
      updated_at: now,
    });
  }

  return getMyClaimableUtxos(handle);
}

async function markMyClaimableUtxosStatus(input: {
  utxos: UtxoIndexInput[];
  status: "created" | "claiming";
}) {
  const session = await requireWalletSession();
  const now = new Date();

  for (const utxo of input.utxos) {
    await getDb()
      .update(claimableUtxos)
      .set({ status: input.status, updated_at: now })
      .from(handles)
      .where(
        and(
          eq(claimableUtxos.owner_handle_id, handles.id),
          eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
          eq(claimableUtxos.tree_index, utxo.treeIndex),
          eq(claimableUtxos.insertion_index, utxo.insertionIndex),
        ),
      );
  }

  return true;
}

export async function markMyClaimableUtxosCreated(input: { utxos: UtxoIndexInput[] }) {
  return markMyClaimableUtxosStatus({ ...input, status: "created" });
}

export async function markMyClaimableUtxosClaiming(input: { utxos: UtxoIndexInput[] }) {
  return markMyClaimableUtxosStatus({ ...input, status: "claiming" });
}

export async function markMyClaimableUtxosClaimed(input: MarkClaimableUtxosClaimedInput) {
  const session = await requireWalletSession();
  const now = new Date();

  for (const claim of input.claims) {
    await getDb()
      .update(claimableUtxos)
      .set({
        status: "claimed",
        encrypted_claim_payload: claim.encryptedClaimPayload,
        encrypted_claim_payload_version: 1,
        claimed_at: now,
        updated_at: now,
      })
      .from(handles)
      .where(
        and(
          eq(claimableUtxos.owner_handle_id, handles.id),
          eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
          eq(claimableUtxos.tree_index, claim.treeIndex),
          eq(claimableUtxos.insertion_index, claim.insertionIndex),
        ),
      );
  }

  return true;
}

export async function getMyClaimableUtxos(handle?: string) {
  const session = await requireWalletSession();
  const conditions = [
    eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
  ];

  if (handle) {
    conditions.push(eq(handles.handle, normalizeHandle(handle)));
  }

  const rows = await getDb()
    .select({
      id: claimableUtxos.id,
      handle: handles.handle,
      treeIndex: claimableUtxos.tree_index,
      insertionIndex: claimableUtxos.insertion_index,
      status: claimableUtxos.status,
      encryptedClaimPayload: claimableUtxos.encrypted_claim_payload,
      encryptedClaimPayloadVersion: claimableUtxos.encrypted_claim_payload_version,
      claimedAt: claimableUtxos.claimed_at,
      lastSeenAt: claimableUtxos.last_seen_at,
      createdAt: claimableUtxos.created_at,
      updatedAt: claimableUtxos.updated_at,
    })
    .from(claimableUtxos)
    .innerJoin(handles, eq(claimableUtxos.owner_handle_id, handles.id))
    .where(and(...conditions))
    .orderBy(desc(claimableUtxos.created_at));

  return rows.map(mapClaimableUtxo);
}
