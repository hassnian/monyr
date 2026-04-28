import type { Wallet, WalletAccount } from "@wallet-standard/base";

import {
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";

type SolanaSignMessageWallet = Wallet & {
  features: Wallet["features"] & SolanaSignMessageFeature;
};

export type SolanaSignTransactionWallet = Wallet & {
  features: Wallet["features"] & SolanaSignTransactionFeature;
};

function canSignMessage(
  wallet: Wallet,
  account: WalletAccount,
): wallet is SolanaSignMessageWallet {
  return (
    SolanaSignMessage in wallet.features &&
    account.features.includes(SolanaSignMessage)
  );
}

export function canSignTransaction(
  wallet: Wallet,
  account: WalletAccount,
): wallet is SolanaSignTransactionWallet {
  return (
    SolanaSignTransaction in wallet.features &&
    account.features.includes(SolanaSignTransaction)
  );
}

export async function signMessage({
  wallet,
  account,
  text,
}: {
  wallet: Wallet;
  account: WalletAccount;
  text: string;
}) {
  if (!canSignMessage(wallet, account)) {
    throw new Error("Wallet does not support Solana message signing");
  }

  const message = new TextEncoder().encode(text);

  const [result] = await wallet.features[SolanaSignMessage].signMessage({
    account,
    message,
  });

  return result.signature;
}
