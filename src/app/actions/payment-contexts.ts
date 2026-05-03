"use server";

import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import {
  handles,
  paymentContexts,
  paymentContextKindEnum,
  paymentContextStatusEnum,
} from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";

export type PaymentContextKind = (typeof paymentContextKindEnum.enumValues)[number];
export type PaymentContextStatus = (typeof paymentContextStatusEnum.enumValues)[number];

export type PaymentContext = {
  id: string;
  handle: string;
  kind: PaymentContextKind;
  path: string;
  title: string;
  status: PaymentContextStatus;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const PATH_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?(?:\/[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?)*$/;
const RESERVED_ROOT_PATHS = new Set([
  "api",
  "app",
  "c",
  "claim",
  "demo",
  "invoice",
  "privacy-model",
  "product",
  "umbra",
]);

type CreateLabelPaymentContextInput = {
  handle: string;
  title: string;
  path: string;
};

type CreateInvoicePaymentContextInput = {
  handle: string;
  client: string;
  amount: number;
  memo?: string | null;
  expiryDays: 7 | 14 | 30 | 60;
};

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function normalizePath(path: string) {
  return path.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

function randomInvoiceSlug() {
  return randomBytes(4).toString("base64url").toLowerCase().replace(/_/g, "-").slice(0, 6);
}

function invoiceExpiresAt(expiryDays: CreateInvoicePaymentContextInput["expiryDays"]) {
  const allowed = new Set([7, 14, 30, 60]);
  if (!allowed.has(expiryDays)) throw new Error("Invalid invoice expiry");

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + expiryDays);
  return expiresAt.toISOString();
}

function assertValidPath(
  path: string,
  { allowReservedRoot = false }: { allowReservedRoot?: boolean } = {},
) {
  if (!PATH_RE.test(path)) {
    throw new Error("Use lowercase letters, numbers, dashes, and optional nested paths.");
  }

  const [root] = path.split("/");
  if (!root || (!allowReservedRoot && RESERVED_ROOT_PATHS.has(root))) {
    throw new Error("That path is reserved.");
  }
}

function mapPaymentContext(row: {
  id: string;
  handle: string;
  kind: PaymentContextKind;
  path: string;
  title: string;
  status: PaymentContextStatus;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}): PaymentContext {
  return row;
}

export async function createLabelPaymentContext(input: CreateLabelPaymentContextInput) {
  const session = await requireWalletSession();
  const handle = normalizeHandle(input.handle);
  const title = input.title.trim();
  const path = normalizePath(input.path);

  if (!title) throw new Error("Missing label name");
  if (!path) throw new Error("Missing label path");
  assertValidPath(path);

  const [ownerHandle] = await getDb()
    .select({ id: handles.id, handle: handles.handle })
    .from(handles)
    .where(
      and(
        eq(handles.handle, handle),
        eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
      ),
    )
    .limit(1);

  if (!ownerHandle) throw new Error("Handle not found");

  const [context] = await getDb()
    .insert(paymentContexts)
    .values({
      handle_id: ownerHandle.id,
      kind: "label",
      path,
      title,
      status: "active",
      config: {},
    })
    .returning({
      id: paymentContexts.id,
      kind: paymentContexts.kind,
      path: paymentContexts.path,
      title: paymentContexts.title,
      status: paymentContexts.status,
      config: paymentContexts.config,
      createdAt: paymentContexts.created_at,
      updatedAt: paymentContexts.updated_at,
    });

  return {
    ...context,
    handle: ownerHandle.handle,
  } satisfies PaymentContext;
}

export async function createInvoicePaymentContext(input: CreateInvoicePaymentContextInput) {
  const session = await requireWalletSession();
  const handle = normalizeHandle(input.handle);
  const client = input.client.trim();
  const memo = input.memo?.trim() || null;
  const expiresAt = invoiceExpiresAt(input.expiryDays);

  if (!client) throw new Error("Missing client name");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Missing invoice amount");
  }

  const [ownerHandle] = await getDb()
    .select({ id: handles.id, handle: handles.handle })
    .from(handles)
    .where(
      and(
        eq(handles.handle, handle),
        eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
      ),
    )
    .limit(1);

  if (!ownerHandle) throw new Error("Handle not found");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const path = `invoice/${randomInvoiceSlug()}`;
    assertValidPath(path, { allowReservedRoot: true });

    try {
      const [context] = await getDb()
        .insert(paymentContexts)
        .values({
          handle_id: ownerHandle.id,
          kind: "invoice",
          path,
          title: client,
          status: "active",
          config: {
            amount: input.amount,
            memo,
            expiresAt,
          },
        })
        .returning({
          id: paymentContexts.id,
          kind: paymentContexts.kind,
          path: paymentContexts.path,
          title: paymentContexts.title,
          status: paymentContexts.status,
          config: paymentContexts.config,
          createdAt: paymentContexts.created_at,
          updatedAt: paymentContexts.updated_at,
        });

      return {
        ...context,
        handle: ownerHandle.handle,
      } satisfies PaymentContext;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  throw new Error("Failed to create invoice");
}

export async function getMyPaymentContexts(kind?: PaymentContextKind) {
  const session = await requireWalletSession();

  const rows = await getDb()
    .select({
      id: paymentContexts.id,
      handle: handles.handle,
      kind: paymentContexts.kind,
      path: paymentContexts.path,
      title: paymentContexts.title,
      status: paymentContexts.status,
      config: paymentContexts.config,
      createdAt: paymentContexts.created_at,
      updatedAt: paymentContexts.updated_at,
    })
    .from(paymentContexts)
    .innerJoin(handles, eq(paymentContexts.handle_id, handles.id))
    .where(
      kind
        ? and(
            eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
            eq(paymentContexts.kind, kind),
          )
        : eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
    )
    .orderBy(asc(paymentContexts.created_at));

  return rows.map(mapPaymentContext);
}

export async function getPublicPaymentContext({
  handle,
  path,
}: {
  handle: string;
  path: string;
}) {
  const normalizedHandle = normalizeHandle(handle);
  const normalizedPath = normalizePath(path);

  if (!normalizedHandle || !normalizedPath) return null;

  const [context] = await getDb()
    .select({
      id: paymentContexts.id,
      handle: handles.handle,
      kind: paymentContexts.kind,
      path: paymentContexts.path,
      title: paymentContexts.title,
      status: paymentContexts.status,
      config: paymentContexts.config,
      createdAt: paymentContexts.created_at,
      updatedAt: paymentContexts.updated_at,
    })
    .from(paymentContexts)
    .innerJoin(handles, eq(paymentContexts.handle_id, handles.id))
    .where(
      and(
        eq(handles.handle, normalizedHandle),
        eq(paymentContexts.path, normalizedPath),
        eq(paymentContexts.status, "active"),
      ),
    )
    .limit(1);

  return context ? mapPaymentContext(context) : null;
}
