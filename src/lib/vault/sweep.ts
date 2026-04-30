import {
  appendTransactionMessageInstruction,
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  address,
  type KeyPairSigner,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

import { getSponsorWalletAddress, getVaultBalance } from "@/app/actions/vault";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { VAULT_SWEEP_BUFFER_LAMPORTS } from "./constants";

const TRANSFER_FEE_BUFFER_LAMPORTS = 10_000n;

export async function sweepExcessVaultSol({
  vaultPubkey,
  keyPairSigner,
}: {
  vaultPubkey: string;
  keyPairSigner: KeyPairSigner;
}) {
  const balance = await getVaultBalance(vaultPubkey);
  const currentLamports = BigInt(balance.lamports);
  const sweepLamports =
    currentLamports - VAULT_SWEEP_BUFFER_LAMPORTS - TRANSFER_FEE_BUFFER_LAMPORTS;

  if (sweepLamports <= 0n) {
    return { signature: null, lamports: "0" };
  }

  const sponsorWalletAddress = await getSponsorWalletAddress();
  const rpc = createSolanaRpc(solanaPaymentConfig.rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(
    process.env.NEXT_PUBLIC_SOLANA_WS_URL!,
  );
  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
  });
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const tx = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(keyPairSigner.address, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) =>
      appendTransactionMessageInstruction(
        getTransferSolInstruction({
          source: keyPairSigner,
          destination: address(sponsorWalletAddress),
          amount: lamports(sweepLamports),
        }),
        tx,
      ),
  );

  const signedTx = await signTransactionMessageWithSigners(tx);

  assertIsSendableTransaction(signedTx);
  assertIsTransactionWithBlockhashLifetime(signedTx);

  await sendAndConfirmTransaction(signedTx, { commitment: "confirmed" });

  return { lamports: sweepLamports.toString() };
}
