import { signMessage } from "@/lib/payments/wallet";
import {
  createKeyPairFromPrivateKeyBytes,
  createSignerFromKeyPair,
  generateKeyPair,
  getAddressFromPublicKey,
} from "@solana/kit";
import bs58 from "bs58";
import { useWallet } from "../contexts/wallet-context";
import { fromBase64, toArrayBuffer, toBase64 } from "@/lib/bytes";
import { generateReceiptEncryptionKeyPair } from "@/lib/receipts/crypto";

const VAULT_KDF_SALT_PREFIX = "monyr-vault-salt";
const VAULT_KDF_INFO_PREFIX = "monyr-vault-key";
const AES_GCM_IV_LENGTH = 12;
const ED25519_PKCS8_HEADER_LENGTH = 16;
const ED25519_PRIVATE_KEY_LENGTH = 32;

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

function getPrivateKeyBytesFromPkcs8(pkcs8: Uint8Array): Uint8Array {
  const privateKeyBytes = pkcs8.slice(ED25519_PKCS8_HEADER_LENGTH);

  if (privateKeyBytes.byteLength !== ED25519_PRIVATE_KEY_LENGTH) {
    throw new Error("Invalid decrypted vault private key");
  }

  return privateKeyBytes;
}

type EncryptedVaultPayloadV2 = {
  version: 2;
  vaultPrivateKeyPkcs8: string;
  receiptEncryptionPrivateKey: string;
  receiptEncryptionPublicKey: string;
};

function makeUnlockMessage(walletAddress: string): string {
  return [
    "Vault Unlock",
    "Version: 1",
    `Wallet: ${walletAddress}`,
    "Purpose: decrypt local Monyr receiving wallet",
  ].join("\n");
}

export function useVault() {
  const { connectedWallet } = useWallet();

  async function deriveVaultEncryptionKey(): Promise<CryptoKey> {
    if (!connectedWallet) throw new Error("No connected wallet");

    const { wallet, account } = connectedWallet;

    const walletAddress = account.address;

    const message = makeUnlockMessage(walletAddress);

    const signature = await signMessage({
      wallet,
      account,
      text: message,
    });

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(signature),
      "HKDF",
      false,
      ["deriveKey"],
    );

    const enc = new TextEncoder();

    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: enc.encode(`${VAULT_KDF_SALT_PREFIX}:${walletAddress}`),
        info: enc.encode(`${VAULT_KDF_INFO_PREFIX}:v1`),
      },
      keyMaterial,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async function encryptBytes(bytes: BufferSource): Promise<string> {
    const encryptionKey = await deriveVaultEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      encryptionKey,
      bytes,
    );

    return toBase64(concatBytes(iv, new Uint8Array(ciphertext)));
  }

  async function decryptBytes(encryptedPayload: string): Promise<ArrayBuffer> {
    const payload = fromBase64(encryptedPayload);

    if (payload.byteLength <= AES_GCM_IV_LENGTH) {
      throw new Error("Encrypted payload is missing its IV");
    }

    const iv = payload.slice(0, AES_GCM_IV_LENGTH);
    const ciphertext = payload.slice(AES_GCM_IV_LENGTH);
    const encryptionKey = await deriveVaultEncryptionKey();

    return crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      encryptionKey,
      toArrayBuffer(ciphertext),
    );
  }

  async function createEncryptedVault() {
    if (!connectedWallet) throw new Error("No connected wallet");

    const walletAddress = connectedWallet.account.address;
    const vault = await generateKeyPair(true);

    const privateKeyBytes = await crypto.subtle.exportKey(
      "pkcs8",
      vault.privateKey,
    );

    const receiptEncryptionKeyPair = await generateReceiptEncryptionKeyPair();
    const encryptedVaultSecret = await encryptBytes(
      new TextEncoder().encode(JSON.stringify({
        version: 2,
        vaultPrivateKeyPkcs8: toBase64(new Uint8Array(privateKeyBytes)),
        receiptEncryptionPrivateKey: receiptEncryptionKeyPair.privateKey,
        receiptEncryptionPublicKey: receiptEncryptionKeyPair.publicKey,
      } satisfies EncryptedVaultPayloadV2)),
    );

    const keyPairSigner = await createSignerFromKeyPair(vault);

    return {
      vaultPubkey: await getAddressFromPublicKey(vault.publicKey),
      encryptedVaultSecret,
      receiptEncryptionPublicKey: receiptEncryptionKeyPair.publicKey,
      receiptEncryptionPrivateKey: receiptEncryptionKeyPair.privateKey,
      ownerWalletAddress: walletAddress,
      keyPairSigner,
    };
  }

  async function decryptEncryptedVault(
    encryptedVaultSecret: string,
    expectedVaultPubkey?: string,
  ) {
    const payload = JSON.parse(
      new TextDecoder().decode(await decryptBytes(encryptedVaultSecret)),
    ) as EncryptedVaultPayloadV2;

    if (
      payload.version !== 2 ||
      !payload.vaultPrivateKeyPkcs8 ||
      !payload.receiptEncryptionPrivateKey ||
      !payload.receiptEncryptionPublicKey
    ) {
      throw new Error("Invalid encrypted vault payload");
    }

    const vault = await createKeyPairFromPrivateKeyBytes(
      getPrivateKeyBytesFromPkcs8(fromBase64(payload.vaultPrivateKeyPkcs8)),
    );
    const keyPairSigner = await createSignerFromKeyPair(vault);
    const vaultPubkey = await getAddressFromPublicKey(vault.publicKey);

    if (expectedVaultPubkey && vaultPubkey !== expectedVaultPubkey) {
      throw new Error("Decrypted vault does not match expected public key");
    }

    return {
      vaultPubkey,
      keyPairSigner,
      receiptEncryptionPrivateKey: payload.receiptEncryptionPrivateKey,
      receiptEncryptionPublicKey: payload.receiptEncryptionPublicKey,
    };
  }

  // Re-runs the wallet-signature decrypt flow purely to extract the raw vault
  // private key for display in the Settings page. Returns the 32-byte private
  // key plus the 64-byte secret key (priv ‖ pub) base58-encoded — the format
  // Phantom/Solflare/Backpack accept on import.
  //
  // The bytes are returned and not cached: callers should hold them only as
  // briefly as they need to render and then drop the reference. We also
  // require a fresh signature each call so the dashboard's long-lived unlock
  // can't be used as a stand-in for "user is intentionally exposing the key
  // right now."
  async function revealVaultSecretBase58(
    encryptedVaultSecret: string,
    expectedVaultPubkey: string,
  ): Promise<{
    secretKeyBase58: string;
    privateKeyBase58: string;
    vaultPubkey: string;
  }> {
    const payload = JSON.parse(
      new TextDecoder().decode(await decryptBytes(encryptedVaultSecret)),
    ) as EncryptedVaultPayloadV2;

    if (payload.version !== 2 || !payload.vaultPrivateKeyPkcs8) {
      throw new Error("Invalid encrypted vault payload");
    }

    const privateKeyBytes = getPrivateKeyBytesFromPkcs8(
      fromBase64(payload.vaultPrivateKeyPkcs8),
    );
    const publicKeyBytes = bs58.decode(expectedVaultPubkey);

    if (publicKeyBytes.byteLength !== 32) {
      throw new Error("Vault pubkey must be 32 bytes");
    }

    const secretKeyBytes = new Uint8Array(64);
    secretKeyBytes.set(privateKeyBytes, 0);
    secretKeyBytes.set(publicKeyBytes, 32);

    return {
      secretKeyBase58: bs58.encode(secretKeyBytes),
      privateKeyBase58: bs58.encode(privateKeyBytes),
      vaultPubkey: expectedVaultPubkey,
    };
  }

  return {
    createEncryptedVault,
    decryptEncryptedVault,
    revealVaultSecretBase58,
  };
}
