"use client";

import { useMemo } from "react";
import type { DailyFlow } from "../_data";

type Props = {
  data: DailyFlow[];
  className?: string;
  /** Aspect ratio for the SVG viewBox. */
  height?: number;
};

/**
 * Hand-rolled SVG area chart. No dependency — saves bundle + keeps the visual
 * language cohesive with the rest of the dashboard.
 *
 * Draws a smoothed area with a single amber gradient and a hairline on top.
 * Subtle vertical guide-ticks for the first of each week, rendered via CSS for
 * accessible-by-default fallback.
 */
export function ActivitySpark({ data, className, height = 72 }: Props) {
  const width = 600; // viewBox-only; scales to 100%
  const padY = 6;

  const points = useMemo(() => {
    const max = Math.max(...data.map((d) => d.received), 1);
    const step = width / Math.max(data.length - 1, 1);
    return data.map((d, i) => ({
      x: i * step,
      y: padY + (1 - d.received / max) * (height - padY * 2),
      value: d.received,
      date: d.date,
    }));
  }, [data, height, width]);

  const linePath = useMemo(() => smoothPath(points), [points]);
  const areaPath = useMemo(() => {
    if (!points.length) return "";
    const last = points[points.length - 1];
    const first = points[0];
    return `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;
  }, [linePath, points, height]);

  return (
    <svg
      role="img"
      aria-label="Received amount over the last 30 days"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id="hush-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.11 72)" stopOpacity="0.32" />
          <stop offset="55%" stopColor="oklch(0.82 0.11 72)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="oklch(0.82 0.11 72)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hush-spark-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.82 0.11 72)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="oklch(0.82 0.11 72)" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Baseline hairline */}
      <line
        x1="0"
        x2={width}
        y1={height - 0.5}
        y2={height - 0.5}
        stroke="currentColor"
        className="text-border"
        strokeWidth="1"
      />

      <path d={areaPath} fill="url(#hush-spark-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="url(#hush-spark-line)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Peak marker — the "$750 April 17" spike reads as the climax of the story */}
      {points.length > 0 && (() => {
        const peak = points.reduce((acc, p) => (p.value > acc.value ? p : acc), points[0]);
        if (peak.value === 0) return null;
        return (
          <g>
            <circle cx={peak.x} cy={peak.y} r="3.5" fill="oklch(0.82 0.11 72)" />
            <circle cx={peak.x} cy={peak.y} r="1.5" fill="oklch(0.14 0 0)" />
          </g>
        );
      })()}
    </svg>
  );
}

/** Catmull-Rom → Bezier smoothing for a calmer line. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}
