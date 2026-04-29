import "server-only";

import { createHmac } from "node:crypto";

export function getOwnerWalletLookup(ownerWalletAddress: string) {
  const secret = process.env.OWNER_WALLET_LOOKUP_SECRET;

  if (!secret) {
    throw new Error("OWNER_WALLET_LOOKUP_SECRET is not configured");
  }

  return createHmac("sha256", secret)
    .update(ownerWalletAddress)
    .digest("base64url");
}
