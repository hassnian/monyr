"use client";

import Link from "next/link";
import { Logomark } from "@/components/payments/logomark";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";

type Props = {
  handle: string;
};

/**
 * Thin top strip. Wordmark left, dashboard nav center-left, real wallet chip
 * right. Sticky so it holds position over long scrolling.
 */
export function TopBar({ handle }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10">
        <div className="flex items-center gap-5">
          <Logomark size="sm" />
          <span aria-hidden className="h-4 w-px bg-border" />
          <nav className="flex items-center gap-1">
            <NavLink href="/app" active>
              Dashboard
            </NavLink>
            <NavLink href={`/@${handle}`}>Profile</NavLink>
            <NavLink href="/app/receipts">Receipts</NavLink>
            <NavLink href="/app/settings">Settings</NavLink>
          </nav>
        </div>

        <WalletConnectButton />
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="mx-1 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-primary"
        />
      )}
    </Link>
  );
}
