"use server";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/drizzle";
import { handles, paymentContexts, productPurchases } from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { getWalletSession, requireWalletSession } from "@/lib/auth/session";

type ProductPurchaseInput = {
  handle: string;
  path: string;
};

type RecordProductPurchaseInput = ProductPurchaseInput & {
  paymentSignature: string;
};

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function normalizePath(path: string) {
  return path.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

function getDownloadUrl(config: Record<string, unknown>) {
  const value = config.downloadUrl;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function getProductContext(input: ProductPurchaseInput) {
  const handle = normalizeHandle(input.handle);
  const path = normalizePath(input.path);

  if (!handle || !path.startsWith("product/")) return null;

  const [context] = await getDb()
    .select({
      id: paymentContexts.id,
      config: paymentContexts.config,
    })
    .from(paymentContexts)
    .innerJoin(handles, eq(paymentContexts.handle_id, handles.id))
    .where(
      and(
        eq(handles.handle, handle),
        eq(paymentContexts.kind, "product"),
        eq(paymentContexts.path, path),
        eq(paymentContexts.status, "active"),
      ),
    )
    .limit(1);

  return context ?? null;
}

export async function getMyProductPurchase(input: ProductPurchaseInput) {
  const session = await getWalletSession();
  if (!session) return { purchased: false, downloadUrl: null };

  const context = await getProductContext(input);
  if (!context) return { purchased: false, downloadUrl: null };

  const [purchase] = await getDb()
    .select({ id: productPurchases.id })
    .from(productPurchases)
    .where(
      and(
        eq(productPurchases.product_context_id, context.id),
        eq(
          productPurchases.buyer_wallet_lookup,
          getOwnerWalletLookup(session.walletAddress),
        ),
      ),
    )
    .limit(1);

  return {
    purchased: Boolean(purchase),
    downloadUrl: purchase ? getDownloadUrl(context.config) : null,
  };
}

export async function recordProductPurchase(input: RecordProductPurchaseInput) {
  const session = await requireWalletSession();
  const paymentSignature = input.paymentSignature.trim();
  if (!paymentSignature) throw new Error("Missing payment signature");

  const context = await getProductContext(input);
  if (!context) throw new Error("Product not found");

  const buyerWalletLookup = getOwnerWalletLookup(session.walletAddress);

  try {
    await getDb().insert(productPurchases).values({
      product_context_id: context.id,
      buyer_wallet_lookup: buyerWalletLookup,
      payment_signature: paymentSignature,
      status: "paid",
    });
  } catch {
    // Unique constraints make recording idempotent for hackathon checkout retries.
  }

  return getMyProductPurchase(input);
}
