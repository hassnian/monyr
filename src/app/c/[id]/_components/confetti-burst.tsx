"use client";

import { useMemo } from "react";

const COLORS = [
  "oklch(0.86 0.13 72)", // primary amber
  "oklch(0.92 0.08 72)", // light amber
  "oklch(0.95 0.03 85)", // cream
  "oklch(0.72 0.16 60)", // deep amber
  "oklch(0.82 0.05 90)", // pale gold
  "oklch(0.96 0.02 100)", // off-white
];

type Particle = {
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  drift: number;
  size: number;
  color: string;
  shape: 0 | 1 | 2;
};

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2.4 + Math.random() * 2.2,
    rotate: Math.random() * 720 - 360,
    drift: Math.random() * 240 - 120,
    size: 5 + Math.random() * 7,
    color: COLORS[i % COLORS.length],
    shape: (i % 3) as 0 | 1 | 2,
  }));
}

/**
 * Pure-CSS confetti burst. Renders ~60 amber/cream particles falling from
 * the top of the viewport with random drift + rotation. Mounts once when the
 * gift is claimed and self-cleans via animation duration.
 */
export function ConfettiBurst() {
  const particles = useMemo(() => makeParticles(64), []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-8vh",
            left: `${p.left}%`,
            width: p.shape === 1 ? p.size * 2.2 : p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === 2 ? "50%" : "1px",
            opacity: 0,
            animation: `confetti-fall ${p.duration}s cubic-bezier(0.18, 0.62, 0.42, 1) forwards`,
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: `${p.drift}px`,
            ["--rotate" as string]: `${p.rotate}deg`,
            boxShadow: "0 0 6px " + p.color.replace(")", " / 0.4)"),
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 0;
          }
          6% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift, 0), 110vh, 0) rotate(var(--rotate, 0));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
