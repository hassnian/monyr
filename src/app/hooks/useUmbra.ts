import {
  createSignerFromWalletAccount,
  getUmbraClient,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
} from "@umbra-privacy/sdk";
import { IUmbraClient, IUmbraSigner, UserRegistrationCallbacks } from "@umbra-privacy/sdk/interfaces";
import {
  getCdnZkAssetProvider,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";
import { Wallet, WalletAccount } from "@wallet-standard/base";
import { useState } from "react";

export function useUmbra() {
  const [client, setClient] = useState<IUmbraClient>();

  const buildClient = async (signer: IUmbraSigner) => {
    return await getUmbraClient({
      signer,
      network: "devnet",
      rpcUrl: "https://api.devnet.solana.com",
      rpcSubscriptionsUrl: "wss://api.devnet.solana.com",
      indexerApiEndpoint: "https://utxo-indexer.api-devnet.umbraprivacy.com",
      deferMasterSeedSignature: true,
    });
  };

  const getClient = async (signer: IUmbraSigner) => {
    const umbraClient = client ?? (await buildClient(signer));

    if (!client) {
      setClient(umbraClient);
    }

    return umbraClient;
  };

  const registerAccount = async ({
    wallet,
    account,
  }: {
    account: WalletAccount;
    wallet: Wallet;
    }, {
    callbacks
  }: {
    callbacks?: UserRegistrationCallbacks
  } = {}) => {
    const signer = createSignerFromWalletAccount(wallet, account);

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

    const signatures = await register({
      confidential: true,
      anonymous: true,
      callbacks
    });

    return signatures;
  };

  const getUserAccount = async ({
    wallet,
    account,
  }: {
    account: WalletAccount;
    wallet: Wallet;
  }) => {
    try {
      const signer = createSignerFromWalletAccount(wallet, account);
      const umbraClient = await getClient(signer);

      const queryAccount = getUserAccountQuerierFunction({
        client: umbraClient,
      });
      return queryAccount(signer.address);
    } catch {
      return null;
    }
  };

  const isAcountRegistered = async (params: {
    account: WalletAccount;
    wallet: Wallet;
  }): Promise<boolean> => {
    try {
      const account = await getUserAccount({
        account: params.account,
        wallet: params.wallet,
      });

      return isAccountFullyRegistered(account)
    } catch {
      return false;
    }
  };

  function isAccountFullyRegistered(
    account?: Awaited<ReturnType<ReturnType<typeof useUmbra>["getUserAccount"]>>
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

  return {
    registerAccount,
    getUserAccount,
    isAcountRegistered,
    isAccountFullyRegistered
  };
}
