"use server";

import { and, desc, eq, or } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import { claimableUtxos, claimableUtxoStatusEnum, handles } from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";

export type ClaimableUtxoStatus = (typeof claimableUtxoStatusEnum.enumValues)[number];

export type ClaimableUtxoRecord = {
  id: string;
  handle: string;
  createSignature: string | null;
  queueSignature: string | null;
  callbackSignature: string | null;
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

type RecordClaimableUtxoInput = {
  handle: string;
  createSignature?: string | null;
  queueSignature?: string | null;
  callbackSignature?: string | null;
  treeIndex?: number | null;
  insertionIndex?: number | null;
};

type MarkClaimableUtxoClaimedInput =
  | { id: string }
  | { createSignature: string }
  | { queueSignature: string }
  | { callbackSignature: string }
  | { treeIndex: number; insertionIndex: number };

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function normalizeSignature(signature?: string | null) {
  const value = signature?.trim();
  return value || null;
}

function mapClaimableUtxo(row: {
  id: string;
  handle: string;
  createSignature: string | null;
  queueSignature: string | null;
  callbackSignature: string | null;
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

function hasUtxoIndex(input: Pick<RecordClaimableUtxoInput, "treeIndex" | "insertionIndex">) {
  return input.treeIndex !== undefined && input.treeIndex !== null &&
    input.insertionIndex !== undefined && input.insertionIndex !== null;
}

export async function recordClaimableUtxo(input: RecordClaimableUtxoInput) {
  const ownerHandle = await getOwnedHandleId(input.handle);
  const createSignature = normalizeSignature(input.createSignature);
  const queueSignature = normalizeSignature(input.queueSignature);
  const callbackSignature = normalizeSignature(input.callbackSignature);

  if (!createSignature && !queueSignature && !callbackSignature && !hasUtxoIndex(input)) {
    throw new Error("Missing claimable UTXO reference");
  }

  const references = [
    createSignature ? eq(claimableUtxos.create_signature, createSignature) : null,
    queueSignature ? eq(claimableUtxos.queue_signature, queueSignature) : null,
    callbackSignature ? eq(claimableUtxos.callback_signature, callbackSignature) : null,
    hasUtxoIndex(input)
      ? and(
          eq(claimableUtxos.tree_index, input.treeIndex!),
          eq(claimableUtxos.insertion_index, input.insertionIndex!),
        )
      : null,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));

  const existingCondition = references.length === 1 ? references[0] : or(...references);
  const existing = existingCondition
    ? await getDb()
        .select({ id: claimableUtxos.id })
        .from(claimableUtxos)
        .where(
          and(
            eq(claimableUtxos.owner_handle_id, ownerHandle.id),
            existingCondition,
          ),
        )
        .limit(1)
    : [];

  const values = {
    create_signature: createSignature,
    queue_signature: queueSignature,
    callback_signature: callbackSignature,
    tree_index: input.treeIndex ?? null,
    insertion_index: input.insertionIndex ?? null,
    status: "created" as const,
    updated_at: new Date(),
  };

  const [record] = existing[0]
    ? await getDb()
        .update(claimableUtxos)
        .set(values)
        .where(eq(claimableUtxos.id, existing[0].id))
        .returning({
          id: claimableUtxos.id,
          createSignature: claimableUtxos.create_signature,
          queueSignature: claimableUtxos.queue_signature,
          callbackSignature: claimableUtxos.callback_signature,
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
    : await getDb()
        .insert(claimableUtxos)
        .values({
          owner_handle_id: ownerHandle.id,
          ...values,
        })
        .returning({
          id: claimableUtxos.id,
          createSignature: claimableUtxos.create_signature,
          queueSignature: claimableUtxos.queue_signature,
          callbackSignature: claimableUtxos.callback_signature,
          treeIndex: claimableUtxos.tree_index,
          insertionIndex: claimableUtxos.insertion_index,
          status: claimableUtxos.status,
          encryptedClaimPayload: claimableUtxos.encrypted_claim_payload,
          encryptedClaimPayloadVersion: claimableUtxos.encrypted_claim_payload_version,
          claimedAt: claimableUtxos.claimed_at,
          lastSeenAt: claimableUtxos.last_seen_at,
          createdAt: claimableUtxos.created_at,
          updatedAt: claimableUtxos.updated_at,
        });

  return {
    ...record,
    handle: ownerHandle.handle,
  } satisfies ClaimableUtxoRecord;
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
      .select({ id: claimableUtxos.id, status: claimableUtxos.status })
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
      createSignature: claimableUtxos.create_signature,
      queueSignature: claimableUtxos.queue_signature,
      callbackSignature: claimableUtxos.callback_signature,
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

export async function markMyClaimableUtxoClaimed(input: MarkClaimableUtxoClaimedInput) {
  const session = await requireWalletSession();
  const now = new Date();

  const referenceCondition =
    "id" in input
      ? eq(claimableUtxos.id, input.id)
      : "createSignature" in input
        ? eq(claimableUtxos.create_signature, input.createSignature)
        : "queueSignature" in input
          ? eq(claimableUtxos.queue_signature, input.queueSignature)
          : "callbackSignature" in input
            ? eq(claimableUtxos.callback_signature, input.callbackSignature)
            : and(
                eq(claimableUtxos.tree_index, input.treeIndex),
                eq(claimableUtxos.insertion_index, input.insertionIndex),
              );

  const [record] = await getDb()
    .update(claimableUtxos)
    .set({
      status: "claimed",
      claimed_at: now,
      updated_at: now,
    })
    .from(handles)
    .where(
      and(
        eq(claimableUtxos.owner_handle_id, handles.id),
        eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
        referenceCondition,
      ),
    )
    .returning({
      id: claimableUtxos.id,
      handle: handles.handle,
      createSignature: claimableUtxos.create_signature,
      queueSignature: claimableUtxos.queue_signature,
      callbackSignature: claimableUtxos.callback_signature,
      treeIndex: claimableUtxos.tree_index,
      insertionIndex: claimableUtxos.insertion_index,
      status: claimableUtxos.status,
      encryptedClaimPayload: claimableUtxos.encrypted_claim_payload,
      encryptedClaimPayloadVersion: claimableUtxos.encrypted_claim_payload_version,
      claimedAt: claimableUtxos.claimed_at,
      lastSeenAt: claimableUtxos.last_seen_at,
      createdAt: claimableUtxos.created_at,
      updatedAt: claimableUtxos.updated_at,
    });

  return record ? mapClaimableUtxo(record) : null;
}
