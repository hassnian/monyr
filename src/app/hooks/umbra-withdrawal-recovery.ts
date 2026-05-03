import {
  deriveProofAccountOffsetFromModifiedGenerationIndex,
} from "@umbra-privacy/sdk";
import type { IUmbraClient, IUmbraSigner } from "@umbra-privacy/sdk/interfaces";
import type { U256 } from "@umbra-privacy/sdk/types";
import {
  getAccountOffsetEncoder,
  getCloseStealthPoolDepositInputBufferInstructionAsync,
} from "@umbra-privacy/umbra-codama";
import {
  address as toAddress,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getAddressEncoder,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { sha256 } from "@noble/hashes/sha2.js";
import { kmac256 } from "@noble/hashes/sha3-addons.js";

import { solanaPaymentConfig } from "@/lib/payments/solana-config";

export const MIN_VAULT_SOL_FOR_UTXO_RETRY_LAMPORTS = 5_000_000n;

const WITHDRAWAL_GENERATION_LIST_KEY = "hush:umbra-withdraw-generations";
const DOMAIN_MODIFIED_GEN_INDEX =
  "EncryptedBalanceToSelfClaimableUtxoCreatorFunction / modifiedGenerationIndex";
const STEALTH_POOL_DEPOSIT_INPUT_BUFFER_SEED = sha256(
  new TextEncoder().encode("StealthPoolDepositInputBuffer"),
);

type StoredWithdrawalGeneration = {
  storageKey: string;
  signerAddress: string;
  destinationAddress: string;
  amountBaseUnits: string;
  generationIndex: string;
};

export type UmbraStaleProofReclaim = {
  address: string;
  offset: string;
  signature: string;
};

export function getWithdrawalGenerationStorageKey({
  signerAddress,
  destinationAddress,
  amountBaseUnits,
}: {
  signerAddress: string;
  destinationAddress: string;
  amountBaseUnits: bigint;
}) {
  return `hush:umbra-withdraw-generation:${signerAddress}:${destinationAddress}:${amountBaseUnits.toString()}`;
}

function readStoredWithdrawalGenerations() {
  if (typeof window === "undefined") return [] as StoredWithdrawalGeneration[];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(WITHDRAWAL_GENERATION_LIST_KEY) ?? "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredWithdrawalGeneration =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as StoredWithdrawalGeneration).storageKey === "string" &&
        typeof (item as StoredWithdrawalGeneration).signerAddress === "string" &&
        typeof (item as StoredWithdrawalGeneration).destinationAddress === "string" &&
        typeof (item as StoredWithdrawalGeneration).amountBaseUnits === "string" &&
        typeof (item as StoredWithdrawalGeneration).generationIndex === "string",
    );
  } catch {
    return [];
  }
}

function writeStoredWithdrawalGenerations(records: StoredWithdrawalGeneration[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WITHDRAWAL_GENERATION_LIST_KEY,
    JSON.stringify(records),
  );
}

function rememberWithdrawalGeneration(record: StoredWithdrawalGeneration) {
  const records = readStoredWithdrawalGenerations().filter(
    (item) => item.storageKey !== record.storageKey,
  );
  records.push(record);
  writeStoredWithdrawalGenerations(records);
}

function generateU256() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let value = 0n;
  for (let index = 0; index < bytes.length; index++) {
    value |= BigInt(bytes[index] ?? 0) << BigInt(index * 8);
  }
  return value as U256;
}

export function hasPendingWithdrawalGeneration(storageKey: string) {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(storageKey) !== null
  );
}

export function getOrCreateWithdrawalGenerationIndex({
  storageKey,
  signerAddress,
  destinationAddress,
  amountBaseUnits,
}: {
  storageKey: string;
  signerAddress: string;
  destinationAddress: string;
  amountBaseUnits: bigint;
}) {
  if (typeof window === "undefined") return generateU256();

  const stored = window.localStorage.getItem(storageKey);
  if (stored) return BigInt(stored) as U256;

  const generationIndex = generateU256();
  window.localStorage.setItem(storageKey, generationIndex.toString());
  rememberWithdrawalGeneration({
    storageKey,
    signerAddress,
    destinationAddress,
    amountBaseUnits: amountBaseUnits.toString(),
    generationIndex: generationIndex.toString(),
  });
  return generationIndex;
}

export function clearWithdrawalGenerationIndex(storageKey: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
  writeStoredWithdrawalGenerations(
    readStoredWithdrawalGenerations().filter((item) => item.storageKey !== storageKey),
  );
}

async function deriveWithdrawalProofAccount({
  client,
  signerAddress,
  generationIndex,
}: {
  client: IUmbraClient;
  signerAddress: string;
  generationIndex: bigint;
}) {
  const masterSeed = await client.masterSeed.getMasterSeed();
  const modifiedGenerationIndex = kmac256(
    new TextEncoder().encode(DOMAIN_MODIFIED_GEN_INDEX),
    masterSeed,
    {
      dkLen: 16,
      personalization: new TextEncoder().encode(generationIndex.toString()),
    },
  );
  const proofAccountOffsetBytes = deriveProofAccountOffsetFromModifiedGenerationIndex(
    modifiedGenerationIndex,
  );
  let proofAccountOffset = 0n;
  for (let index = 0; index < 16; index++) {
    proofAccountOffset |= BigInt(proofAccountOffsetBytes[index] ?? 0) << BigInt(index * 8);
  }

  const [proofAccountAddress] = await getProgramDerivedAddress({
    programAddress: client.networkConfig.programId,
    seeds: [
      STEALTH_POOL_DEPOSIT_INPUT_BUFFER_SEED,
      getAddressEncoder().encode(toAddress(signerAddress)),
      getAccountOffsetEncoder().encode({ first: proofAccountOffset }),
    ],
  });

  return { proofAccountAddress, proofAccountOffset };
}

export async function reclaimStaleUmbraWithdrawalProofAccounts({
  signer,
  client,
}: {
  signer: IUmbraSigner;
  client: IUmbraClient;
}) {
  const reclaimed: UmbraStaleProofReclaim[] = [];
  const pendingGenerations = readStoredWithdrawalGenerations().filter(
    (record) => record.signerAddress === signer.address,
  );

  for (const pendingGeneration of pendingGenerations) {
    const { proofAccountAddress, proofAccountOffset } =
      await deriveWithdrawalProofAccount({
        client,
        signerAddress: signer.address,
        generationIndex: BigInt(pendingGeneration.generationIndex),
      });
    const accountMap = await client.accountInfoProvider([proofAccountAddress], {
      commitment: "confirmed",
    });
    const accountInfo = accountMap.get(proofAccountAddress);

    if (accountInfo?.exists !== true) {
      continue;
    }

    console.info("[Umbra] Reclaiming stale proof account", {
      account: proofAccountAddress,
      offset: proofAccountOffset.toString(),
      amountBaseUnits: pendingGeneration.amountBaseUnits,
      destinationAddress: pendingGeneration.destinationAddress,
      generationIndex: pendingGeneration.generationIndex,
      lamports: accountInfo.lamports?.toString(),
    });

    const closeInstruction =
      await getCloseStealthPoolDepositInputBufferInstructionAsync(
        {
          depositor: createNoopSigner(signer.address),
          offset: { first: proofAccountOffset },
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
      address: proofAccountAddress,
      offset: proofAccountOffset.toString(),
      signature,
    });
    clearWithdrawalGenerationIndex(pendingGeneration.storageKey);
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
