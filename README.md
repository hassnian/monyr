# Monyr

**Get paid at `@yourname`. Private payments by handle on Solana, built on [Umbra](https://umbraprivacy.com/).**

> A handle that resolves to an Umbra-encrypted vault — not a wallet address. Share one link in any bio; let your wallet history, your balance, and your memos stay off the public ledger.

- 🌐 **Live on devnet:** [monyr.xyz](https://monyr.xyz)
- 🎬 **Walkthrough:** [`/demo`](https://monyr.xyz/demo) — six steps against the real production routes
- 🔍 **Privacy model:** [`/privacy-model`](https://monyr.xyz/privacy-model) — what's hidden, what's visible, the honest caveats
- 🛠 **Every Umbra SDK call we make, tagged honestly:** [`/umbra`](https://monyr.xyz/umbra)

---

## The pitch

A wallet address is a bank statement. Drop it in a Twitter bio and every visitor sees your DEX trades, NFT buys, and balances. Monyr replaces that surface with a `@handle` — resolved to a separate keypair that has no history, with payments routed through Umbra's UTXO mixer and encrypted balances.

The main wallet only signs the unlock message at handle claim; it never appears in a payment transaction. Everything else — receiving, sending vault-to-vault, withdrawing — is signed by the in-browser vault keypair, with Umbra's relayer carrying claims so recipients pay no SOL.

## Built deeply on Umbra

Four production rails, every primitive shipping live:

| Rail | Umbra primitive | Visible on-chain | Hidden |
|---|---|---|---|
| Payer → vault payment | `getPublicBalanceToReceiverClaimableUtxoCreatorFunction` | Payer wallet, amount | Recipient vault (AES-encrypted in commitment) |
| Vault → vault send | `getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction` | Sender vault as signer | Amount (homomorphic ETA debit), destination |
| Inbox claim | `getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction` *(relayer-signed)* | Encrypted-balance update | Source UTXO, gas paid by relayer |
| Private withdrawal | `getEncryptedBalanceToSelfClaimableUtxoCreatorFunction` + `getSelfClaimableUtxoToPublicBalanceClaimerFunction` | Vault create event; relayer-signed claim into the destination ATA | Direct vault → wallet edge (there is none — two-leg, mixer-routed) |

Plus:
- In-browser Groth16 proving via `@umbra-privacy/web-zk-prover` v2, with the asset CDN proxied through `/api/umbra-zk` to dodge CORS.
- `getEncryptedBalanceQuerierFunction` for client-side balance decryption — the server never sees a dollar amount.
- `getUserRegistrationFunction` wired into both the recipient activation flow and a lazy first-time payer prompt (`pay-confirmation-modal.tsx`).

Live ↔ planned breakdown — including the compliance-grant primitive that's scoped but not yet shipped — at [`/umbra`](https://monyr.xyz/umbra). The honest threat model and the caveats around the mixer's anonymity set are at [`/privacy-model`](https://monyr.xyz/privacy-model).

## Why a handle matters

You can't put a wallet address in a Twitter bio without handing every visitor your transaction history. You can put `monyr.xyz/@alice` there. Same payment ergonomics, none of the public-ledger leakage. The path after the handle is metadata for your inbox, not for the chain — `/@alice/acme` for a per-client label, `/@alice/invoice/x7k2` for a fixed invoice, `/@alice/c/<id>` for a one-off send link. Same vault behind every URL.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind v4
- **Solana** via `@solana/kit` v6 and Wallet Standard
- **Umbra** `@umbra-privacy/sdk` v4 + `@umbra-privacy/web-zk-prover` v2
- **Postgres** via Drizzle ORM (handle records, encrypted vault blobs, encrypted receipt metadata)

## Quick start

```bash
bun install
# create .env (see required vars below)
bun dev
```

Then visit `http://localhost:3000`. On devnet, both test SOL and devnet USDC come from [`faucet.umbraprivacy.com`](https://faucet.umbraprivacy.com/).

### Required env

#### Server-only secrets

Never prefix these with `NEXT_PUBLIC_`; they must not be exposed to the browser.

| Var | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string used by Drizzle. |
| `AUTH_SESSION_SECRET` | High-entropy secret for signing wallet sessions. Generate with `openssl rand -base64 32`. |
| `OWNER_WALLET_LOOKUP_SECRET` | High-entropy pepper for hashing owner-wallet lookups. Generate with `openssl rand -base64 32`. |
| `SOLANA_RPC_URL` / `SOLANA_WS_URL` | Server-side Solana RPC + WebSocket endpoints used by sponsor/funding actions. |
| `SOLANA_SECRET_KEY_BASE58` | Base58-encoded Solana keypair secret for the sponsor wallet. Used to fund vaults for Umbra activation/UTXO setup. Keep funded with devnet SOL; never expose client-side. |

#### Public browser config

These are safe to expose and are read by the client bundle.

| Var | What it is |
|---|---|
| `NEXT_PUBLIC_APP_DOMAIN` | Public domain used in profile URLs. Defaults to `monyr.xyz`. |
| `NEXT_PUBLIC_SOLANA_CHAIN` | `solana:devnet` or `solana:mainnet-beta`. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` / `NEXT_PUBLIC_SOLANA_WS_URL` | Browser-side Solana RPC + WebSocket endpoints. |
| `NEXT_PUBLIC_PAYMENT_TOKEN_MINT` | Payment token mint for the active chain. Devnet defaults to dUSDC; mainnet defaults to USDC. |
| `NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS` | Token decimals. Usually `6` for USDC/dUSDC. |
| `NEXT_PUBLIC_PAYMENT_TOKEN_NAME` / `NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL` | Token display metadata, e.g. `Dummy USDC` / `dUSDC`. |

## Project layout

```
src/app/                     Next.js routes (landing, /demo, /umbra, /privacy-model, /[handle], /app/*, /claim, /c/[id])
src/app/hooks/useUmbra.ts    Every Umbra primitive used by the app
src/app/actions/             Server actions (handles, vault, payment metadata)
src/lib/payments/            SPL Quick Pay rail + amount helpers
src/db/schema.ts             Drizzle schema
```

## Scripts

| Command | What it does |
|---|---|
| `bun dev` | Next.js dev server |
| `bun run build` | Production build |
| `bun start` | Start the production server |
| `bun run lint` | ESLint |

---

Built for the Umbra side track. The premise: most "privacy" wrappers are shallow — Monyr is intentionally Umbra-deep, with every payment primitive shipping live and a [`/umbra`](https://monyr.xyz/umbra) page that lets a judge audit which calls are real, line by line.
