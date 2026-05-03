import type { UmbraStatus } from "@/app/[handle]/_components/profile.types";

export type ProductMock = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  /** USDC, decimal — e.g. 12 = 12 USDC */
  price: number;
  kind: "download" | "license" | "access";
  /** Format hints listed under the price (e.g. "PDF · 42 pages") */
  format: string[];
  cover: {
    fromHue: number;
    toHue: number;
    glyph: string;
  };
  seller: {
    handle: string;
    displayName: string;
    vaultPubkey: string;
    umbraStatus: UmbraStatus;
  };
  stats: {
    sold: number;
    rating?: number;
  };
};

const PRODUCTS: ProductMock[] = [
  {
    id: "solana-privacy-report",
    slug: "solana-privacy-report",
    title: "The Solana Privacy Report",
    tagline: "Field notes from the inside of the mixer.",
    description:
      "A 42-page PDF tracing every privacy primitive shipping on Solana in 2026 — Umbra, Token-2022 confidential transfers, Arcium, Light Protocol — with hand-drawn flow diagrams, a threat model worksheet, and a checklist for shipping a privacy-preserving consumer app without breaking your stack.",
    price: 19,
    kind: "download",
    format: ["PDF · 42 pages", "Updated April 2026"],
    cover: { fromHue: 38, toHue: 14, glyph: "§" },
    seller: {
      handle: "alice",
      displayName: "Alice Chen",
      vaultPubkey: "9ZxQk5d7m2nVj4uG8fH3rT1pK6Lc9wXaB2zE5sD7yU8v",
      umbraStatus: "active",
    },
    stats: { sold: 247, rating: 4.9 },
  },
  {
    id: "encrypted-receipts-template",
    slug: "encrypted-receipts-template",
    title: "Encrypted Receipts · Notion Template",
    tagline: "Tax-season, but private.",
    description:
      "A drop-in Notion workspace for tracking USDC inflows from your Hush handle without ever pasting an unencrypted amount. Includes a viewing-grant rotation log, a quarterly close checklist, and a single-page accountant brief you can hand to a CPA who has never seen on-chain anything.",
    price: 9,
    kind: "download",
    format: ["Notion duplicate link", "CSV companion"],
    cover: { fromHue: 68, toHue: 38, glyph: "✶" },
    seller: {
      handle: "alice",
      displayName: "Alice Chen",
      vaultPubkey: "9ZxQk5d7m2nVj4uG8fH3rT1pK6Lc9wXaB2zE5sD7yU8v",
      umbraStatus: "active",
    },
    stats: { sold: 88 },
  },
  {
    id: "handle-first-essay",
    slug: "handle-first-essay",
    title: "Handle First — an essay on identity vs. ledger",
    tagline: "Why your wallet should not be your bank statement.",
    description:
      "A long-form piece on the conceptual mistake the on-chain world keeps making: collapsing identity and ledger into the same address. 6,400 words, footnoted, reading time ~28 minutes. Pay what you want above the floor.",
    price: 5,
    kind: "download",
    format: ["EPUB + PDF", "DRM-free"],
    cover: { fromHue: 22, toHue: 84, glyph: "¶" },
    seller: {
      handle: "alice",
      displayName: "Alice Chen",
      vaultPubkey: "9ZxQk5d7m2nVj4uG8fH3rT1pK6Lc9wXaB2zE5sD7yU8v",
      umbraStatus: "active",
    },
    stats: { sold: 1420, rating: 4.8 },
  },
];

export function getProduct(handle: string, id: string): ProductMock | null {
  return (
    PRODUCTS.find(
      (p) => (p.id === id || p.slug === id) && p.seller.handle === handle,
    ) ?? null
  );
}

export function listProducts(): ProductMock[] {
  return PRODUCTS;
}
