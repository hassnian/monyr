"use server";

import { createHmac, randomBytes, timingSafeEqual, verify } from "node:crypto";
import bs58 from "bs58";
import { clearWalletSession, getWalletSession, setWalletSession } from "@/lib/auth/session";

const CHALLENGE_MAX_AGE_MS = 5 * 60 * 1000;
const DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "monyr.xyz";
const SOLANA_ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

type LoginChallenge = {
  message: string;
};

function getChallengeSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET is not configured");
  }

  return secret;
}

function signChallenge(walletAddress: string, nonce: string, expiresAt: number) {
  return createHmac("sha256", getChallengeSecret())
    .update(`${walletAddress}:${nonce}:${expiresAt}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);

  return aBytes.byteLength === bBytes.byteLength && timingSafeEqual(aBytes, bBytes);
}

function parseLoginMessage(message: string) {
  const fields = new Map<string, string>();

  for (const line of message.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    fields.set(line.slice(0, separatorIndex), line.slice(separatorIndex + 1).trim());
  }

  return {
    domain: fields.get("Domain"),
    walletAddress: fields.get("Wallet"),
    nonce: fields.get("Nonce"),
    issuedAt: fields.get("Issued At"),
    expirationTime: fields.get("Expiration Time"),
    challenge: fields.get("Challenge"),
  };
}

function verifyEd25519Signature({
  message,
  signatureBase64,
  walletAddress,
}: {
  message: string;
  signatureBase64: string;
  walletAddress: string;
}) {
  const publicKeyBytes = bs58.decode(walletAddress);
  if (publicKeyBytes.byteLength !== 32) return false;

  const key = Buffer.concat([SOLANA_ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]);
  const signature = Buffer.from(signatureBase64, "base64");

  if (signature.byteLength !== 64) return false;

  return verify(
    null,
    Buffer.from(message, "utf8"),
    { key, format: "der", type: "spki" },
    signature,
  );
}

export async function createLoginChallenge(walletAddress: string): Promise<LoginChallenge> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_MAX_AGE_MS);
  const nonce = randomBytes(16).toString("base64url");
  const challenge = signChallenge(walletAddress, nonce, expiresAt.getTime());

  return {
    message: [
      "Monyr wants you to sign in with your Solana wallet.",
      "",
      `Domain: ${DOMAIN}`,
      `Wallet: ${walletAddress}`,
      `Nonce: ${nonce}`,
      `Issued At: ${now.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
      `Challenge: ${challenge}`,
      "Purpose: authenticate Monyr server actions",
    ].join("\n"),
  };
}

export async function verifyLoginSignature({
  walletAddress,
  message,
  signature,
}: {
  walletAddress: string;
  message: string;
  signature: string;
}) {
  const parsed = parseLoginMessage(message);
  const expiresAt = parsed.expirationTime ? Date.parse(parsed.expirationTime) : Number.NaN;

  if (
    parsed.domain !== DOMAIN ||
    parsed.walletAddress !== walletAddress ||
    !parsed.nonce ||
    !parsed.challenge ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw new Error("Invalid login challenge");
  }

  const expectedChallenge = signChallenge(walletAddress, parsed.nonce, expiresAt);
  if (!safeEqual(parsed.challenge, expectedChallenge)) {
    throw new Error("Invalid login challenge");
  }

  if (!verifyEd25519Signature({ message, signatureBase64: signature, walletAddress })) {
    throw new Error("Invalid wallet signature");
  }

  await setWalletSession(walletAddress);
  return { walletAddress };
}

export async function getCurrentWalletSession() {
  return getWalletSession();
}

export async function logout() {
  await clearWalletSession();
}
