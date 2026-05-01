import {
  getUmbraClient,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
  getEncryptedBalanceQuerierFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getClaimableUtxoScannerFunction,
} from "@umbra-privacy/sdk";
import {
  type IUmbraClient,
  type IUmbraSigner,
  type UserRegistrationCallbacks,
} from "@umbra-privacy/sdk/interfaces";
import {
  getCdnZkAssetProvider,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";
import { useRef } from "react";
import { useWallet } from "@/app/contexts/wallet-context";
import {
  address as toAddress,
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
  deferMasterSeedSignature: true,
} as const;

type UmbraUserAccount = Awaited<
  ReturnType<ReturnType<typeof getUserAccountQuerierFunction>>
>;

const MAX_LEAVES_PER_TREE = 2n ** 20n;
const DASHBOARD_SCAN_WINDOW_SIZE = 500n;
const DASHBOARD_SCAN_PAGE_SIZE = 50n;

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
      assetProvider: getCdnZkAssetProvider({
        baseUrl: "/api/umbra-zk",
        manifestUrl: "/api/umbra-zk/manifest.json",
      }),
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
            assetProvider: getCdnZkAssetProvider({
              baseUrl: "/api/umbra-zk",
              manifestUrl: "/api/umbra-zk/manifest.json",
            }),
          }),
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

    return scan(
      treeIndex as U32,
      startInsertionIndex as U32,
      endInsertionIndex as U32 | undefined,
    );
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
      treeOffset,
      treeOffset + MAX_LEAVES_PER_TREE - 1n,
      1n,
    );
    const totalCount = BigInt(probe.totalCount ?? 0);

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
          client.fetchUtxoData!(startIndex, endIndex, pageSize),
      },
    );

    return scan(
      treeIndex as U32,
      startInsertionIndex as U32,
      endInsertionIndex as U32,
    );
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
  };
}
