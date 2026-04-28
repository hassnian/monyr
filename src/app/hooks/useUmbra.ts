import {
  getUmbraClient,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
} from "@umbra-privacy/sdk";
import {
  type IUmbraClient,
  type IUmbraSigner,
  type UserRegistrationCallbacks,
} from "@umbra-privacy/sdk/interfaces";
import {
  getCdnZkAssetProvider,
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
import { U64 } from "@umbra-privacy/sdk/types";

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

        return decoder.decode(output.signedTransaction) as Awaited<
          ReturnType<IUmbraSigner["signTransaction"]>
        >;
      },
      async signTransactions(transactions) {
        const outputs = await signTxFeature.signTransaction(
          ...transactions.map((transaction) => ({
            account,
            chain: solanaPaymentConfig.chain,
            transaction: encoder.encode(transaction),
          })),
        );

        return outputs.map((output) =>
          decoder.decode(output.signedTransaction) as Awaited<
            ReturnType<IUmbraSigner["signTransaction"]>
          >,
        );
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

  async function depositAmount({
    amount,
    address,
  }: {
    amount: number;
    address: string;
  }) {
    try {
      const signer = getConnectedSigner();
      const client = await getClient(signer);
      const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({
        client,
      });
      const amountInBaseUnits = nativeAmount(
        amount,
        solanaPaymentConfig.tokenDecimals,
      );

      return deposit(
        toAddress(address),
        solanaPaymentConfig.usdcMint,
        amountInBaseUnits as U64,
      );
    } catch (error) {
      console.error("Umbra deposit failed", {
        error,
        connectedAccountAddress: connectedWallet?.account.address,
        connectedWalletName: connectedWallet?.wallet.name,
      });
      throw error;
    }
  }

  return {
    connectedWallet,
    isReady: Boolean(connectedWallet),
    registerAccount,
    getUserAccount,
    isAccountRegistered,
    isAcountRegistered: isAccountRegistered,
    isAccountFullyRegistered: isUmbraAccountFullyRegistered,
    depositAmount,
  };
}
