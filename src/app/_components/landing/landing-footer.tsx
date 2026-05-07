import Link from "next/link";
import { Logomark } from "@/components/payments/logomark";
import { SolanaMark } from "@/components/payments/solana-mark";

const COLUMNS = [
  {
    label: "Product",
    links: [
      { href: "#why", text: "Why Monyr" },
      { href: "#what", text: "Handles &amp; paths" },
      { href: "#how", text: "60-second setup" },
      { href: "/app", text: "Dashboard preview" },
    ],
  },
  {
    label: "Engineering",
    links: [
      { href: "#faq", text: "FAQ" },
      { href: "https://github.com/", text: "Open source", external: true },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "#contact", text: "Contact" },
      { href: "/security", text: "Security" },
      { href: "/privacy", text: "Privacy policy" },
      { href: "/terms", text: "Terms" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer
      id="contact"
      className="relative border-t border-border/70 bg-background"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Monyr — site footer
      </h2>

      <div className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr_2fr]">
          {/* Brand column */}
          <div>
            <Logomark size="md" />
            <p className="mt-4 max-w-sm font-serif text-[14px] italic leading-relaxed text-muted-foreground/75">
              Your handle is your identity; your ledger is your business. Monyr
              is the privacy layer on top of the wallet you already have.
            </p>
            <p className="mt-6 inline-flex items-center gap-1.5 font-mono tabular text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/70">
              Live on
              <SolanaMark className="h-[0.85em] w-auto translate-y-[0.04em] text-foreground/65" />
              Solana devnet
            </p>
          </div>

          {/* Link grid */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3"
          >
            {COLUMNS.map((col) => (
              <div key={col.label}>
                <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href + l.text}>
                      <FooterLink {...l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col-reverse items-start justify-between gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center">
          <p className="font-mono tabular text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Monyr v0.1 · 2026
          </p>
          <p className="font-serif text-[12.5px] italic text-muted-foreground/65">
            “On-chain, your handle should be your identity; your ledger should
            be your business.”
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  text,
  external,
}: {
  href: string;
  text: string;
  external?: boolean;
}) {
  const className =
    "text-[13px] text-muted-foreground/80 transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm";
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {text}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {text}
    </Link>
  );
}
