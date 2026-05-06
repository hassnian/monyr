"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Package,
} from "lucide-react";

import {
  getMyPaymentContexts,
  type PaymentContext,
} from "@/app/actions/payment-contexts";
import { useAuth } from "@/app/contexts/auth-context";
import { useInboxPayments } from "@/app/hooks/useInboxPayments";
import { handleUrl } from "@/lib/brand";
import { AmountDisplay } from "@/components/payments/amount-display";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { formatDateShort } from "../_utils";

import { CreateProductDialog } from "./create-product-dialog";

type StatusFilter = "all" | "live" | "archived";

type ProductCover = { fromHue: number; toHue: number; glyph: string };

type ProductContext = PaymentContext & {
  price: number;
  tagline: string | null;
  cover: ProductCover;
  archived: boolean;
  soldCount: number;
  revenue: number;
};

const DEFAULT_COVER: ProductCover = { fromHue: 38, toHue: 14, glyph: "§" };

function getConfigNumber(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getConfigString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getCover(config: Record<string, unknown>): ProductCover {
  const value = config.cover;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_COVER;
  }
  const cover = value as Record<string, unknown>;
  return {
    fromHue:
      typeof cover.fromHue === "number" ? cover.fromHue : DEFAULT_COVER.fromHue,
    toHue:
      typeof cover.toHue === "number" ? cover.toHue : DEFAULT_COVER.toHue,
    glyph:
      typeof cover.glyph === "string" && cover.glyph.trim()
        ? cover.glyph
        : DEFAULT_COVER.glyph,
  };
}

export function ProductsPane() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: payments = [] } = useInboxPayments();
  const productContextsQueryKey = [
    "payment-contexts",
    "product",
    user?.handle,
  ] as const;

  const { data: contexts = [], isLoading } = useQuery({
    queryKey: productContextsQueryKey,
    queryFn: () => getMyPaymentContexts("product"),
    enabled: Boolean(user),
  });

  const products = useMemo<ProductContext[]>(
    () =>
      contexts.map((context) => {
        const productPayments = payments.filter(
          (payment) => payment.subPath === context.path,
        );
        const revenue = productPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );
        return {
          ...context,
          price: getConfigNumber(context.config, "price"),
          tagline: getConfigString(context.config, "tagline"),
          cover: getCover(context.config),
          archived: context.status === "archived",
          soldCount: productPayments.length,
          revenue,
        };
      }),
    [contexts, payments],
  );

  const live = products.filter((p) => !p.archived);
  const archived = products.filter((p) => p.archived);

  const counts = {
    all: products.length,
    live: live.length,
    archived: archived.length,
  } as const;

  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  const totalSold = products.reduce((sum, p) => sum + p.soldCount, 0);

  const visibleProducts =
    filter === "live"
      ? live
      : filter === "archived"
        ? archived
        : products;

  const handle = user?.handle ?? "";

  return (
    <>
      <div className="flex flex-col gap-6">
        <Header
          totalRevenue={totalRevenue}
          totalSold={totalSold}
          productCount={products.length}
          loading={isLoading}
          onCreate={() => setOpen(true)}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "live", "archived"] as const).map((opt) => {
            const selected = filter === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                aria-pressed={selected}
                disabled={isLoading}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium capitalize transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-70",
                  selected
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-surface-raised/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {opt}
                {isLoading ? (
                  <Skeleton className="h-3 w-3 rounded bg-muted/60" />
                ) : (
                  <span
                    className={cn(
                      "rounded px-1 font-mono tabular text-[11px]",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-border/40 text-muted-foreground/70",
                    )}
                  >
                    {counts[opt]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <ProductsSkeleton />
        ) : products.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : visibleProducts.length === 0 ? (
          <FilteredEmptyState filter={filter} />
        ) : (
          <ol
            aria-label="Products"
            className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60"
          >
            {visibleProducts.map((product) => (
              <li key={product.id}>
                <ProductRow product={product} handle={handle} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <CreateProductDialog
        open={open}
        onOpenChange={setOpen}
        handle={handle}
        onCreated={(context) => {
          queryClient.setQueryData<PaymentContext[]>(
            productContextsQueryKey,
            (current = []) => {
              if (current.some((item) => item.id === context.id)) return current;
              return [...current, context];
            },
          );
          void queryClient.invalidateQueries({
            queryKey: productContextsQueryKey,
          });
        }}
      />
    </>
  );
}

function Header({
  totalRevenue,
  totalSold,
  productCount,
  loading,
  onCreate,
}: {
  totalRevenue: number;
  totalSold: number;
  productCount: number;
  loading?: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl space-y-1">
        <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
          Products
        </h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground/80">
          Fixed-price digital goods. Buyers pay, you ship — no email, no
          Stripe.
        </p>
      </div>

      <div className="flex items-stretch gap-2">
        <Stat
          label="Revenue"
          amount={totalRevenue}
          count={totalSold}
          loading={loading}
          highlight
        />
        <Stat label="Listed" count={productCount} loading={loading} />
        <button
          type="button"
          onClick={onCreate}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground",
            "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
            "transition-all hover:bg-primary/90 active:translate-y-px",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <Package className="size-3.5" strokeWidth={2.25} />
          New product
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  amount,
  count,
  highlight,
  loading,
}: {
  label: string;
  amount?: number;
  count: number;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border px-3 py-1.5 min-w-[120px]",
        highlight
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-border bg-surface-raised/30",
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/85">
        {label}
      </span>
      <div className="flex items-baseline justify-between gap-2">
        {loading ? (
          <Skeleton
            className={cn(
              "bg-muted/60",
              amount !== undefined ? "h-3.5 w-14" : "h-4 w-8",
            )}
          />
        ) : amount !== undefined ? (
          <AmountDisplay
            amount={amount}
            size="sm"
            className="text-foreground"
          />
        ) : (
          <span className="font-mono tabular text-base text-foreground">
            {count}
          </span>
        )}
        {amount !== undefined &&
          (loading ? (
            <Skeleton className="h-2.5 w-4 bg-muted/60" />
          ) : (
            <span className="font-mono tabular text-[10.5px] text-muted-foreground/70">
              {count}
            </span>
          ))}
      </div>
    </div>
  );
}

function CoverThumb({
  cover,
  className,
  glyphSize = "1.6rem",
}: {
  cover: ProductCover;
  className?: string;
  glyphSize?: string;
}) {
  const angle = (cover.fromHue + cover.toHue) % 360;
  const from = `oklch(0.66 0.14 ${cover.fromHue})`;
  const to = `oklch(0.42 0.13 ${cover.toHue})`;
  return (
    <div
      aria-hidden
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg ring-1 ring-black/30",
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
        className="absolute inset-0 grid place-items-center font-serif select-none"
        style={{
          fontSize: glyphSize,
          color: "#F4EBD9",
          opacity: 0.85,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textShadow: "0 2px 12px rgba(0,0,0,0.25)",
        }}
      >
        {cover.glyph || "§"}
      </span>
    </div>
  );
}

function ProductRow({
  product,
  handle,
}: {
  product: ProductContext;
  handle: string;
}) {
  const url = handleUrl(handle, product.path);
  const archived = product.archived;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    try {
      navigator.clipboard?.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised/30",
        archived && "opacity-70",
      )}
    >
      <CoverThumb cover={product.cover} className="size-12" />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-serif text-[16px] leading-tight tracking-tight text-foreground">
            {product.title}
          </h4>
          {archived ? (
            <span className="inline-flex shrink-0 items-center rounded-sm bg-border/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Archived
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-success/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
              <span
                aria-hidden
                className="size-1 rounded-full bg-success"
              />
              Live
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground/75">
          <span className="truncate font-mono tabular">{url}</span>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded text-muted-foreground/60 transition-colors",
              "hover:bg-surface-raised hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
            aria-label="Copy URL"
          >
            {copied ? (
              <Check className="size-3 text-success" strokeWidth={2.5} />
            ) : (
              <Copy className="size-3" strokeWidth={2} />
            )}
          </button>
          <a
            href={`https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded text-muted-foreground/60 transition-colors",
              "hover:bg-surface-raised hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
            aria-label="Open product page"
          >
            <ExternalLink className="size-3" strokeWidth={2} />
          </a>
        </div>
        {product.tagline && (
          <p className="mt-1 truncate font-serif text-[13px] italic text-muted-foreground/70">
            “{product.tagline}”
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <AmountDisplay
          amount={product.price}
          size="md"
          className="text-foreground"
        />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          {product.soldCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span className="font-mono tabular text-foreground/85">
                {product.soldCount}
              </span>
              <span className="uppercase tracking-wider text-[10px] text-muted-foreground/55">
                sold
              </span>
              <span aria-hidden className="text-muted-foreground/30">·</span>
              <AmountDisplay
                amount={product.revenue}
                size="sm"
                className="text-[11px] text-muted-foreground/80"
              />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground/55">
              <span className="uppercase tracking-wider text-[10px]">
                Listed
              </span>
              <span className="font-mono tabular">
                {formatDateShort(product.createdAt.toISOString())}
              </span>
            </span>
          )}
          <button
            type="button"
            aria-label="Product actions"
            className={cn(
              "grid size-6 place-items-center rounded-md text-muted-foreground/70 transition-colors",
              "hover:bg-surface-raised hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <ol
      aria-hidden
      className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60"
    >
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <ProductRowSkeleton />
        </li>
      ))}
    </ol>
  );
}

function ProductRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4">
      <Skeleton className="size-12 rounded-lg bg-muted/60" />
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-44 bg-muted/60" />
          <Skeleton className="h-3.5 w-12 rounded-sm bg-muted/50" />
        </div>
        <Skeleton className="h-3 w-56 bg-muted/50" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4 w-20 bg-muted/60" />
        <Skeleton className="h-3 w-32 bg-muted/50" />
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-raised/15 px-6 py-14 text-center">
      <Package className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="font-serif text-xl italic text-foreground/80">
        No products yet.
      </p>
      <p className="max-w-md text-[13px] text-muted-foreground/70">
        Sell a download or license at a fixed price. Share the link — buyers pay
        in USDC and unlock the file.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground",
          "ring-1 ring-primary/30 shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
          "transition-all hover:bg-primary/90 active:translate-y-px",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <Package className="size-3.5" strokeWidth={2.25} />
        New product
      </button>
    </div>
  );
}

function FilteredEmptyState({ filter }: { filter: StatusFilter }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/15 px-6 py-12 text-center">
      <p className="font-serif text-lg italic text-foreground/75">
        Nothing in this view.
      </p>
      <p className="max-w-md text-[12.5px] text-muted-foreground/70">
        {filter === "live"
          ? "No live products. Publish one to start selling."
          : "No archived products yet."}
      </p>
    </div>
  );
}
