import { cn } from "@/lib/utils";

type Props = {
  fromHue: number;
  toHue: number;
  glyph: string;
  className?: string;
};

/**
 * Banner-style cover that sits across the top of the product card.
 * Wide aspect (5/2) so the page doesn't go tower-shaped on desktop.
 */
export function ProductCover({ fromHue, toHue, glyph, className }: Props) {
  const angle = (fromHue + toHue) % 360;
  const from = `oklch(0.66 0.14 ${fromHue})`;
  const to = `oklch(0.42 0.13 ${toHue})`;

  return (
    <div
      role="img"
      aria-label="Product cover"
      className={cn(
        "relative aspect-[5/2] w-full overflow-hidden rounded-xl ring-1 ring-black/30",
        className,
      )}
      style={{
        background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 25% 15%, rgba(255,255,255,0.22), transparent 55%)",
        }}
      />

      <span
        aria-hidden
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center font-serif select-none"
        style={{
          fontSize: "clamp(5rem, 14vw, 9rem)",
          color: "#F4EBD9",
          opacity: 0.78,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          textShadow: "0 2px 24px rgba(0,0,0,0.25)",
        }}
      >
        {glyph}
      </span>

      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(0,0,0,0.28))",
        }}
      />
    </div>
  );
}
