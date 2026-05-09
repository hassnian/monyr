# Monyr

Private payments by handle on Solana. A `@handle` resolves to an Umbra-backed encrypted vault, not a wallet address — share one URL in any bio, accept payments, and let your wallet history, your inbox totals, and your memos stay off the public ledger.

Live on Solana devnet. Built on [Umbra](https://umbraprivacy.com/) (UTXO mixer + encrypted balances on Arcium).

## Stack

- **Next.js 16** (App Router) + React 19, Tailwind v4
- **Solana** via `@solana/kit` v6 and Wallet Standard
- **Umbra**: `@umbra-privacy/sdk` v4 + `@umbra-privacy/web-zk-prover` for in-browser Groth16 proofs
- **Postgres** via Drizzle ORM (handle records, encrypted vault blobs, encrypted receipt metadata)

## Quick start

```bash
bun install
# create .env with the variables below
bun dev
```

Then visit `http://localhost:3000`.

### Required env

| Var | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SESSION_SECRET` | Server-side session signing secret |
| `OWNER_WALLET_LOOKUP_SECRET` | Server-side hashing key for handle→owner lookups |
| `SOLANA_RPC_URL` / `SOLANA_WS_URL` | Server-side Solana endpoints |
| `SOLANA_SECRET_KEY_BASE58` | Sponsor account secret key, base58-encoded (used to fund vaults for Umbra activation) |
| `NEXT_PUBLIC_APP_DOMAIN` | Public domain (e.g. `monyr.app`) |
| `NEXT_PUBLIC_SOLANA_CHAIN` | `solana:devnet` or `solana:mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` / `NEXT_PUBLIC_SOLANA_WS_URL` | Browser-side Solana endpoints |
| `NEXT_PUBLIC_PAYMENT_TOKEN_MINT` | USDC mint for the active chain |
| `NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS` / `_NAME` / `_SYMBOL` | Token display metadata |

On devnet, both test SOL and devnet USDC come from [`faucet.umbraprivacy.com`](https://faucet.umbraprivacy.com/).

## Where to read more

- `/demo` — six-step walkthrough against the real production routes
- `/umbra` — every Umbra SDK call this codebase makes, tagged honestly
- `/privacy-model` — what's hidden, what's visible, and the honest caveats around withdrawal

## Project layout

```
src/app/                     Next.js routes (landing, /demo, /umbra, /privacy-model, /[handle], /app/*, /claim, /c/[id])
src/app/hooks/useUmbra.ts    Every Umbra primitive used by the app
src/app/actions/             Server actions (handles, vault, payment metadata)
src/lib/payments/            SPL Quick Pay rail + amount helpers
src/db/schema.ts             Drizzle schema
```

## Scripts

- `bun dev` — Next.js dev server
- `bun run build` — production build
- `bun start` — start the production server
- `bun run lint` — ESLint
