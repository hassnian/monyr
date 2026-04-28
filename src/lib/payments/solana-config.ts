import { address, type Address } from "@solana/kit";
import type { IdentifierString } from "@wallet-standard/base";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";

const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;

export type SolanaPaymentChain =
  | "solana:mainnet"
  | "solana:mainnet-beta"
  | "solana:devnet"
  | "solana:testnet";

export type SolanaPaymentConfig = {
  chain: IdentifierString;
  rpcUrl: string;
  usdcMint: Address;
  tokenDecimals: number;
};

function normalizeSolanaChain(chain?: string): SolanaPaymentChain {
  switch (chain) {
    case "mainnet":
    case "mainnet-beta":
    case "solana:mainnet":
    case "solana:mainnet-beta":
      return "solana:mainnet";
    case "testnet":
    case "solana:testnet":
      return "solana:testnet";
    case "devnet":
    case "solana:devnet":
    case undefined:
    case "":
      return "solana:devnet";
    default:
      throw new Error(`Unsupported Solana chain: ${chain}`);
  }
}

function defaultRpcUrl(chain: SolanaPaymentChain) {
  return chain === "solana:mainnet" || chain === "solana:mainnet-beta"
    ? MAINNET_RPC_URL
    : DEVNET_RPC_URL;
}

function defaultUsdcMint(chain: SolanaPaymentChain) {
  return chain === "solana:mainnet" || chain === "solana:mainnet-beta"
    ? MAINNET_USDC_MINT
    : DEVNET_USDC_MINT;
}

function tokenDecimals() {
  const decimals = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS;

  if (!decimals) {
    return USDC_DECIMALS;
  }

  const parsedDecimals = Number.parseInt(decimals, 10);

  if (!Number.isInteger(parsedDecimals) || parsedDecimals < 0) {
    throw new Error(`Invalid payment token decimals: ${decimals}`);
  }

  return parsedDecimals;
}

const chain = normalizeSolanaChain(process.env.NEXT_PUBLIC_SOLANA_CHAIN);

export const solanaPaymentConfig: SolanaPaymentConfig = {
  chain,
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? defaultRpcUrl(chain),
  usdcMint: address(process.env.NEXT_PUBLIC_USDC_MINT ?? defaultUsdcMint(chain)),
  tokenDecimals: tokenDecimals(),
};
