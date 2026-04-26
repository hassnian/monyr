import { signMessage } from "@/lib/payments/wallet";
import {
  createSignerFromKeyPair,
} from "@solana/kit";
import { useWallet } from "../contexts/wallet-context";
import { generateKeyPair, getAddressFromPublicKey } from "@solana/kit";

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

const VAULT_KDF_SALT_PREFIX = "monyr-vault-salt";
const VAULT_KDF_INFO_PREFIX = "monyr-vault-key";

function makeUnlockMessage(handle: string, walletAddress: string): string {
  return [
    "Vault Unlock",
    "Version: 1",
    `Handle: ${handle}`,
    `Wallet: ${walletAddress}`,
    "Purpose: decrypt local Monyr receiving wallet",
  ].join("\n");
}

export function useVault() {
  const { connectedWallet } = useWallet();

  async function deriveVaultEncryptionKey(handle: string): Promise<CryptoKey> {
    if (!connectedWallet) throw new Error("No connected wallet");

    const { wallet, account } = connectedWallet;

    const walletAddress = account.address;

    const message = makeUnlockMessage(handle, walletAddress);

    // Wallet popup happens here
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
        info: enc.encode(`${VAULT_KDF_INFO_PREFIX}:${handle}:v1`),
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

  async function createEncryptedVault(handle: string) {
    const vault = await generateKeyPair(true);

    const privateKeyBytes = await crypto.subtle.exportKey(
      "pkcs8",
      vault.privateKey,
    );

    const encryptionKey = await deriveVaultEncryptionKey(handle);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      encryptionKey,
      privateKeyBytes,
    );

    const keyPairSigner = await createSignerFromKeyPair(vault);

    return {
      vaultPubkey: await getAddressFromPublicKey(vault.publicKey),
      encryptedVaultSecret: toBase64(new Uint8Array(ciphertext)),
      keyPairSigner
    };
  }

  return {
    createEncryptedVault,
  };
}
