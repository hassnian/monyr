import { notFound } from "next/navigation";
import Link from "next/link";

import { getHandle } from "@/app/actions/handles";
import { getPublicPaymentContext } from "@/app/actions/payment-contexts";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";
import { PageFrame } from "@/components/payments/page-frame";
import { ProfileCard } from "../_components/profile-card";

type Params = { handle: string; path: string[] };

export default async function HandleContextPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle: raw, path } = await params;
  const handle = decodeURIComponent(raw);

  if (!handle.startsWith("@")) notFound();
  const bare = handle.slice(1);
  if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(bare)) notFound();

  const subPath = path.map(decodeURIComponent).join("/");
  if (!subPath) notFound();

  const [profile, context] = await Promise.all([
    getHandle(bare),
    getPublicPaymentContext({ handle: bare, path: subPath }),
  ]);

  if (!profile || !context || context.kind !== "label") notFound();

  return (
    <PageFrame glow topRight={<WalletConnectButton />}>
      <ProfileCard
        handle={profile.handle}
        displayName={profile.displayName}
        vaultPubkey={profile.vaultPubkey}
        umbraStatus={profile.umbraStatus}
        receiptEncryptionPublicKey={profile.receiptEncryptionPublicKey}
        bio={profile.bio}
        subPath={context.path}
        variant={{ kind: "label", label: context.title }}
      />
      <FooterNote />
    </PageFrame>
  );
}

function FooterNote() {
  return (
    <p className="relative z-10 mt-8 text-center text-[11px] text-muted-foreground/80 max-w-sm">
      Want your own payment profile?{" "}
      <Link
        href="/claim"
        className="text-foreground/90 underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
      >
        Claim your handle
      </Link>
    </p>
  );
}
