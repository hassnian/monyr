import {
  createSignerFromWalletAccount,
  getUmbraClient,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction
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
import { Address } from "@solana/kit";
import { nativeAmount } from "@/lib/payments/amount";

const UMBRA_CLIENT_CONFIG = {
  network: "devnet" as const,
  rpcUrl: "https://api.devnet.solana.com",
  rpcSubscriptionsUrl: "wss://api.devnet.solana.com",
  indexerApiEndpoint: "https://utxo-indexer.api-devnet.umbraprivacy.com",
  deferMasterSeedSignature: true,
};

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

  function getConnectedSigner() {
    const { wallet, account } = getRequiredConnectedWallet();
    return createSignerFromWalletAccount(wallet, account);
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
    signer: providedSigner
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

  async function depositAmount({ amount, address }:{amount: number, address: string}) {
    // try {
    //   const signer = getConnectedSigner();
    //   const client= await getClient(signer);
    //   const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client })

    //   const USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" as Address
    //   const toNativeAmount  = toNativeAmount(amount, 6)

    //   const result = await deposit(address as Address, USDC, toNativeAmount );

    //   console.log("Queue signature:", result.queueSignature);
    //   console.log("Callback signature:", result.callbackSignature);
    // } catch (error) {
    //   console.log('Somehting went wrong', error)
    // }
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
