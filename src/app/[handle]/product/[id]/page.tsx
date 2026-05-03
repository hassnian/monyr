import Link from "next/link";
import { notFound } from "next/navigation";
import { PageFrame } from "@/components/payments/page-frame";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";
import { ProductCard } from "./_components/product-card";
import { getProduct } from "./_data";

type Params = { handle: string; id: string };

/**
 * Public product page — V1.5 paid-resource surface, mocked.
 *
 * URL: /@<handle>/product/<id>
 *
 * Mirrors the handle-first URL shape: a product is just another sub-path
 * on a seller's handle. Buy is a no-op for now.
 */
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

  const product = getProduct(bare, id);
  if (!product) notFound();

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
