/**
 * Format an ISO timestamp as "Mon D, YYYY" (e.g. "May 4, 2026").
 * Returns null for missing or unparseable inputs so callers can branch on
 * presence without writing their own guards.
 */
export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
