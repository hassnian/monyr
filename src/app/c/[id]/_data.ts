export type ClaimableLink = {
  id: string;
  amount: number;
  memo?: string;
  sender?: { handle: string; displayName?: string };
  createdAt: string;
  status: "available" | "claimed" | "expired";
};

const AMOUNTS = [5, 10, 20, 25, 50, 100, 250];

const MEMOS: (string | null)[] = [
  "Coffee for the journey home.",
  "Birthday — pick yourself up something good.",
  "For the rent split. Talk soon.",
  "Thanks for the essay. Truly.",
  null,
  "Welcome to Solana. Don't lose it.",
  null,
];

const SENDERS: (ClaimableLink["sender"] | undefined)[] = [
  { handle: "alice", displayName: "Alice Chen" },
  { handle: "bob" },
  undefined,
  { handle: "lena" },
  undefined,
  { handle: "morgan" },
  undefined,
];

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getClaimable(id: string): ClaimableLink | null {
  if (!/^[a-z0-9]{4,32}$/i.test(id)) return null;

  const seed = hash(id.toLowerCase());
  const idx = seed % AMOUNTS.length;

  return {
    id,
    amount: AMOUNTS[idx],
    memo: MEMOS[idx] ?? undefined,
    sender: SENDERS[idx],
    status: "available",
    createdAt: new Date(Date.now() - (seed % 86_400) * 1000).toISOString(),
  };
}
