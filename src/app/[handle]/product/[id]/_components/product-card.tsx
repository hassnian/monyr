"use client";

import { useState } from "react";
import { Download, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/payments/gradient-avatar";
import { HandleText } from "@/components/payments/handle-text";
import { AmountDisplay } from "@/components/payments/amount-display";
import { cn } from "@/lib/utils";
import { ProductCover } from "./product-cover";
import type { ProductMock } from "../_data";

const KIND_COPY: Record<ProductMock["kind"], { label: string; cta: string }> = {
  download: { label: "Digital download", cta: "Buy & download" },
  license: { label: "License", cta: "Buy license" },
  access: { label: "Access pass", cta: "Buy access" },
};

export function ProductCard({ product }: { product: ProductMock }) {
  const [pending, setPending] = useState(false);
  const kindCopy = KIND_COPY[product.kind];
  const isUmbraActive = product.seller.umbraStatus === "active";

  function onBuy() {
    setPending(true);
    window.setTimeout(() => setPending(false), 1100);
  }

  return (
    <section
      aria-labelledby="product-title"
      className="relative w-full max-w-4xl"
    >
      {/* Soft amber glow behind the card — same candlelight as the profile. */}
      <div
        aria-hidden
        className="absolute -inset-x-6 -inset-y-10 -z-10 blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 20%, oklch(0.82 0.11 72 / 0.15), transparent 70%)",
        }}
      />

      <div className="relative rounded-2xl border border-border bg-card p-5 md:p-7">
        {/* Banner cover */}
        <ProductCover
          fromHue={product.cover.fromHue}
          toHue={product.cover.toHue}
          glyph={product.cover.glyph}
        />

        {/* 2-col below cover. On mobile the buy panel comes BEFORE description
            (order-1 / order-2) so the CTA is above-the-fold after the banner. */}
        <div className="mt-6 grid gap-7 md:grid-cols-[minmax(0,1fr)_340px] md:gap-8">
          {/* ── Left: copy ─────────────────────────────────────────── */}
          <div className="order-2 md:order-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-primary">
                <Download className="size-3" />
                {kindCopy.label}
              </span>
              {product.stats.rating !== undefined ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Star
                    className="size-3 text-primary fill-primary"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono tabular text-foreground/90">
                    {product.stats.rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground/70">
                    · {product.stats.sold.toLocaleString()} sold
                  </span>
                </span>
              ) : (
                product.stats.sold > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {product.stats.sold.toLocaleString()} sold
                  </span>
                )
              )}
            </div>

            <h1
              id="product-title"
              className="mt-3 font-serif text-3xl md:text-[2.4rem] leading-[1.05] tracking-tight text-foreground"
            >
              {product.title}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground/90 italic font-serif">
              {product.tagline}
            </p>

            <a
              href={`/@${product.seller.handle}`}
              className="mt-4 inline-flex w-fit items-center gap-2.5 rounded-full border border-border bg-secondary/40 py-1 pl-1 pr-3 transition-colors hover:border-border-strong hover:bg-secondary/70"
            >
              <GradientAvatar handle={product.seller.handle} size={26} />
              <span className="flex items-baseline gap-1.5">
                <span className="text-[13px] text-muted-foreground">by</span>
                <HandleText
                  handle={product.seller.handle}
                  size="sm"
                  className="text-foreground"
                />
              </span>
            </a>

            <div className="my-6 h-px w-full bg-border" />

            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            {product.format.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {product.format.map((line) => (
                  <li
                    key={line}
                    className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Right: sticky buy rail (flat — no inner card) ──────── */}
          <aside className="order-1 md:order-2">
            <div className="md:sticky md:top-6">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Price
                </span>
                <span className="text-[11px] text-muted-foreground/70">
                  USDC · Solana
                </span>
              </div>
              <div className="mt-3 pb-1">
                <AmountDisplay amount={product.price} size="xl" />
              </div>

              {/* Hairline above the CTA — separates price from action without
                  re-introducing an inner card. */}
              <div className="mt-5 h-px w-full bg-border" />

              <Button
                type="button"
                onClick={onBuy}
                disabled={pending}
                className={cn(
                  "mt-5 h-12 w-full rounded-xl text-base font-semibold",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
                  "transition-all",
                )}
              >
                {pending ? "Preparing checkout…" : kindCopy.cta}
              </Button>

              {isUmbraActive && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground/85">
                  <Lock className="size-3" strokeWidth={2} />
                  Encrypted via Umbra
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
