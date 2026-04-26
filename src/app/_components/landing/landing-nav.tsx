import Link from "next/link";
import { Logomark } from "@/components/payments/logomark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#why", label: "Why" },
  { href: "#what", label: "What" },
  { href: "#how", label: "How" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Slim sticky nav. Three question-driven jump links + FAQ. The amber Claim
 * chip sits opposite — it's the only chromatic surface on the bar.
 */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-10">
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

        <Link
          href="/claim"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all",
            "border border-primary/40 bg-primary/10 text-primary",
            "hover:bg-primary/15",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          Claim handle
        </Link>
      </div>
    </header>
  );
}
