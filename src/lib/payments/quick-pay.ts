import type { IdentifierString, Wallet, WalletAccount } from "@wallet-standard/base";
import { SolanaSignTransaction } from "@solana/wallet-standard-features";
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  getTransactionDecoder,
  getTransactionEncoder,
  getU64Encoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
} from "@solana/kit";
import { nativeAmount } from "./amount";
import { solanaPaymentConfig } from "./solana-config";
import { canSignTransaction } from "./wallet";

const TOKEN_PROGRAM_ADDRESS = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");
const SYSVAR_RENT_ADDRESS = address("SysvarRent111111111111111111111111111111111");
const paymentTokenDecimals = solanaPaymentConfig.tokenDecimals;

export async function signSolanaTransaction({
  wallet,
  account,
  transaction,
  chain = solanaPaymentConfig.chain,
}: {
  wallet: Wallet;
  account: WalletAccount;
  transaction: Uint8Array;
  chain?: IdentifierString;
}) {
  if (!canSignTransaction(wallet, account)) {
    throw new Error("Wallet does not support Solana transaction signing");
  }

  if (!account.chains.includes(chain)) {
    throw new Error(`Wallet account does not support ${chain}`);
  }

  const [signed] = await wallet.features[SolanaSignTransaction].signTransaction({
    account,
    transaction,
    chain,
    options: { preflightCommitment: "confirmed" },
  });

  return signed.signedTransaction;
}

async function findAta(owner: Address, mint: Address) {
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

function getCreateAtaInstruction({
  payer,
  ata,
  owner,
  mint,
}: {
  payer: Address;
  ata: Address;
  owner: Address;
  mint: Address;
}): Instruction {
  return {
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    accounts: [
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: ata, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY },
      { address: mint, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: SYSVAR_RENT_ADDRESS, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(),
  };
}

function getTransferCheckedInstruction({
  sourceAta,
  destinationAta,
  owner,
  mint,
  amount,
}: {
  sourceAta: Address;
  destinationAta: Address;
  owner: Address;
  mint: Address;
  amount: bigint;
}): Instruction {
  const data = new Uint8Array(10);
  data[0] = 12; // SPL Token TransferChecked instruction
  data.set(getU64Encoder().encode(amount), 1);
  data[9] = paymentTokenDecimals;

  return {
    programAddress: TOKEN_PROGRAM_ADDRESS,
    accounts: [
      { address: sourceAta, role: AccountRole.WRITABLE },
      { address: mint, role: AccountRole.READONLY },
      { address: destinationAta, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY_SIGNER },
    ],
    data,
  };
}

export async function sendQuickUsdcPayment({
  wallet,
  account,
  destinationOwner,
  amount,
}: {
  wallet: Wallet;
  account: WalletAccount;
  destinationOwner: string;
  amount: number;
}) {
  if (!canSignTransaction(wallet, account)) {
    throw new Error("Wallet does not support Solana transaction signing");
  }

  const rpc = createSolanaRpc(solanaPaymentConfig.rpcUrl);
  const payer = address(account.address);
  const recipient = address(destinationOwner);
  const mint = solanaPaymentConfig.usdcMint;
  const nativeUsdcAmount = nativeAmount(amount, paymentTokenDecimals);

  const sourceAta = await findAta(payer, mint);
  const destinationAta = await findAta(recipient, mint);
  const destinationAtaInfo = await rpc.getAccountInfo(destinationAta, {
    encoding: "base64",
  }).send();
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const instructions: Instruction[] = [];

  if (!destinationAtaInfo.value) {
    instructions.push(
      getCreateAtaInstruction({
        payer,
        ata: destinationAta,
        owner: recipient,
        mint,
      }),
    );
  }

  instructions.push(
    getTransferCheckedInstruction({
      sourceAta,
      destinationAta,
      owner: payer,
      mint,
      amount: nativeUsdcAmount,
    }),
  );

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(payer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
  );

  const unsignedTransaction = compileTransaction(transactionMessage);
  const unsignedTransactionBytes = getTransactionEncoder().encode(unsignedTransaction);

  const signedTransactionBytes = await signSolanaTransaction({
    wallet,
    account,
    transaction: Uint8Array.from(unsignedTransactionBytes),
  });

  const signedTransaction = getTransactionDecoder().decode(
    Uint8Array.from(signedTransactionBytes),
  );
  const signature = await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signedTransaction), {
      encoding: "base64",
      preflightCommitment: "confirmed",
    })
    .send();

  return { signature, sourceAta, destinationAta };
}
