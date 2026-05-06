import type { IUmbraClient, IUmbraSigner } from "@umbra-privacy/sdk/interfaces";
import type { U256 } from "@umbra-privacy/sdk/types";
import {
  getCloseStealthPoolDepositInputBufferInstructionAsync,
  getCreateStealthPoolDepositInputBufferInstructionDataDecoder,
} from "@umbra-privacy/umbra-codama";
import {
  address as toAddress,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import bs58 from "bs58";

import { solanaPaymentConfig } from "@/lib/payments/solana-config";

export const MIN_VAULT_SOL_FOR_UTXO_RETRY_LAMPORTS = 25_000_000n;

const HISTORY_SCAN_PAGE_SIZE = 100;
// Bounded history search for stale proof accounts. The stale rent is recoverable
// from the create-proof transaction itself, so this intentionally avoids local
// storage state that can be lost across browsers/sessions.
const HISTORY_SCAN_MAX_SIGNATURES = 1_000;

type RpcInstruction = {
  accounts?: unknown;
  data?: unknown;
  programIdIndex?: unknown;
};

type RpcTransaction = {
  transaction?: {
    message?: {
      accountKeys?: unknown;
      instructions?: unknown;
    };
  };
};

type RpcSignatureInfo = {
  signature?: unknown;
};

type StaleProofCandidate = {
  address: string;
  offset: bigint;
  createSignature: string;
};

export type UmbraStaleProofReclaim = {
  address: string;
  offset: string;
  signature: string;
};

export function generateWithdrawalGenerationIndex() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let value = 0n;
  for (let index = 0; index < bytes.length; index++) {
    value |= BigInt(bytes[index] ?? 0) << BigInt(index * 8);
  }
  return value as U256;
}

async function rpcRequest<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(solanaPaymentConfig.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `hush-${method}`,
      method,
      params,
    }),
  });
  const payload = (await response.json()) as { result?: T; error?: unknown };

  if (payload.error || !("result" in payload)) {
    throw new Error(`RPC ${method} failed`);
  }

  return payload.result as T;
}

function normalizeAccountKey(key: unknown) {
  if (typeof key === "string") return key;
  if (key && typeof key === "object" && "pubkey" in key) {
    const pubkey = (key as { pubkey?: unknown }).pubkey;
    if (typeof pubkey === "string") return pubkey;
  }
  return null;
}

async function getRecentVaultSignatures(signerAddress: string) {
  const signatures: string[] = [];
  let before: string | undefined;

  while (signatures.length < HISTORY_SCAN_MAX_SIGNATURES) {
    const page = await rpcRequest<RpcSignatureInfo[]>("getSignaturesForAddress", [
      signerAddress,
      {
        limit: Math.min(
          HISTORY_SCAN_PAGE_SIZE,
          HISTORY_SCAN_MAX_SIGNATURES - signatures.length,
        ),
        ...(before ? { before } : {}),
      },
    ]);

    const pageSignatures = page
      .map((item) => item.signature)
      .filter((signature): signature is string => typeof signature === "string");

    signatures.push(...pageSignatures);
    if (pageSignatures.length < HISTORY_SCAN_PAGE_SIZE) break;
    before = pageSignatures.at(-1);
  }

  return signatures;
}

async function getTransaction(signature: string) {
  return rpcRequest<RpcTransaction | null>("getTransaction", [
    signature,
    {
      encoding: "json",
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    },
  ]);
}

async function discoverStaleProofCandidatesFromHistory({
  signerAddress,
  programId,
}: {
  signerAddress: string;
  programId: string;
}) {
  const candidates = new Map<string, StaleProofCandidate>();
  const signatures = await getRecentVaultSignatures(signerAddress);
  const decoder = getCreateStealthPoolDepositInputBufferInstructionDataDecoder();

  // `CreateStealthPoolDepositInputBuffer` includes both pieces needed to close
  // the account later: account[2] is the proof PDA, and instruction data carries
  // the U128 offset. If a later close/queue succeeded, the account existence
  // check below filters it out; this scan only produces candidates.

  for (const signature of signatures) {
    let transaction: RpcTransaction | null;
    try {
      transaction = await getTransaction(signature);
    } catch {
      continue;
    }

    const message = transaction?.transaction?.message;
    if (!message || !Array.isArray(message.accountKeys) || !Array.isArray(message.instructions)) {
      continue;
    }

    const accountKeys = message.accountKeys.map(normalizeAccountKey);

    for (const instruction of message.instructions as RpcInstruction[]) {
      if (
        !Array.isArray(instruction.accounts) ||
        typeof instruction.data !== "string" ||
        typeof instruction.programIdIndex !== "number"
      ) {
        continue;
      }

      const instructionProgramId = accountKeys[instruction.programIdIndex];
      if (instructionProgramId !== programId) continue;

      let decoded: ReturnType<typeof decoder.decode>;
      try {
        decoded = decoder.decode(bs58.decode(instruction.data));
      } catch {
        continue;
      }

      const depositorIndex = instruction.accounts[0];
      const proofAccountIndex = instruction.accounts[2];
      if (typeof depositorIndex !== "number" || typeof proofAccountIndex !== "number") {
        continue;
      }

      const depositor = accountKeys[depositorIndex];
      const proofAccount = accountKeys[proofAccountIndex];
      if (depositor !== signerAddress || !proofAccount) continue;

      candidates.set(proofAccount, {
        address: proofAccount,
        offset: decoded.offset.first,
        createSignature: signature,
      });
    }
  }

  return [...candidates.values()];
}

export async function reclaimStaleUmbraWithdrawalProofAccounts({
  signer,
  client,
}: {
  signer: IUmbraSigner;
  client: IUmbraClient;
}) {
  const reclaimed: UmbraStaleProofReclaim[] = [];
  const candidates = await discoverStaleProofCandidatesFromHistory({
    signerAddress: signer.address,
    programId: client.networkConfig.programId,
  });

  if (candidates.length === 0) {
    return reclaimed;
  }

  const accountMap = await client.accountInfoProvider(
    candidates.map((candidate) => toAddress(candidate.address)),
    { commitment: "confirmed" },
  );

  // Only close accounts that still exist. Successfully completed or already
  // reclaimed attempts show up in history too, but their proof accounts are gone.

  for (const candidate of candidates) {
    const accountInfo = accountMap.get(toAddress(candidate.address));
    if (accountInfo?.exists !== true) continue;

    console.info("[Umbra] Reclaiming stale proof account", {
      account: candidate.address,
      offset: candidate.offset.toString(),
      createSignature: candidate.createSignature,
      lamports: accountInfo.lamports?.toString(),
    });

    const closeInstruction =
      await getCloseStealthPoolDepositInputBufferInstructionAsync(
        {
          depositor: createNoopSigner(signer.address),
          offset: { first: candidate.offset },
        },
        { programAddress: client.networkConfig.programId },
      );
    const latestBlockhash = await client.blockhashProvider();
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (message) => setTransactionMessageFeePayer(signer.address, message),
      (message) =>
        setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
      (message) => appendTransactionMessageInstruction(closeInstruction, message),
    );
    const transaction = compileTransaction(transactionMessage);
    const signed = await signer.signTransaction(transaction);
    const signature = getSignatureFromTransaction(signed);

    await client.transactionForwarder.forwardSequentially([signed]);
    reclaimed.push({
      address: candidate.address,
      offset: candidate.offset.toString(),
      signature,
    });
  }

  if (reclaimed.length > 0) {
    console.info("[Umbra] Stale proof account reclaim completed", reclaimed);
  }

  return reclaimed;
}

export async function getSolBalanceLamports(address: string) {
  const response = await fetch(solanaPaymentConfig.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "hush-get-balance",
      method: "getBalance",
      params: [address, { commitment: "confirmed" }],
    }),
  });
  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== "object" ||
    !("result" in payload) ||
    !payload.result ||
    typeof payload.result !== "object" ||
    !("value" in payload.result) ||
    typeof payload.result.value !== "number"
  ) {
    throw new Error("Could not read vault SOL balance");
  }

  return BigInt(payload.result.value);
}

export function serializeErrorForLog(error: unknown, depth = 0): unknown {
  if (depth > 4) return "[MaxDepth]";
  if (error === null || typeof error !== "object") return error;

  const record = error as Record<string, unknown>;
  const serialized: Record<string, unknown> = {
    name: error instanceof Error ? error.name : record.name,
    message: error instanceof Error ? error.message : record.message,
    stack: error instanceof Error ? error.stack : record.stack,
  };

  for (const key of [
    "stage",
    "cause",
    "context",
    "logs",
    "instructionError",
    "transactionMessage",
    "signature",
    "code",
    "customProgramError",
  ]) {
    if (key in record) {
      serialized[key] = serializeErrorForLog(record[key], depth + 1);
    }
  }

  return serialized;
}
