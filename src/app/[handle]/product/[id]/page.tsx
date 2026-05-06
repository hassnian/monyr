import Link from "next/link";
import { notFound } from "next/navigation";

import { getHandle } from "@/app/actions/handles";
import { getPublicPaymentContext } from "@/app/actions/payment-contexts";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";
import { PageFrame } from "@/components/payments/page-frame";
import { ProductCard, type ProductPageProduct } from "./_components/product-card";

type Params = { handle: string; id: string };

function getConfigNumber(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getConfigString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getConfigStringArray(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function getProductKind(config: Record<string, unknown>): ProductPageProduct["kind"] {
  const value = config.productKind;
  return value === "license" || value === "access" || value === "download"
    ? value
    : "download";
}

function getCover(config: Record<string, unknown>) {
  const value = config.cover;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { fromHue: 38, toHue: 14, glyph: "§" };
  }

  const cover = value as Record<string, unknown>;
  return {
    fromHue: typeof cover.fromHue === "number" ? cover.fromHue : 38,
    toHue: typeof cover.toHue === "number" ? cover.toHue : 14,
    glyph: typeof cover.glyph === "string" ? cover.glyph : "§",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle: rawHandle, id: rawId } = await params;
  const handle = decodeURIComponent(rawHandle);
  const id = decodeURIComponent(rawId);

  if (!handle.startsWith("@")) notFound();
  const bare = handle.slice(1);
  if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(bare)) notFound();
  if (!/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(id)) notFound();

  const path = `product/${id}`;
  const [profile, context] = await Promise.all([
    getHandle(bare),
    getPublicPaymentContext({ handle: bare, path }),
  ]);

  if (!profile || !context || context.kind !== "product") notFound();

  const price = getConfigNumber(context.config, "price");
  const downloadUrl = getConfigString(context.config, "downloadUrl");
  if (price === null || price <= 0 || !downloadUrl) notFound();

  const product: ProductPageProduct = {
    id,
    slug: id,
    path: context.path,
    title: context.title,
    tagline: getConfigString(context.config, "tagline") ?? "Private digital product.",
    description: getConfigString(context.config, "description") ?? "Pay privately to unlock this download.",
    price,
    kind: getProductKind(context.config),
    format: getConfigStringArray(context.config, "format"),
    cover: getCover(context.config),
    seller: {
      handle: profile.handle,
      displayName: profile.displayName ?? profile.handle,
      vaultPubkey: profile.vaultPubkey,
      umbraStatus: profile.umbraStatus,
      receiptEncryptionPublicKey: profile.receiptEncryptionPublicKey,
    },
    stats: { sold: 0 },
  };

  return (
    <PageFrame glow topRight={<WalletConnectButton />}>
      <ProductCard product={product} />
      <FooterNote handle={product.seller.handle} />
    </PageFrame>
  );
}

function FooterNote({ handle }: { handle: string }) {
  return (
    <p className="relative z-10 mt-8 text-center text-[11px] text-muted-foreground/80 max-w-md">
      Sold privately by{" "}
      <Link
        href={`/@${handle}`}
        className="text-foreground/90 underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
      >
        @{handle}
      </Link>
      . Want to sell yours?{" "}
      <Link
        href="/claim"
        className="text-foreground/90 underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
      >
        Claim your handle
      </Link>
      .
    </p>
  );
}
