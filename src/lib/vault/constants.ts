export const VAULT_SPONSOR_LAMPORTS = 15_000_000n; // 0.015 SOL
// Encrypted-balance -> self-claimable UTXO needs enough SOL for proof-account
// rent plus the Arcium queue/callback path. 0.015 SOL could create the proof
// account but failed before queueing; 0.03 SOL has worked with rent reclaim.
export const UTXO_CREATION_SPONSOR_LAMPORTS = 30_000_000n; // 0.03 SOL
export const VAULT_SWEEP_BUFFER_LAMPORTS = 1_000_000n; // 0.001 SOL
