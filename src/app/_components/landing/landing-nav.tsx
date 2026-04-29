"use client";

import Link from "next/link";

import { Logomark } from "@/components/payments/logomark";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "@/app/components/wallet/WalletConnectButton";

const NAV = [
  { href: "#why", label: "Why" },
  { href: "#what", label: "What" },
  { href: "#how", label: "How" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Slim sticky nav. Question-driven jump links opposite the wallet button —
 * the dashboard affordance lives in the hero CTA when the connected wallet
 * owns a handle, so we don't double up here.
 */
export function LandingNav() {
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
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
