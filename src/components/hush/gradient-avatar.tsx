import { cn } from "@/lib/utils";

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const WARM_HUES = [22, 38, 52, 68, 84, 14, 4, 340];

function gradientFor(handle: string) {
  const seed = hashString(handle.toLowerCase());
  const h1 = WARM_HUES[seed % WARM_HUES.length];
  const h2 = WARM_HUES[(seed >> 4) % WARM_HUES.length];
  const l1 = 0.62 + ((seed >> 8) & 0x07) * 0.02;
  const l2 = 0.42 + ((seed >> 12) & 0x07) * 0.02;
  return {
    from: `oklch(${l1.toFixed(2)} 0.14 ${h1})`,
    to: `oklch(${l2.toFixed(2)} 0.13 ${h2})`,
    angle: (seed >> 16) % 360,
  };
}

type Props = {
  handle: string;
  size?: number;
  className?: string;
};

export function GradientAvatar({ handle, size = 80, className }: Props) {
  const letter = handle.replace(/^@/, "").charAt(0).toUpperCase() || "·";
  const { from, to, angle } = gradientFor(handle);

  return (
    <div
      role="img"
      aria-label={`Avatar for ${handle}`}
      className={cn(
        "relative flex items-center justify-center rounded-full ring-1 ring-black/20 overflow-hidden shrink-0",
        className
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      <span
        aria-hidden
        className="font-serif leading-none select-none"
        style={{
          fontSize: size * 0.45,
          color: "#F4EBD9",
          opacity: 0.72,
          letterSpacing: "-0.02em",
        }}
      >
        {letter}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(120% 80% at 30% 20%, rgba(255,255,255,0.22), transparent 50%)",
        }}
      />
    </div>
  );
}
