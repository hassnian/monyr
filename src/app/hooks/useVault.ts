import { signMessage } from "@/lib/payments/wallet";
import {
  createKeyPairFromPrivateKeyBytes,
  createSignerFromKeyPair,
  generateKeyPair,
  getAddressFromPublicKey,
} from "@solana/kit";
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

  return {
    createEncryptedVault,
    decryptEncryptedVault,
  };
}
