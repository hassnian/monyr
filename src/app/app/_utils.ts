/** Formatting helpers for the dashboard. */

const DAY_MS = 86_400_000;

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export type DateBucket = "today" | "yesterday" | "thisWeek" | "earlier";

export const dateBucketOrder: readonly DateBucket[] = [
  "today",
  "yesterday",
  "thisWeek",
  "earlier",
] as const;

export const dateBucketLabels: Record<DateBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This week",
  earlier: "Earlier",
};

export function dateBucket(iso: string): DateBucket {
  const nowUtcDay = startOfUtcDay(new Date());
  const thenUtcDay = startOfUtcDay(new Date(iso));
  const diffDays = Math.round((nowUtcDay - thenUtcDay) / DAY_MS);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return "thisWeek";
  return "earlier";
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.round(diffDay / 30);
  return `${diffMo}mo ago`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatUSD(amount: number, maximumFractionDigits = 2): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits,
  });
}

export function truncatePubkey(pk: string, head = 4, tail = 4): string {
  if (pk.length <= head + tail + 1) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}
