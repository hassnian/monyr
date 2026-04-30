"use server";

import "server-only";
import bs58 from "bs58";
import {
  address,
  appendTransactionMessageInstruction,
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/drizzle";
import { handles } from "@/db/schema";
import { getOwnerWalletLookup } from "@/lib/auth/owner-wallet";
import { requireWalletSession } from "@/lib/auth/session";
import { VAULT_SPONSOR_LAMPORTS } from "@/lib/vault/constants";

async function getSponsorSigner() {
  const secretKey = bs58.decode(process.env.SOLANA_SECRET_KEY_BASE58!);
  return createKeyPairSignerFromBytes(secretKey);
}

export async function getSponsorWalletAddress() {
  const signer = await getSponsorSigner();
  return signer.address;
}

async function sendSol(to: string, amountLamports: bigint) {
  if (amountLamports <= 0n) {
    throw new Error("Transfer amount must be greater than zero");
  }

  const signer = await getSponsorSigner();

  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);
  const rpcSubscriptions = createSolanaRpcSubscriptions(
    process.env.SOLANA_WS_URL!,
  );
  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const tx = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(signer.address, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) =>
      appendTransactionMessageInstruction(
        getTransferSolInstruction({
          source: signer,
          destination: address(to),
          amount: lamports(amountLamports),
        }),
        tx,
      ),
  );

  const signedTx = await signTransactionMessageWithSigners(tx);

  assertIsSendableTransaction(signedTx);
  assertIsTransactionWithBlockhashLifetime(signedTx);

  const signature = getSignatureFromTransaction(signedTx);

  await sendAndConfirmTransaction(signedTx, { commitment: "confirmed" });

  return { signature, lamports: amountLamports.toString() };
}

export async function getVaultBalance(vaultAddress: string) {
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);
  const balance = await rpc.getBalance(address(vaultAddress)).send();

  return { lamports: balance.value.toString() };
}

export async function sponsorVaultForUmbraActivation(vaultAddress: string) {
  const session = await requireWalletSession();

  const ownedVault = await getDb().select({
    id: handles.id,
    umbraStatus: handles.umbra_status,
  })
    .from(handles)
    .where(and(
      eq(handles.vault_pubkey, vaultAddress),
      eq(handles.owner_wallet_lookup, getOwnerWalletLookup(session.walletAddress)),
    ))
    .limit(1);

  const vault = ownedVault[0];

  if (!vault) {
    throw new Error("Unauthorized");
  }

  if (vault.umbraStatus === "active") {
    throw new Error("Vault is already active");
  }

  const balance = await getVaultBalance(vaultAddress);
  const currentLamports = BigInt(balance.lamports);
  const neededLamports = VAULT_SPONSOR_LAMPORTS - currentLamports;

  if (neededLamports <= 0n) {
    return { signature: null, lamports: "0" };
  }

  return sendSol(vaultAddress, neededLamports);
}
