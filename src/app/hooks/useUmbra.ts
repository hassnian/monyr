import {
  getUmbraClient,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
  getEncryptedBalanceQuerierFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getClaimableUtxoScannerFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getSelfClaimableUtxoToPublicBalanceClaimerFunction,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import {
  type IUmbraClient,
  type IUmbraSigner,
  type TransactionForwarder,
  type UserRegistrationCallbacks,
} from "@umbra-privacy/sdk/interfaces";
import {
  getCdnZkAssetProvider,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
  getClaimSelfClaimableUtxoIntoPublicBalanceProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getCreateSelfClaimableUtxoFromEncryptedBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";
import { useRef } from "react";
import { useWallet } from "@/app/contexts/wallet-context";
import {
  address as toAddress,
  getSignatureFromTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
} from "@solana/kit";
import {
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import { nativeAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { U32, U64 } from "@umbra-privacy/sdk/types";
import {
  generateWithdrawalGenerationIndex,
  getSolBalanceLamports,
  MIN_VAULT_SOL_FOR_UTXO_RETRY_LAMPORTS,
  reclaimStaleUmbraWithdrawalProofAccounts,
  serializeErrorForLog,
} from "./umbra-withdrawal-recovery";

const isMainnet =
  solanaPaymentConfig.chain === "solana:mainnet" ||
  solanaPaymentConfig.chain === "solana:mainnet-beta";

const UMBRA_CLIENT_CONFIG = {
  network: isMainnet ? "mainnet" : "devnet",
  rpcUrl: solanaPaymentConfig.rpcUrl,
  rpcSubscriptionsUrl:
    process.env.NEXT_PUBLIC_SOLANA_WS_URL ??
    (isMainnet
      ? "wss://api.mainnet-beta.solana.com"
      : "wss://api.devnet.solana.com"),
  indexerApiEndpoint: isMainnet
    ? "https://utxo-indexer.api.umbraprivacy.com"
    : "https://utxo-indexer.api-devnet.umbraprivacy.com",
  relayerApiEndpoint: isMainnet
    ? "https://relayer.api.umbraprivacy.com"
    : "https://relayer.api-devnet.umbraprivacy.com",
  deferMasterSeedSignature: true,
} as const;

type UmbraUserAccount = Awaited<
  ReturnType<ReturnType<typeof getUserAccountQuerierFunction>>
>;

type UmbraClaimableUtxoScanResult = Awaited<
  ReturnType<ReturnType<typeof getClaimableUtxoScannerFunction>>
>;

export type UmbraClaimableUtxo = UmbraClaimableUtxoScanResult["received"][number];
export type UmbraSelfClaimableUtxo = UmbraClaimableUtxoScanResult["selfBurnable"][number];

const MAX_LEAVES_PER_TREE = 2n ** 20n;
const DASHBOARD_SCAN_WINDOW_SIZE = 500n;
const DASHBOARD_SCAN_PAGE_SIZE = 50n;
const WITHDRAWAL_SELF_CLAIMABLE_SCAN_ATTEMPTS = 8;
const WITHDRAWAL_SELF_CLAIMABLE_SCAN_DELAY_MS = 4_000;

function getUmbraZkAssetProvider() {
  return getCdnZkAssetProvider({
    baseUrl: "/api/umbra-zk",
    manifestUrl: "/api/umbra-zk/manifest.json",
  });
}

function formatUmbraUtxoForLog(utxo: UmbraClaimableUtxo | UmbraSelfClaimableUtxo) {
  return {
    amount: utxo.amount.toString(),
    destinationAddress: utxo.destinationAddress,
    treeIndex: utxo.treeIndex.toString(),
    insertionIndex: utxo.insertionIndex.toString(),
    unlockerType: utxo.unlockerType,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getUmbraUtxoId(utxo: UmbraClaimableUtxo | UmbraSelfClaimableUtxo) {
  return `${utxo.treeIndex.toString()}:${utxo.insertionIndex.toString()}`;
}

function errorChainIncludes(error: unknown, text: string) {
  let current: unknown = error;

  while (current && typeof current === "object") {
    if (
      "message" in current &&
      typeof current.message === "string" &&
      current.message.includes(text)
    ) {
      return true;
    }

    current = "cause" in current ? current.cause : null;
  }

  return false;
}

function getAlreadyProcessedTolerantForwarder(
  forwarder: TransactionForwarder,
): TransactionForwarder {
  return {
    async forwardSequentially(transactions) {
      try {
        return await forwarder.forwardSequentially(transactions);
      } catch (error) {
        // Devnet can accept/land a signed transaction and then fail the SDK's
        // resend/confirmation path with "already processed". This wrapper is
        // used for Umbra public UTXO creation, where the SDK forwards one tx at
        // a time, so the signed tx itself gives us the confirmed signature.
        if (
          !isMainnet &&
          transactions.length === 1 &&
          errorChainIncludes(error, "This transaction has already been processed")
        ) {
          const signature = getSignatureFromTransaction(transactions[0]);
          console.warn(
            "Umbra transaction was already processed; treating as confirmed",
            { signature },
          );
          return [
            signature as unknown as Awaited<
              ReturnType<TransactionForwarder["forwardSequentially"]>
            >[number],
          ];
        }

        throw error;
      }
    },
    forwardInParallel: forwarder.forwardInParallel,
    fireAndForget: forwarder.fireAndForget,
  };
}

export function isUmbraUtxoAlreadySpentError(error: unknown) {
  return (
    errorChainIncludes(error, "NullifierAlreadyBurnt") ||
    errorChainIncludes(error, "DuplicateNullifier") ||
    errorChainIncludes(error, "nullifier already burnt") ||
    errorChainIncludes(error, "Duplicate nullifier") ||
    errorChainIncludes(error, "already spent") ||
    errorChainIncludes(error, "already claimed")
  );
}

export function isUmbraAccountFullyRegistered(
  account?: UmbraUserAccount | null,
) {
  return (
    !!account &&
    account.state === "exists" &&
    account.data.isInitialised &&
    account.data.isUserAccountX25519KeyRegistered &&
    account.data.isUserCommitmentRegistered &&
    account.data.isActiveForAnonymousUsage
  );
}

export function useUmbra() {
  const { connectedWallet } = useWallet();
  const clientRef = useRef<{ address: string; client: IUmbraClient } | null>(
    null,
  );

  async function buildClient(signer: IUmbraSigner) {
    return getUmbraClient({
      signer,
      ...UMBRA_CLIENT_CONFIG,
    });
  }

  function getRequiredConnectedWallet() {
    if (!connectedWallet) {
      throw new Error("Wallet not connected");
    }

    return connectedWallet;
  }

  function getConnectedSigner(): IUmbraSigner {
    const { wallet, account } = getRequiredConnectedWallet();
    const signTxFeature = wallet.features[SolanaSignTransaction] as
      | {
          signTransaction: (
            ...inputs: Array<Record<string, unknown>>
          ) => Promise<Array<{ signedTransaction: Uint8Array }>>;
        }
      | undefined;
    const signMessageFeature = wallet.features[SolanaSignMessage] as
      | {
          signMessage: (
            input: Record<string, unknown>,
          ) => Promise<Array<{ signature: Uint8Array }>>;
        }
      | undefined;

    if (!signTxFeature) {
      throw new Error(
        `${wallet.name} does not support ${SolanaSignTransaction}`,
      );
    }

    if (!signMessageFeature) {
      throw new Error(`${wallet.name} does not support ${SolanaSignMessage}`);
    }

    const encoder = getTransactionEncoder();
    const decoder = getTransactionDecoder();

    return {
      address: toAddress(account.address),
      async signTransaction(transaction) {
        const [output] = await signTxFeature.signTransaction({
          account,
          chain: solanaPaymentConfig.chain,
          transaction: encoder.encode(transaction),
        });
        const decoded = decoder.decode(output.signedTransaction);

        // Phantom returns the signed wire transaction, which is the source of
        // truth for `messageBytes` + `signatures`. `@solana/kit`'s decoder does
        // not preserve Kit-only metadata though, and Umbra's forwarder needs the
        // original blockhash lifetime for confirmation (`lastValidBlockHeight`).
        // Keep the wallet-signed transaction intact and reattach only that
        // lifetime metadata.
        return {
          ...decoded,
          lifetimeConstraint: transaction.lifetimeConstraint,
        } as Awaited<ReturnType<IUmbraSigner["signTransaction"]>>;
      },
      async signTransactions(transactions) {
        const outputs = await signTxFeature.signTransaction(
          ...transactions.map((transaction) => ({
            account,
            chain: solanaPaymentConfig.chain,
            transaction: encoder.encode(transaction),
          })),
        );

        return transactions.map((transaction, index) => {
          const decoded = decoder.decode(outputs[index].signedTransaction);

          // Same rule as `signTransaction`: preserve the exact wallet-signed
          // message/signature pair, then restore the original Kit lifetime data
          // needed by Umbra/Solana Kit confirmation.
          return {
            ...decoded,
            lifetimeConstraint: transaction.lifetimeConstraint,
          } as Awaited<ReturnType<IUmbraSigner["signTransaction"]>>;
        });
      },
      async signMessage(message) {
        const [output] = await signMessageFeature.signMessage({
          account,
          message,
        });

        return {
          message,
          signature: output.signature,
          signer: toAddress(account.address),
        } as Awaited<ReturnType<IUmbraSigner["signMessage"]>>;
      },
    };
  }

  async function getClient(signer: IUmbraSigner) {
    if (clientRef.current?.address === signer.address) {
      return clientRef.current.client;
    }

    const client = await buildClient(signer);
    clientRef.current = {
      address: signer.address,
      client,
    };

    return client;
  }

  async function registerAccount({
    callbacks,
    signer: providedSigner,
  }: { callbacks?: UserRegistrationCallbacks; signer?: IUmbraSigner } = {}) {
    const signer = providedSigner ?? getConnectedSigner();
    const umbraClient = await getClient(signer);

    const zkProver = getUserRegistrationProver({
      // using as proxy because of cors issues
      assetProvider: getUmbraZkAssetProvider(),
    });

    const register = getUserRegistrationFunction(
      { client: umbraClient },
      { zkProver },
    );

    return register({
      confidential: true,
      anonymous: true,
      callbacks,
    });
  }

  async function getUserAccount() {
    if (!connectedWallet) {
      return null;
    }

    try {
      const signer = getConnectedSigner();
      const umbraClient = await getClient(signer);
      const queryAccount = getUserAccountQuerierFunction({
        client: umbraClient,
      });

      return queryAccount(signer.address);
    } catch {
      return null;
    }
  }

  async function isAccountRegistered(): Promise<boolean> {
    try {
      const account = await getUserAccount();
      return isUmbraAccountFullyRegistered(account);
    } catch {
      return false;
    }
  }

  async function getPrivateUsdcBalance({
    signer: providedSigner,
  }: { signer?: IUmbraSigner } = {}) {
    const signer = providedSigner ?? getConnectedSigner();
    const client = await getClient(signer);
    const queryBalance = getEncryptedBalanceQuerierFunction({ client });
    const balances = await queryBalance([solanaPaymentConfig.usdcMint]);

    return balances.get(solanaPaymentConfig.usdcMint) ?? {
      state: "non_existent" as const,
    };
  }

  async function createReceiverClaimableUtxo({
    amount,
    address,
  }: {
    amount: number;
    address: string;
  }) {
    try {
      const signer = getConnectedSigner();
      const client = await getClient(signer);
      const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
        { client },
        {
          zkProver: getCreateReceiverClaimableUtxoFromPublicBalanceProver({
            assetProvider: getUmbraZkAssetProvider(),
          }),
          rpc: {
            transactionForwarder: getAlreadyProcessedTolerantForwarder(
              client.transactionForwarder,
            ),
          },
        },
      );
      const amountInBaseUnits = nativeAmount(
        amount,
        solanaPaymentConfig.tokenDecimals,
      );

      const executeCreateUtxo = () =>
        createUtxo({
          amount: amountInBaseUnits as U64,
          destinationAddress: toAddress(address),
          mint: solanaPaymentConfig.usdcMint,
        });

      try {
        const result = await executeCreateUtxo();
        return { signature: result.createUtxoSignature };
      } catch (error) {
        // Wallet approval + proving can outlive a recent blockhash. Rebuild the
        // Umbra UTXO transaction once on this exact RPC error; surface all other
        // failures unchanged.
        if (errorChainIncludes(error, "Blockhash not found")) {
          const result = await executeCreateUtxo();
          return { signature: result.createUtxoSignature };
        }

        throw error;
      }
    } catch (error) {
      console.error("Umbra UTXO creation failed", {
        error,
        connectedAccountAddress: connectedWallet?.account.address,
        connectedWalletName: connectedWallet?.wallet.name,
      });
      throw error;
    }
  }

  /**
   * Full Umbra UTXO scan.
   *
   * Important: if `endInsertionIndex` is omitted, the SDK scans through the
   * entire Umbra tree (`2^20 - 1`) in pages of up to 1000 UTXOs and attempts to
   * decrypt each page on the main thread. Calling this from always-mounted UI
   * caused visible dashboard freezes. Keep this API for explicit/deep scans,
   * but use `scanRecentClaimableUtxos` for live dashboard surfaces.
   */
  async function scanClaimableUtxos({
    signer: providedSigner,
    treeIndex = 0n,
    startInsertionIndex = 0n,
    endInsertionIndex,
  }: {
    signer?: IUmbraSigner;
    treeIndex?: bigint;
    startInsertionIndex?: bigint;
    endInsertionIndex?: bigint;
  } = {}) {
    const signer = providedSigner ?? getConnectedSigner();
    const client = await getClient(signer);
    const scan = getClaimableUtxoScannerFunction({ client });

    console.info("[Umbra] Full claimable UTXO scan started", {
      network: UMBRA_CLIENT_CONFIG.network,
      signer: signer.address,
      treeIndex: treeIndex.toString(),
      startInsertionIndex: startInsertionIndex.toString(),
      endInsertionIndex: endInsertionIndex?.toString(),
    });

    const result = await scan(
      treeIndex as U32,
      startInsertionIndex as U32,
      endInsertionIndex as U32 | undefined,
    );

    console.info("[Umbra] Full claimable UTXO scan completed", {
      received: result.received.length,
      publicReceived: result.publicReceived.length,
      selfBurnable: result.selfBurnable.length,
      publicSelfBurnable: result.publicSelfBurnable.length,
      nextScanStartIndex: result.nextScanStartIndex.toString(),
    });

    return result;
  }

  async function claimReceiverClaimableUtxos({
    signer: providedSigner,
    utxos,
  }: {
    signer?: IUmbraSigner;
    utxos: readonly UmbraClaimableUtxo[];
  }) {
    if (utxos.length === 0) {
      return null;
    }

    const signer = providedSigner ?? getConnectedSigner();
    console.info("[Umbra] Claiming receiver-claimable UTXOs", {
      network: UMBRA_CLIENT_CONFIG.network,
      signer: signer.address,
      count: utxos.length,
      utxos: utxos.map(formatUmbraUtxoForLog),
    });

    const client = await getClient(signer);
    if (!client.fetchBatchMerkleProof) {
      throw new Error("Umbra client is missing batch Merkle proof support");
    }

    const relayer = getUmbraRelayer({
      apiEndpoint: UMBRA_CLIENT_CONFIG.relayerApiEndpoint,
    });
    const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
      { client },
      {
        fetchBatchMerkleProof: client.fetchBatchMerkleProof,
        zkProver: getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver({
          assetProvider: getUmbraZkAssetProvider(),
        }),
        relayer,
      },
    );

    try {
      const result = await claim(utxos);
      console.info("[Umbra] Receiver-claimable UTXO claim completed", {
        count: utxos.length,
        result,
      });
      return result;
    } catch (error) {
      console.error("[Umbra] Receiver-claimable UTXO claim failed", {
        count: utxos.length,
        utxos: utxos.map(formatUmbraUtxoForLog),
        alreadySpent: isUmbraUtxoAlreadySpentError(error),
        error,
      });
      throw error;
    }
  }

  async function reclaimStaleWithdrawalProofAccounts({
    signer: providedSigner,
  }: {
    signer?: IUmbraSigner;
  } = {}) {
    const signer = providedSigner ?? getConnectedSigner();
    const client = await getClient(signer);
    return reclaimStaleUmbraWithdrawalProofAccounts({ signer, client });
  }

  /**
   * Private withdrawal setup: encrypted balance -> self-claimable UTXO.
   *
   * Current mainnet status / investigation notes:
   * - Vault SOL funding and USDC amount are not the current blocker. We reproduced failures with
   *   ~0.015 SOL available and >= 1 USDC private balance.
   * - The SDK successfully reaches the create flow, then fails during transaction send/preflight
   *   at Umbra's `DepositIntoStealthPoolFromSharedBalanceV11` queue instruction.
   * - Observed error: `CreateUtxoError` stage `transaction-send`, `Custom program error: #1`
   *   on instruction #2.
   * - This appears to be an Umbra/Arcium mainnet queue/precondition issue, not a Hush fee-math
   *   or dust-amount issue.
   * - Failed attempts can create stale proof/input-buffer accounts. We persist the generation
   *   index locally, derive the proof account dynamically, and reclaim rent in the catch block.
   *
   * Next steps:
   * - Do not keep blindly retrying this private UTXO path in production.
   * - Keep automatic stale-rent reclaim on failure.
   * - Add/ship a direct encrypted-balance -> public-wallet withdrawal fallback with clear privacy
   *   warning: it is cheaper/faster but may link the vault withdrawal to the destination wallet.
   * - Re-enable this private UTXO path only after Umbra/Arcium confirms/fixes the mainnet
   *   `DepositIntoStealthPoolFromSharedBalanceV11` custom error #1 failure.
   */
  async function createSelfClaimableUtxoFromEncryptedBalance({
    signer: providedSigner,
    amountBaseUnits,
    destinationAddress,
  }: {
    signer?: IUmbraSigner;
    amountBaseUnits: bigint;
    destinationAddress: string;
  }) {
    const signer = providedSigner ?? getConnectedSigner();
    const client = await getClient(signer);
    await reclaimStaleWithdrawalProofAccounts({ signer });
    const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction(
      { client },
      {
        zkProver: getCreateSelfClaimableUtxoFromEncryptedBalanceProver({
          assetProvider: getUmbraZkAssetProvider(),
        }),
      },
    );

    const generationIndex = generateWithdrawalGenerationIndex();
    const vaultSolBalance = await getSolBalanceLamports(signer.address);
    console.info("[Umbra] Creating self-claimable UTXO from encrypted balance", {
      network: UMBRA_CLIENT_CONFIG.network,
      signer: signer.address,
      destinationAddress,
      amountBaseUnits: amountBaseUnits.toString(),
      vaultSolBalanceLamports: vaultSolBalance.toString(),
      generationIndex: generationIndex.toString(),
    });

    if (vaultSolBalance < MIN_VAULT_SOL_FOR_UTXO_RETRY_LAMPORTS) {
      throw new Error(
        "Vault SOL is too low to recover or retry the private withdrawal setup.",
      );
    }

    try {
      const result = await createUtxo(
        {
          amount: amountBaseUnits as U64,
          destinationAddress: toAddress(destinationAddress),
          mint: solanaPaymentConfig.usdcMint,
        },
        { generationIndex },
      );

      console.info("[Umbra] Self-claimable UTXO creation completed", result);
      return result;
    } catch (error) {
      const serializedError = serializeErrorForLog(error);
      console.error("[Umbra] Self-claimable UTXO creation failed", {
        network: UMBRA_CLIENT_CONFIG.network,
        signer: signer.address,
        destinationAddress,
        amountBaseUnits: amountBaseUnits.toString(),
        vaultSolBalanceLamports: vaultSolBalance.toString(),
        generationIndex: generationIndex.toString(),
        serializedError,
        error,
      });
      console.error(
        "[Umbra] Self-claimable UTXO creation failed JSON",
        JSON.stringify(serializedError, null, 2),
      );

      try {
        const reclaimedAfterFailure = await reclaimStaleWithdrawalProofAccounts({
          signer,
        });
        if (reclaimedAfterFailure.length > 0) {
          console.info(
            "[Umbra] Reclaimed stale proof account after failed UTXO creation",
            reclaimedAfterFailure,
          );
        }
      } catch (reclaimError) {
        console.warn(
          "[Umbra] Could not reclaim stale proof account after failed UTXO creation",
          reclaimError,
        );
      }

      throw error;
    }
  }

  async function claimSelfClaimableUtxosToPublicBalance({
    signer: providedSigner,
    utxos,
  }: {
    signer?: IUmbraSigner;
    utxos: readonly UmbraSelfClaimableUtxo[];
  }) {
    if (utxos.length === 0) {
      return null;
    }

    const signer = providedSigner ?? getConnectedSigner();
    const client = await getClient(signer);
    if (!client.fetchBatchMerkleProof) {
      throw new Error("Umbra client is missing batch Merkle proof support");
    }

    const relayer = getUmbraRelayer({
      apiEndpoint: UMBRA_CLIENT_CONFIG.relayerApiEndpoint,
    });
    const claim = getSelfClaimableUtxoToPublicBalanceClaimerFunction(
      { client },
      {
        fetchBatchMerkleProof: client.fetchBatchMerkleProof,
        zkProver: getClaimSelfClaimableUtxoIntoPublicBalanceProver({
          assetProvider: getUmbraZkAssetProvider(),
        }),
        relayer,
      },
    );

    console.info("[Umbra] Claiming self-claimable UTXOs to public balance", {
      network: UMBRA_CLIENT_CONFIG.network,
      signer: signer.address,
      count: utxos.length,
      utxos: utxos.map(formatUmbraUtxoForLog),
    });

    const result = await claim(utxos);
    console.info("[Umbra] Self-claimable public claim completed", {
      count: utxos.length,
      result,
    });
    return result;
  }

  async function withdrawPrivateUsdcToWallet({
    signer: providedSigner,
    destinationAddress,
    amountBaseUnits,
  }: {
    signer?: IUmbraSigner;
    destinationAddress: string;
    amountBaseUnits: bigint;
  }) {
    const signer = providedSigner ?? getConnectedSigner();
    const before = await scanRecentClaimableUtxos({ signer });
    const beforeIds = new Set(before.selfBurnable.map(getUmbraUtxoId));

    const createResult = await createSelfClaimableUtxoFromEncryptedBalance({
      signer,
      amountBaseUnits,
      destinationAddress,
    });

    for (let attempt = 1; attempt <= WITHDRAWAL_SELF_CLAIMABLE_SCAN_ATTEMPTS; attempt++) {
      const scan = await scanRecentClaimableUtxos({ signer });
      const newUtxos = scan.selfBurnable.filter(
        (utxo) =>
          !beforeIds.has(getUmbraUtxoId(utxo)) &&
          utxo.destinationAddress === destinationAddress,
      );

      console.info("[Umbra] Withdrawal self-claimable UTXO scan", {
        attempt,
        found: newUtxos.length,
        utxos: newUtxos.map(formatUmbraUtxoForLog),
      });

      if (newUtxos.length > 0) {
        const claimResult = await claimSelfClaimableUtxosToPublicBalance({
          signer,
          utxos: newUtxos,
        });
        return { createResult, claimResult, claimedUtxos: newUtxos };
      }

      if (attempt < WITHDRAWAL_SELF_CLAIMABLE_SCAN_ATTEMPTS) {
        await sleep(WITHDRAWAL_SELF_CLAIMABLE_SCAN_DELAY_MS);
      }
    }

    throw new Error("Created withdrawal UTXO, but it was not visible in the indexer yet. Try again shortly.");
  }

  async function scanRecentClaimableUtxos({
    signer: providedSigner,
    treeIndex = 0n,
    maxLeaves = DASHBOARD_SCAN_WINDOW_SIZE,
    pageSize = DASHBOARD_SCAN_PAGE_SIZE,
  }: {
    signer?: IUmbraSigner;
    treeIndex?: bigint;
    maxLeaves?: bigint;
    pageSize?: bigint;
  } = {}) {
    const signer = providedSigner ?? getConnectedSigner();
    const client = await getClient(signer);

    if (!client.fetchUtxoData) {
      throw new Error("Umbra client is missing UTXO indexer support");
    }

    // Bounded dashboard scan. Do not replace this with `scanClaimableUtxos()`
    // in mounted UI: the SDK's default full-tree scan decrypts large UTXO pages
    // on the main thread and caused repeated browser freezes.
    const treeOffset = treeIndex * MAX_LEAVES_PER_TREE;
    const probe = await client.fetchUtxoData(
      treeOffset as U32,
      (treeOffset + MAX_LEAVES_PER_TREE - 1n) as U32,
      1n as U32,
    );
    const totalCount = BigInt(probe.totalCount ?? 0);

    console.info("[Umbra] Recent claimable UTXO scan probe", {
      network: UMBRA_CLIENT_CONFIG.network,
      signer: signer.address,
      treeIndex: treeIndex.toString(),
      totalCount: totalCount.toString(),
      maxLeaves: maxLeaves.toString(),
      pageSize: pageSize.toString(),
    });

    if (totalCount === 0n) {
      return {
        selfBurnable: [],
        received: [],
        publicSelfBurnable: [],
        publicReceived: [],
        nextScanStartIndex: 0n,
      };
    }

    const startInsertionIndex = totalCount > maxLeaves ? totalCount - maxLeaves : 0n;
    const endInsertionIndex = totalCount - 1n;
    const scan = getClaimableUtxoScannerFunction(
      { client },
      {
        fetchUtxoData: (startIndex, endIndex) =>
          client.fetchUtxoData!(startIndex, endIndex, pageSize as U32),
      },
    );

    console.info("[Umbra] Recent claimable UTXO scan started", {
      treeIndex: treeIndex.toString(),
      startInsertionIndex: startInsertionIndex.toString(),
      endInsertionIndex: endInsertionIndex.toString(),
    });

    const result = await scan(
      treeIndex as U32,
      startInsertionIndex as U32,
      endInsertionIndex as U32,
    );

    console.info("[Umbra] Recent claimable UTXO scan completed", {
      received: result.received.length,
      publicReceived: result.publicReceived.length,
      selfBurnable: result.selfBurnable.length,
      publicSelfBurnable: result.publicSelfBurnable.length,
      nextScanStartIndex: result.nextScanStartIndex.toString(),
    });

    return result;
  }

  return {
    connectedWallet,
    isReady: Boolean(connectedWallet),
    registerAccount,
    getUserAccount,
    isAccountRegistered,
    isAcountRegistered: isAccountRegistered,
    isAccountFullyRegistered: isUmbraAccountFullyRegistered,
    getPrivateUsdcBalance,
    createReceiverClaimableUtxo,
    depositAmount: createReceiverClaimableUtxo,
    scanClaimableUtxos,
    scanRecentClaimableUtxos,
    claimReceiverClaimableUtxos,
    createSelfClaimableUtxoFromEncryptedBalance,
    claimSelfClaimableUtxosToPublicBalance,
    withdrawPrivateUsdcToWallet,
    reclaimStaleWithdrawalProofAccounts,
  };
}
