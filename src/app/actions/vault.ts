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

async function sendSol(to: string, amountLamports: bigint) {
  const secretKey = bs58.decode(process.env.SOLANA_SECRET_KEY_BASE58!);
  const signer = await createKeyPairSignerFromBytes(secretKey);

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

export async function sponsorVault(vaultAddress: string) {
  // const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);

  // const rentExemptMinimum  = await rpc.getMinimumBalanceForRentExemption(0n).send();

  const VAULT_SPONSOR_LAMPORTS = 50_000_000n; // 0.05 SOL

  // const buffer = 10_000n;

  return sendSol(vaultAddress, VAULT_SPONSOR_LAMPORTS);
}
