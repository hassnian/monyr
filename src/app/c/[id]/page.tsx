import Link from "next/link";
import { notFound } from "next/navigation";
import { PageFrame } from "@/components/payments/page-frame";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";
import { ClaimCard } from "./_components/claim-card";
import { getClaimable } from "./_data";

type Params = { id: string };

/**
 * Public claim surface — V1 bearer link landing.
 *
 * URL: /c/<id>
 *
 * Anyone with the URL can claim. The amount, memo, and sender (if any) are
 * mocked deterministically from the id so different links feel different.
 */
export default async function ClaimablePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  const link = getClaimable(id);
  if (!link) notFound();

  return (
    <PageFrame glow topRight={<WalletConnectButton />}>
      <ClaimCard link={link} />
      <FooterNote />
    </PageFrame>
  );
}

function FooterNote() {
  return (
    <p className="relative z-10 mt-10 text-center text-[11px] text-muted-foreground/80 max-w-md">
      Want to send one of these?{" "}
      <Link
        href="/app"
        className="text-foreground/90 underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
      >
        Mint a private link
      </Link>
      .
    </p>
  );
}
