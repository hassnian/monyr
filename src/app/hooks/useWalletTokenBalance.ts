"use client";

import { useQuery } from "@tanstack/react-query";
import {
  address,
  createSolanaRpc,
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address,
} from "@solana/kit";

import { useWallet } from "@/app/contexts/wallet-context";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";

const TOKEN_PROGRAM_ADDRESS = address(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

async function findAssociatedTokenAccount(owner: Address, mint: Address) {
  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [
      getAddressEncoder().encode(owner),
      getAddressEncoder().encode(TOKEN_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
    ],
  });
  return ata;
}

export function useWalletTokenBalance() {
  const { connectedWallet } = useWallet();
  const ownerAddress = connectedWallet?.account.address ?? null;

  const query = useQuery({
    enabled: Boolean(ownerAddress),
    queryKey: [
      "wallet-token-balance",
      ownerAddress,
      solanaPaymentConfig.tokenMint,
    ],
    queryFn: async () => {
      if (!ownerAddress) return null;
      const rpc = createSolanaRpc(solanaPaymentConfig.rpcUrl);
      const ata = await findAssociatedTokenAccount(
        address(ownerAddress),
        solanaPaymentConfig.tokenMint,
      );
      try {
        const { value } = await rpc.getTokenAccountBalance(ata).send();
        return value.uiAmount ?? 0;
      } catch (error) {
        // ATA hasn't been created yet — wallet has never received this token.
        const message = error instanceof Error ? error.message : String(error);
        if (/could not find account|AccountNotFound|Invalid param/i.test(message)) {
          return 0;
        }
        throw error;
      }
    },
    staleTime: 15_000,
    retry: false,
  });

  return {
    balance: query.data ?? null,
    isLoading: query.isLoading && Boolean(ownerAddress),
    refetch: query.refetch,
  };
}
