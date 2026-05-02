/**
 * Mock dashboard fixtures. Static values only — no timers, no randomness during
 * render, so server/client hydration stays stable and the numbers read the same
 * across reloads.
 */

export type PaymentStatus = "claimed" | "claiming" | "pending" | "failed";

export type Payment = {
  id: string;
  /** The sub-handle slug this payment flowed through. `null` = root handle. */
  subPath: string | null;
  /** Display label from the sub-handle, if any. */
  subLabel: string | null;
  /** 6/6-truncated pubkey of the payer, or null for anonymous mixer payments. */
  payerPubkey: string | null;
  /** Optional label users have pinned to a repeat payer ("Acme Corp"). */
  payerLabel: string | null;
  amount: number;
  /** Native/base units for exact token display when present. USDC has 6 decimals. */
  amountBaseUnits?: string;
  /** Already decrypted (locally) by MVK. */
  memo: string | null;
  status: PaymentStatus;
  /** ISO timestamp — stable, not computed at render. */
  createdAt: string;
  /** On-chain create tx signature, truncated. */
  txSig: string;
};

export type Outgoing = {
  id: string;
  /** Either @handle or a truncated pubkey if one-off send. */
  recipient: string;
  recipientKind: "handle" | "pubkey" | "send-link";
  amount: number;
  memo: string | null;
  status: "confirmed" | "sent" | "claimed" | "unclaimed";
  createdAt: string;
  /** For send-link: whether the link has been claimed. */
  claimedAt?: string | null;
  txSig: string;
};

export type SubHandle = {
  id: string;
  subPath: string;
  kind: "custom" | "invoice" | "claim";
  displayLabel: string;
  totalReceived: number;
  paymentCount: number;
  fixedAmount?: number;
  memoTemplate?: string;
  status: "active" | "paid" | "expired" | "cancelled";
  createdAt: string;
  expiresAt?: string | null;
};

export type SendLink = {
  id: string;
  publicId: string;
  amount: number;
  memo: string | null;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  recipientHint: string | null;
};

export type DailyFlow = {
  /** ISO date (YYYY-MM-DD) — label only. */
  date: string;
  received: number;
};

export type Profile = {
  handle: string;
  displayName: string;
  bio: string;
  ownerPubkey: string;
  memberSince: string;
};

export const profile: Profile = {
  handle: "alice",
  displayName: "Alice Chen",
  bio: "Research writing on privacy cryptography. Tips keep the essays free.",
  ownerPubkey: "7kQ3Xf2ZbDcmPfv8Lq5eT9wN1hJAoYmcRsExample",
  memberSince: "2026-01-14",
};

/** 30-day area chart data. Shaped like real creator earnings — not uniform. */
export const dailyFlow: DailyFlow[] = [
  { date: "2026-03-25", received: 18 },
  { date: "2026-03-26", received: 42 },
  { date: "2026-03-27", received: 24 },
  { date: "2026-03-28", received: 31 },
  { date: "2026-03-29", received: 0 },
  { date: "2026-03-30", received: 58 },
  { date: "2026-03-31", received: 220 },
  { date: "2026-04-01", received: 96 },
  { date: "2026-04-02", received: 14 },
  { date: "2026-04-03", received: 33 },
  { date: "2026-04-04", received: 9 },
  { date: "2026-04-05", received: 0 },
  { date: "2026-04-06", received: 47 },
  { date: "2026-04-07", received: 62 },
  { date: "2026-04-08", received: 28 },
  { date: "2026-04-09", received: 180 },
  { date: "2026-04-10", received: 34 },
  { date: "2026-04-11", received: 52 },
  { date: "2026-04-12", received: 11 },
  { date: "2026-04-13", received: 0 },
  { date: "2026-04-14", received: 97 },
  { date: "2026-04-15", received: 41 },
  { date: "2026-04-16", received: 26 },
  { date: "2026-04-17", received: 750 },
  { date: "2026-04-18", received: 65 },
  { date: "2026-04-19", received: 22 },
  { date: "2026-04-20", received: 38 },
  { date: "2026-04-21", received: 44 },
  { date: "2026-04-22", received: 19 },
  { date: "2026-04-23", received: 81 },
  { date: "2026-04-24", received: 54 },
];

export const subHandles: SubHandle[] = [
  {
    id: "sh_1",
    subPath: "acme",
    kind: "custom",
    displayLabel: "Acme Corp",
    totalReceived: 3250,
    paymentCount: 5,
    status: "active",
    createdAt: "2026-02-08",
  },
  {
    id: "sh_2",
    subPath: "tips",
    kind: "custom",
    displayLabel: "Reader tips",
    totalReceived: 1284.5,
    paymentCount: 41,
    status: "active",
    createdAt: "2026-01-20",
  },
  {
    id: "sh_3",
    subPath: "invoice/x7k2",
    kind: "invoice",
    displayLabel: "Frontend · April",
    totalReceived: 750,
    paymentCount: 1,
    fixedAmount: 750,
    memoTemplate: "Frontend engineering · April 2026",
    status: "paid",
    createdAt: "2026-04-12",
    expiresAt: "2026-05-12",
  },
  {
    id: "sh_4",
    subPath: "invoice/q9m1",
    kind: "invoice",
    displayLabel: "Consulting · Q2",
    totalReceived: 0,
    paymentCount: 0,
    fixedAmount: 2400,
    memoTemplate: "Q2 privacy audit retainer",
    status: "active",
    createdAt: "2026-04-22",
    expiresAt: "2026-05-22",
  },
  {
    id: "sh_5",
    subPath: "zeroday",
    kind: "custom",
    displayLabel: "Zeroday (newsletter)",
    totalReceived: 602,
    paymentCount: 18,
    status: "active",
    createdAt: "2026-02-27",
  },
  {
    id: "sh_6",
    subPath: "invoice/b3t8",
    kind: "invoice",
    displayLabel: "Audit report",
    totalReceived: 1800,
    paymentCount: 1,
    fixedAmount: 1800,
    memoTemplate: "Protocol review · Orchid Labs",
    status: "paid",
    createdAt: "2026-03-15",
    expiresAt: "2026-04-15",
  },
];

export const payments: Payment[] = [
  {
    id: "pay_01",
    subPath: "acme",
    subLabel: "Acme Corp",
    payerPubkey: "8vQr4W…mN2kPx",
    payerLabel: "Acme Corp",
    amount: 750,
    memo: "April frontend work — thanks Alice",
    status: "claimed",
    createdAt: "2026-04-24T09:32:00Z",
    txSig: "4kTn…rH7p",
  },
  {
    id: "pay_02",
    subPath: null,
    subLabel: null,
    payerPubkey: "B3xM8q…zL9tKw",
    payerLabel: null,
    amount: 25,
    memo: "Your essay on ETA rotation was excellent",
    status: "claimed",
    createdAt: "2026-04-24T08:14:00Z",
    txSig: "9Lmv…uY3c",
  },
  {
    id: "pay_03",
    subPath: "tips",
    subLabel: "Reader tips",
    payerPubkey: null,
    payerLabel: null,
    amount: 5,
    memo: null,
    status: "claimed",
    createdAt: "2026-04-24T07:02:00Z",
    txSig: "Kp2a…bT9x",
  },
  {
    id: "pay_04",
    subPath: "zeroday",
    subLabel: "Zeroday (newsletter)",
    payerPubkey: "9wNk2c…aQ1vMe",
    payerLabel: null,
    amount: 12,
    memo: "Monthly subscription",
    status: "claimed",
    createdAt: "2026-04-23T22:41:00Z",
    txSig: "3pQr…jN8t",
  },
  {
    id: "pay_05",
    subPath: null,
    subLabel: null,
    payerPubkey: "C4zR7x…nM8pLa",
    payerLabel: null,
    amount: 50,
    memo: "For the coffee",
    status: "claiming",
    createdAt: "2026-04-23T18:09:00Z",
    txSig: "7Yxf…qW2n",
  },
  {
    id: "pay_06",
    subPath: "tips",
    subLabel: "Reader tips",
    payerPubkey: "F1mN3k…cQ7sXa",
    payerLabel: null,
    amount: 20,
    memo: "Keep writing",
    status: "claimed",
    createdAt: "2026-04-23T16:55:00Z",
    txSig: "Lq8t…rM1v",
  },
  {
    id: "pay_07",
    subPath: "invoice/b3t8",
    subLabel: "Audit report",
    payerPubkey: "D8bQ5y…wE2kNr",
    payerLabel: "Orchid Labs",
    amount: 1800,
    memo: "Orchid Labs audit payment · contract OL-2026-04",
    status: "claimed",
    createdAt: "2026-04-22T14:22:00Z",
    txSig: "Xr4n…hT6p",
  },
  {
    id: "pay_08",
    subPath: "zeroday",
    subLabel: "Zeroday (newsletter)",
    payerPubkey: "G6mR1x…vN9cKt",
    payerLabel: null,
    amount: 12,
    memo: null,
    status: "claimed",
    createdAt: "2026-04-21T11:03:00Z",
    txSig: "2Wmk…sR5e",
  },
  {
    id: "pay_09",
    subPath: "acme",
    subLabel: "Acme Corp",
    payerPubkey: "8vQr4W…mN2kPx",
    payerLabel: "Acme Corp",
    amount: 500,
    memo: "March retainer",
    status: "claimed",
    createdAt: "2026-04-15T13:44:00Z",
    txSig: "Ht3x…pL8m",
  },
  {
    id: "pay_10",
    subPath: null,
    subLabel: null,
    payerPubkey: null,
    payerLabel: null,
    amount: 3,
    memo: null,
    status: "claimed",
    createdAt: "2026-04-15T09:12:00Z",
    txSig: "Rv7p…qK4n",
  },
  {
    id: "pay_11",
    subPath: "tips",
    subLabel: "Reader tips",
    payerPubkey: "E2wQ8m…bX5cLa",
    payerLabel: null,
    amount: 10,
    memo: "Thanks for the privacy primer",
    status: "claimed",
    createdAt: "2026-04-12T20:30:00Z",
    txSig: "Mn6t…zB3r",
  },
  {
    id: "pay_12",
    subPath: "invoice/x7k2",
    subLabel: "Frontend · April",
    payerPubkey: "P9kR2n…mT4vXw",
    payerLabel: "Relay Studio",
    amount: 750,
    memo: "Frontend engineering · April 2026",
    status: "claimed",
    createdAt: "2026-04-12T10:05:00Z",
    txSig: "Qf1j…nW7s",
  },
];

export const outgoing: Outgoing[] = [
  {
    id: "out_01",
    recipient: "@bob",
    recipientKind: "handle",
    amount: 200,
    memo: "Rent split · April",
    status: "confirmed",
    createdAt: "2026-04-18T10:00:00Z",
    txSig: "Wb3k…nR5p",
  },
  {
    id: "out_02",
    recipient: "Ed6x…kL9m",
    recipientKind: "send-link",
    amount: 100,
    memo: "Birthday gift",
    status: "unclaimed",
    createdAt: "2026-04-20T15:30:00Z",
    claimedAt: null,
    txSig: "Jq8n…mP2t",
  },
  {
    id: "out_03",
    recipient: "@samir",
    recipientKind: "handle",
    amount: 45,
    memo: "Coffee reimbursement",
    status: "claimed",
    createdAt: "2026-04-10T08:45:00Z",
    txSig: "Zp2q…bK7r",
  },
  {
    id: "out_04",
    recipient: "H2mN8x…pQ4cRa",
    recipientKind: "pubkey",
    amount: 300,
    memo: null,
    status: "confirmed",
    createdAt: "2026-04-05T17:22:00Z",
    txSig: "Tc4n…jM8w",
  },
];

export const sendLinks: SendLink[] = [
  {
    id: "snd_01",
    publicId: "c/f9xm8a2q",
    amount: 100,
    memo: "Birthday gift",
    createdAt: "2026-04-20T15:30:00Z",
    expiresAt: "2026-05-20T15:30:00Z",
    claimedAt: null,
    recipientHint: "for sender's cousin",
  },
  {
    id: "snd_02",
    publicId: "c/k3wqp8tr",
    amount: 25,
    memo: "Conf refund",
    createdAt: "2026-04-14T11:18:00Z",
    expiresAt: "2026-05-14T11:18:00Z",
    claimedAt: "2026-04-15T09:02:00Z",
    recipientHint: null,
  },
];

export const metrics = {
  totalReceived: 8214.5,
  totalReceivedCount: 83,
  monthToDate: 2938.5,
  monthToDateCount: 28,
  /** MoM change as a decimal (0.23 = +23%). Signed. */
  monthOverMonthDelta: 0.23,
  pendingClaims: 1,
  pendingAmount: 50,
  activeLinks: 2,
};

/** Available sub-handle options for the Inbox filter row. Pre-sorted. */
export const inboxFilterOptions = [
  { value: "all", label: "All payments", count: payments.length },
  ...subHandles
    .filter((s) => s.kind === "custom")
    .map((s) => ({
      value: s.subPath,
      label: s.displayLabel,
      count: payments.filter((p) => p.subPath === s.subPath).length,
    })),
  {
    value: "invoice",
    label: "Invoices",
    count: payments.filter((p) => p.subPath?.startsWith("invoice/")).length,
  },
  {
    value: "root",
    label: "Root tips",
    count: payments.filter((p) => p.subPath === null).length,
  },
];
