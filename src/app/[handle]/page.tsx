import { notFound } from "next/navigation";
import Link from "next/link";
import { PageFrame } from "@/components/payments/page-frame";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";
import { ProfileCard } from "./_components/profile-card";
import { getHandle } from "../actions/handles";

type Params = { handle: string };

/**
 * Public profile page.
 *
 * URL shapes:
 *   /@alice           → tipjar profile (any amount)
 *   /@alice/acme      → same handle, labeled sub-path (context "acme")
 *
 * The `@` prefix is required — anything else 404s so the handle namespace
 * stays clean and the URL reads as a brand primitive.
 */
export default async function HandleProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw);

  if (!handle.startsWith("@")) notFound();
  const bare = handle.slice(1);
  if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(bare)) notFound();

  const profile = await getHandle(bare)

  if (!profile) return notFound()

  return (
    <PageFrame glow topRight={<WalletConnectButton />}>
      <ProfileCard
        handle={profile.handle}
        displayName={profile.displayName}
        vaultPubkey={profile.vaultPubkey}
        umbraStatus={profile.umbraStatus as "inactive" | "activating" | "active" | "failed"}
        bio={profile.bio}
        variant={{ kind: "tipjar" }}
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
