"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Logomark } from "@/components/payments/logomark";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";
import { useWallet } from "@/app/contexts/wallet-context";

const NAV = [
  { href: "#why", label: "Why" },
  { href: "#what", label: "What" },
  { href: "#how", label: "How" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Slim sticky nav. Three question-driven jump links + FAQ. The wallet button
 * sits opposite — once connected, a quiet "Dashboard" link appears beside it
 * so the user has a one-tap path into their workspace.
 */
export function LandingNav() {
  const { isConnected } = useWallet();

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10">
        <Logomark size="sm" />

        <nav
          aria-label="Section navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors",
                "hover:text-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isConnected && <DashboardLink />}
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}

function DashboardLink() {
  return (
    <Link
      href="/app"
      className={cn(
        "group inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium",
        "border border-border-strong/60 bg-surface-raised/40 text-foreground/90 backdrop-blur-sm",
        "transition-all duration-200",
        "hover:border-primary/45 hover:bg-surface-raised hover:text-foreground",
        "hover:shadow-[0_0_0_1px_oklch(0.82_0.11_72/0.2),0_8px_24px_-12px_oklch(0.82_0.11_72/0.6)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <LayoutDashboard
        className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary"
        strokeWidth={2}
      />
      <span>Dashboard</span>
    </Link>
  );
}
