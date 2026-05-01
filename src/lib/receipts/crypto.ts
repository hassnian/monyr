import { fromBase64, toArrayBuffer, toBase64 } from "@/lib/bytes";

const AES_GCM_IV_LENGTH = 12;

export type ReceiptEncryptionKeyPair = {
  publicKey: string;
  privateKey: string;
};

export type EncryptedReceiptPayload = {
  version: 1;
  algorithm: "P-256-ECDH-A256GCM";
  ephemeralPublicKey: string;
  iv: string;
  ciphertext: string;
};

export async function generateReceiptEncryptionKeyPair(): Promise<ReceiptEncryptionKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );

  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey("raw", keyPair.publicKey),
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  ]);

  return {
    publicKey: toBase64(new Uint8Array(publicKey)),
    privateKey: toBase64(new Uint8Array(privateKey)),
  };
}

export async function encryptReceiptPayload(
  recipientPublicKey: string,
  payload: unknown,
): Promise<EncryptedReceiptPayload> {
  const recipientKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(fromBase64(recipientPublicKey)),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: recipientKey },
    ephemeral.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const ephemeralPublicKey = await crypto.subtle.exportKey("raw", ephemeral.publicKey);

  return {
    version: 1,
    algorithm: "P-256-ECDH-A256GCM",
    ephemeralPublicKey: toBase64(new Uint8Array(ephemeralPublicKey)),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptReceiptPayload<T>(
  recipientPrivateKey: string,
  encryptedPayload: EncryptedReceiptPayload,
): Promise<T> {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(fromBase64(recipientPrivateKey)),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );
  const ephemeralPublicKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(fromBase64(encryptedPayload.ephemeralPublicKey)),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephemeralPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(encryptedPayload.iv) },
    aesKey,
    toArrayBuffer(fromBase64(encryptedPayload.ciphertext)),
  );

  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
