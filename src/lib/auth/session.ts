import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "monyr_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type WalletSessionPayload = {
  walletAddress: string;
  issuedAt: number;
  expiresAt: number;
};

export type WalletSession = {
  walletAddress: string;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.OWNER_WALLET_LOOKUP_SECRET;

  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET or OWNER_WALLET_LOOKUP_SECRET is not configured");
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);

  return aBytes.byteLength === bBytes.byteLength && timingSafeEqual(aBytes, bBytes);
}

function createSessionToken(payload: WalletSessionPayload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function verifySessionToken(token: string): WalletSessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as WalletSessionPayload;
    if (
      typeof payload.walletAddress !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setWalletSession(walletAddress: string) {
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  const token = createSessionToken({ walletAddress, issuedAt: now, expiresAt });

  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getWalletSession(): Promise<WalletSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  return { walletAddress: payload.walletAddress };
}

export async function requireWalletSession(): Promise<WalletSession> {
  const session = await getWalletSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function clearWalletSession() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
