import { notFound } from "next/navigation";
import Link from "next/link";
import { PageFrame } from "@/components/payments/page-frame";
import { ProfileCard } from "../../_components/profile-card";
import { getHandle } from "@/app/actions/handles";

type Params = { handle: string; id: string };

export default async function HandleInvoicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  // const { isPending, error, data } = useQuery({
  //   queryKey: ["repoData"],
  //   queryFn: () =>
  //     fetch("https://api.github.com/repos/TanStack/query").then((res) =>
  //       res.json(),
  //     ),
  // });

  const { handle: raw, id } = await params;
  const handle = decodeURIComponent(raw);

  if (!handle.startsWith("@")) notFound();
  const bare = handle.slice(1);
  if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(bare)) notFound();
  if (!/^[a-z0-9]{4,16}$/i.test(id)) notFound();

  const profile = await getHandle(bare)

  if (!profile) notFound()

  // const invoice = getMockInvoice(id);
  //

  const variant = { kind: 'tipjar' } as const

  return (
    <PageFrame glow>
      <ProfileCard
        handle={profile.handle}
        displayName={profile.displayName}
        vaultPubkey={profile.vaultPubkey}
        umbraStatus={profile.umbraStatus as "inactive" | "activating" | "active" | "failed"}
        bio={profile.bio}
        variant={variant}
        // subPath={`invoice/${invoice.id}`}
        // variant={{
        //   kind: "invoice",
        //   invoiceId: invoice.id,
        //   amount: invoice.amount,
        //   memoTemplate: invoice.memo,
        //   dueAt: invoice.dueAt,
        // }}
      />
      <p className="relative z-10 mt-8 text-center text-[11px] text-muted-foreground/80 max-w-sm">
        This invoice is private. Only {profile.handle} will see the amount.{" "}
        <Link
          href="/claim"
          className="text-foreground/90 underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
        >
          Send invoices yourself
        </Link>
        .
      </p>
    </PageFrame>
  );
}
