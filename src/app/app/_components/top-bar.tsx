"use client";

import Link from "next/link";
import { ChevronDown, Wallet2 } from "lucide-react";
import { Logomark } from "@/components/payments/logomark";
import { cn } from "@/lib/utils";

type Props = {
  handle: string;
};

/**
 * Thin top strip. Wordmark left, section label center (serif italic, editorial
 * voice), wallet chip right. Sticky so it holds position over long scrolling.
 */
export function TopBar({ handle }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10">
        <div className="flex items-center gap-5">
          <Logomark size="sm" />
          <span
            aria-hidden
            className="h-4 w-px bg-border"
          />
          <nav className="flex items-center gap-1">
            <NavLink href="/app" active>
              Dashboard
            </NavLink>
            <NavLink href={`/@${handle}`}>Profile</NavLink>
            <NavLink href="/app/receipts">Receipts</NavLink>
            <NavLink href="/app/settings">Settings</NavLink>
          </nav>
        </div>

        <WalletChip handle={handle} />
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

function WalletChip({ handle }: { handle: string }) {
  void handle;
  return (
    <button
      type="button"
      className={cn(
        "group h-9 rounded-lg px-3 text-[13px] font-medium transition-all",
        "border border-border-strong/60 bg-surface-raised/40 backdrop-blur-sm",
        "hover:border-primary/50 hover:shadow-[0_0_0_1px_oklch(0.82_0.11_72/0.2),0_8px_24px_-12px_oklch(0.82_0.11_72/0.6)]",
        "flex items-center gap-2.5 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <span className="relative grid size-6 place-items-center rounded-md bg-surface-raised ring-1 ring-border-strong/70">
        <Wallet2 className="size-3.5 text-muted-foreground" strokeWidth={2} />
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-success ring-2 ring-background"
        />
      </span>
      <span className="font-mono tabular text-foreground">7kQ3…Xmpl</span>
      <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={2} />
    </button>
  );
}
