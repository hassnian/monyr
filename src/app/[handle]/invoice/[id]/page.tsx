import { notFound } from "next/navigation";
import Link from "next/link";

import { getHandle } from "@/app/actions/handles";
import { getPublicPaymentContext } from "@/app/actions/payment-contexts";
import { PageFrame } from "@/components/payments/page-frame";
import { ProfileCard } from "../../_components/profile-card";
import { InvoiceTerminalCard } from "../../_components/invoice-terminal-card";

type Params = { handle: string; id: string };

function getConfigNumber(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getConfigString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" ? value : "";
}

function isExpired(expiresAt: string) {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export default async function HandleInvoicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle: raw, id } = await params;
  const handle = decodeURIComponent(raw);

  if (!handle.startsWith("@")) notFound();
  const bare = handle.slice(1);
  if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(bare)) notFound();
  if (!/^[a-z0-9](?:[a-z0-9-]{2,14}[a-z0-9])$/i.test(id)) notFound();

  const [profile, context] = await Promise.all([
    getHandle(bare),
    getPublicPaymentContext({
      handle: bare,
      path: `invoice/${id}`,
      includeStatuses: ["active", "paid", "expired"],
    }),
  ]);

  if (!profile || !context || context.kind !== "invoice") notFound();

  const amount = getConfigNumber(context.config, "amount");
  if (amount === null || amount <= 0) notFound();

  const expiresAtRaw = getConfigString(context.config, "expiresAt");
  const memo = getConfigString(context.config, "memo");
  const isPaid = context.status === "paid";
  const isExpiredState =
    context.status === "expired" || (!isPaid && isExpired(expiresAtRaw));

  if (isPaid || isExpiredState) {
    return (
      <PageFrame glow={isPaid}>
        <InvoiceTerminalCard
          state={isPaid ? "paid" : "expired"}
          handle={profile.handle}
          displayName={profile.displayName}
          bio={profile.bio}
          invoiceId={id}
          amount={amount}
          memo={memo}
          closedAt={
            isPaid ? context.updatedAt.toISOString() : expiresAtRaw || null
          }
        />
        <p className="relative z-10 mt-8 max-w-sm text-center text-[11px] text-muted-foreground/80">
          {isPaid
            ? "This page is your receipt — save it for your records."
            : `Reach out to @${profile.handle} for a fresh invoice.`}
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame glow>
      <ProfileCard
        handle={profile.handle}
        displayName={profile.displayName}
        vaultPubkey={profile.vaultPubkey}
        umbraStatus={profile.umbraStatus}
        receiptEncryptionPublicKey={profile.receiptEncryptionPublicKey}
        bio={profile.bio}
        subPath={context.path}
        variant={{
          kind: "invoice",
          invoiceId: id,
          amount,
          memoTemplate: memo,
          dueAt: expiresAtRaw || undefined,
        }}
      />
      <p className="relative z-10 mt-8 max-w-sm text-center text-[11px] text-muted-foreground/80">
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
