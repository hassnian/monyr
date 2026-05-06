import { address, type Address } from "@solana/kit";
import type { IdentifierString } from "@wallet-standard/base";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";

const DEVNET_PAYMENT_TOKEN_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const MAINNET_PAYMENT_TOKEN_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEFAULT_PAYMENT_TOKEN_DECIMALS = 6;

const PAYMENT_TOKEN_DEFAULTS = {
  "solana:mainnet": {
    mint: MAINNET_PAYMENT_TOKEN_MINT,
    symbol: "USDC",
    name: "USD Coin",
    decimals: DEFAULT_PAYMENT_TOKEN_DECIMALS,
  },
  "solana:mainnet-beta": {
    mint: MAINNET_PAYMENT_TOKEN_MINT,
    symbol: "USDC",
    name: "USD Coin",
    decimals: DEFAULT_PAYMENT_TOKEN_DECIMALS,
  },
  "solana:devnet": {
    mint: DEVNET_PAYMENT_TOKEN_MINT,
    symbol: "dUSDC",
    name: "Dummy USDC",
    decimals: DEFAULT_PAYMENT_TOKEN_DECIMALS,
  },
  "solana:testnet": {
    mint: DEVNET_PAYMENT_TOKEN_MINT,
    symbol: "dUSDC",
    name: "Dummy USDC",
    decimals: DEFAULT_PAYMENT_TOKEN_DECIMALS,
  },
} satisfies Record<SolanaPaymentChain, {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
}>;

export type SolanaPaymentChain =
  | "solana:mainnet"
  | "solana:mainnet-beta"
  | "solana:devnet"
  | "solana:testnet";

export type SolanaPaymentConfig = {
  chain: IdentifierString;
  rpcUrl: string;
  tokenMint: Address;
  tokenDecimals: number;
  tokenSymbol: string;
  tokenName: string;
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

function tokenDecimals(chain: SolanaPaymentChain) {
  const decimals = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS;

  if (!decimals) {
    return PAYMENT_TOKEN_DEFAULTS[chain].decimals;
  }

  const parsedDecimals = Number.parseInt(decimals, 10);

  if (!Number.isInteger(parsedDecimals) || parsedDecimals < 0) {
    throw new Error(`Invalid payment token decimals: ${decimals}`);
  }

  return parsedDecimals;
}

const chain = normalizeSolanaChain(process.env.NEXT_PUBLIC_SOLANA_CHAIN);
const tokenMint = address(
  process.env.NEXT_PUBLIC_PAYMENT_TOKEN_MINT ?? PAYMENT_TOKEN_DEFAULTS[chain].mint,
);

export const solanaPaymentConfig: SolanaPaymentConfig = {
  chain,
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? defaultRpcUrl(chain),
  tokenMint,
  tokenDecimals: tokenDecimals(chain),
  tokenSymbol: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL ?? PAYMENT_TOKEN_DEFAULTS[chain].symbol,
  tokenName: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_NAME ?? PAYMENT_TOKEN_DEFAULTS[chain].name,
};

export function solscanUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, "https://solscan.io");

  if (solanaPaymentConfig.chain === "solana:devnet") {
    url.searchParams.set("cluster", "devnet");
  }

  if (solanaPaymentConfig.chain === "solana:testnet") {
    url.searchParams.set("cluster", "testnet");
  }

  return url.toString();
}
