"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Link2,
  Loader2,
  Package,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AmountDisplay } from "@/components/payments/amount-display";
import { AmountInput } from "@/components/payments/amount-input";
import { HandleText } from "@/components/payments/handle-text";
import { handleUrl } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
};

type Phase = "form" | "creating" | "done";

const SLUG_RE = /[^a-z0-9-]/g;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(SLUG_RE, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

// Eight candlelight-adjacent palettes. Picked deterministically so each
// product gets a unique-looking cover without asking the seller to choose.
const COVER_PALETTES = [
  { fromHue: 38, toHue: 14 },
  { fromHue: 140, toHue: 95 },
  { fromHue: 280, toHue: 320 },
  { fromHue: 220, toHue: 200 },
  { fromHue: 18, toHue: 350 },
  { fromHue: 180, toHue: 220 },
  { fromHue: 50, toHue: 30 },
  { fromHue: 320, toHue: 280 },
] as const;

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function autoCover(handle: string, slug: string) {
  const seed = `${handle}/${slug || "_"}`;
  const palette = COVER_PALETTES[hashString(seed) % COVER_PALETTES.length]!;
  return palette;
}

function autoGlyph(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return "§";
  // First non-whitespace codepoint, uppercased.
  const first = Array.from(trimmed)[0] ?? "§";
  return first.toUpperCase();
}

function coverGradient(fromHue: number, toHue: number) {
  const angle = (fromHue + toHue) % 360;
  const from = `oklch(0.66 0.14 ${fromHue})`;
  const to = `oklch(0.42 0.13 ${toHue})`;
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
}

export function CreateProductDialog({ open, onOpenChange, handle }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("form");
        setTitle("");
        setPrice("");
        setDownloadUrl("");
        setTagline("");
        setDescription("");
        setCustomSlug("");
        setSlugTouched(false);
        setMoreOpen(false);
        setCopied(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const slug = slugTouched ? customSlug : slugify(title);
  const previewSlug = slug || "your-product";
  const previewUrl = handleUrl(handle, `product/${previewSlug}`);

  const numericPrice = useMemo(() => {
    const n = parseFloat(price);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [price]);

  const cover = useMemo(() => autoCover(handle, slug), [handle, slug]);
  const glyph = useMemo(() => autoGlyph(title), [title]);

  const canSubmit =
    phase === "form" &&
    title.trim().length > 0 &&
    slug.length > 0 &&
    numericPrice !== null &&
    downloadUrl.trim().length > 0;

  async function handleCreate() {
    if (!canSubmit) return;
    setPhase("creating");
    // Mock — server action not wired yet.
    await new Promise((r) => setTimeout(r, 900));
    setPhase("done");
  }

  function handleCopy() {
    try {
      navigator.clipboard?.writeText(`https://${previewUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[480px] gap-0 overflow-hidden border border-border-strong/60 bg-popover p-0",
          "shadow-2xl shadow-black/50",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -top-16 h-56 -z-10 blur-3xl opacity-80"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, oklch(0.82 0.11 72 / 0.18), transparent 70%)",
          }}
        />

        <div className="flex max-h-[88vh] flex-col gap-6 overflow-y-auto px-7 pb-7 pt-9">
          <div className="flex flex-col items-center gap-3 text-center">
            {phase === "done" ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/15 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-primary">
                <Check className="size-3" strokeWidth={2.5} />
                Product live
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">
                <Package className="size-3 text-primary" strokeWidth={2.25} />
                New product
              </span>
            )}
            <DialogTitle className="font-serif text-[26px] leading-[1.05] tracking-tight text-foreground">
              {phase === "done"
                ? "Product is live."
                : "Sell something private."}
            </DialogTitle>
            <DialogDescription className="max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">
              {phase === "done"
                ? "Share the link. Buyers pay in USDC; the file unlocks on confirmation. Sales settle privately."
                : "Fixed-price digital good. Buyers pay, you ship — no email, no Stripe."}
            </DialogDescription>
          </div>

          {phase === "done" ? (
            <DonePanel
              previewUrl={previewUrl}
              title={title.trim()}
              price={numericPrice ?? 0}
              cover={cover}
              glyph={glyph}
              copied={copied}
              onCopy={handleCopy}
            />
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <Field label="Title" htmlFor="product-title">
                <Input
                  id="product-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                  placeholder="The Solana Privacy Report"
                  className="h-10 px-3 text-sm"
                  autoFocus
                />
              </Field>

              <AmountInput
                variant="visitor"
                id="product-price"
                label="Price"
                hint="What buyers pay in USDC."
                value={price}
                onValueChange={setPrice}
              />

              <Field
                label="Download URL"
                htmlFor="product-download-url"
                hint="Where buyers are sent."
              >
                <div
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg border border-input bg-transparent px-3 transition-colors",
                    "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                    "dark:bg-input/30",
                  )}
                >
                  <Link2
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted-foreground/70"
                    strokeWidth={2}
                  />
                  <input
                    id="product-download-url"
                    value={downloadUrl}
                    onChange={(e) =>
                      setDownloadUrl(e.target.value.slice(0, 500))
                    }
                    placeholder="https://drive.google.com/…"
                    type="url"
                    className={cn(
                      "h-full min-w-0 flex-1 bg-transparent font-mono tabular text-[13px] text-foreground outline-none",
                      "placeholder:text-muted-foreground/45",
                    )}
                  />
                </div>
              </Field>

              <MoreDetailsToggle
                open={moreOpen}
                onToggle={() => setMoreOpen((v) => !v)}
              />

              {moreOpen && (
                <div className="flex flex-col gap-4 border-l border-border/70 pl-4">
                  <Field
                    label="Tagline"
                    htmlFor="product-tagline"
                    hint="Italic, on the page."
                  >
                    <Input
                      id="product-tagline"
                      value={tagline}
                      onChange={(e) =>
                        setTagline(e.target.value.slice(0, 120))
                      }
                      placeholder="A field guide to private payments on-chain."
                      className="h-10 px-3 text-sm"
                    />
                  </Field>

                  <Field
                    label="Description"
                    htmlFor="product-description"
                    hint="What the buyer gets."
                  >
                    <Textarea
                      id="product-description"
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value.slice(0, 600))
                      }
                      placeholder="80-page PDF + EPUB. Stealth addresses, mixers, vaults — what actually leaks on Solana."
                      rows={3}
                      className="resize-none px-3 py-2 text-sm"
                    />
                  </Field>

                  <Field label="URL slug" htmlFor="product-slug">
                    <div
                      className={cn(
                        "flex h-10 items-center gap-1 rounded-lg border border-input bg-transparent px-3 transition-colors",
                        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                        "dark:bg-input/30",
                      )}
                    >
                      <HandleText
                        handle={handle}
                        size="sm"
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="text-muted-foreground/50">
                        /product/
                      </span>
                      <input
                        id="product-slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setCustomSlug(slugify(e.target.value));
                        }}
                        placeholder="privacy-report"
                        className={cn(
                          "h-full min-w-0 flex-1 bg-transparent font-mono tabular text-sm text-foreground outline-none",
                          "placeholder:text-muted-foreground/50",
                        )}
                      />
                    </div>
                  </Field>
                </div>
              )}

              <PreviewCard
                title={title.trim()}
                tagline={tagline.trim()}
                price={numericPrice}
                url={previewUrl}
                cover={cover}
                glyph={glyph}
              />

              <Button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90",
                  "ring-1 ring-primary/30 transition-all active:translate-y-px",
                  "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
                  "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
                  "disabled:opacity-60",
                )}
              >
                {phase === "creating" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  "Publish product"
                )}
              </Button>

              <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground/65">
                Mock preview · publish flow isn&apos;t wired yet.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/85"
        >
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-muted-foreground/60">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function MoreDetailsToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "group/more flex w-full items-center justify-between rounded-lg border border-dashed border-border/60 bg-transparent px-3 py-2 text-left transition-colors",
        "hover:border-border-strong/60 hover:bg-surface-raised/30",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-foreground">
          {open ? "Less" : "More details"}
        </span>
        <span className="text-[11px] text-muted-foreground/70">
          Tagline, description, custom slug
        </span>
      </span>
      <ChevronDown
        aria-hidden
        className={cn(
          "size-4 text-muted-foreground/70 transition-transform",
          open && "rotate-180",
        )}
        strokeWidth={2}
      />
    </button>
  );
}

function CoverArt({
  cover,
  glyph,
  className,
  glyphSize = "clamp(2rem, 8vw, 3.5rem)",
}: {
  cover: { fromHue: number; toHue: number };
  glyph: string;
  className?: string;
  glyphSize?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-lg ring-1 ring-black/30",
        className,
      )}
      style={{ background: coverGradient(cover.fromHue, cover.toHue) }}
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
        className="absolute inset-0 grid place-items-center font-serif select-none"
        style={{
          fontSize: glyphSize,
          color: "#F4EBD9",
          opacity: 0.82,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          textShadow: "0 2px 18px rgba(0,0,0,0.25)",
        }}
      >
        {glyph || "§"}
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

function PreviewCard({
  title,
  tagline,
  price,
  url,
  cover,
  glyph,
}: {
  title: string;
  tagline: string;
  price: number | null;
  url: string;
  cover: { fromHue: number; toHue: number };
  glyph: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 ring-1 ring-primary/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85">
          Preview
        </span>
        <span className="text-[11px] text-muted-foreground/60">
          What buyers see
        </span>
      </div>

      <CoverArt cover={cover} glyph={glyph} className="aspect-[5/2] w-full" />

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[18px] leading-tight tracking-tight text-foreground">
            {title || (
              <span className="text-muted-foreground/45">Product title</span>
            )}
          </p>
          {tagline ? (
            <p className="mt-0.5 truncate font-serif text-[12.5px] italic leading-snug text-muted-foreground/85">
              {tagline}
            </p>
          ) : (
            <p className="mt-0.5 truncate font-mono tabular text-[11px] text-muted-foreground/55">
              {url}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {price !== null ? (
            <AmountDisplay amount={price} size="lg" />
          ) : (
            <span className="font-mono tabular text-[18px] text-muted-foreground/40">
              0.00 <span className="text-[10.5px] uppercase">USDC</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DonePanel({
  previewUrl,
  title,
  price,
  cover,
  glyph,
  copied,
  onCopy,
}: {
  previewUrl: string;
  title: string;
  price: number;
  cover: { fromHue: number; toHue: number };
  glyph: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-5 ring-1 ring-primary/15">
        <div className="flex items-stretch gap-4">
          <CoverArt
            cover={cover}
            glyph={glyph}
            className="size-20 shrink-0"
            glyphSize="2.4rem"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/85">
                Download
              </p>
              <h4 className="mt-1 truncate font-serif text-[22px] leading-tight tracking-tight text-foreground">
                {title}
              </h4>
            </div>
            <div className="mt-1">
              <AmountDisplay amount={price} size="md" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onCopy}
          autoFocus
          className={cn(
            "mt-4 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            copied
              ? "border-success/45 bg-success/[0.06]"
              : "border-border-strong/50 bg-surface-raised/60 hover:border-primary/45 hover:bg-surface-raised/80",
          )}
        >
          <span className="truncate font-mono tabular text-[12px] text-foreground">
            {previewUrl}
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium",
              copied ? "text-success" : "text-primary",
            )}
          >
            {copied ? (
              <>
                <Check className="size-3.5" strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" strokeWidth={2} />
                Copy link
              </>
            )}
          </span>
        </button>
      </div>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground/80">
        Mock preview · sales settle privately on launch.
      </p>
    </div>
  );
}
