import { APP_DOMAIN, appUrl } from "@/lib/brand";
import { SectionFrame } from "./section-frame";

type Path = {
  url: string;
  highlight: string;
  kind: string;
  blurb: string;
};

const PATHS: Path[] = [
  {
    url: appUrl("@alice"),
    highlight: "",
    kind: "Tip jar",
    blurb: "Pay any amount. The link you put in every bio.",
  },
  {
    url: appUrl("@alice/acme"),
    highlight: "/acme",
    kind: "Per-client label",
    blurb: "Acme sees Acme. You see /acme grouped in your inbox.",
  },
  {
    url: appUrl("@alice/invoice/x7k2"),
    highlight: "/invoice/x7k2",
    kind: "Fixed invoice",
    blurb: "Locked amount, optional expiry. Marks itself paid.",
  },
  {
    url: appUrl("@alice/product/mini-zine"),
    highlight: "/product/mini-zine",
    kind: "Product",
    blurb: "Fixed price, gated unlock. Downloads, licenses, or access passes.",
  },
];

/**
 * "What it is" — one URL, four shapes (tip jar, per-client label, invoice,
 * product). Same vault behind every path.
 */
export function SectionWhat() {
  return (
    <SectionFrame
      id="what"
      number="02"
      eyebrow="What it is"
      headline={
        <>
          One handle.{" "}
          <em className="not-italic text-primary">Every payment shape</em> hangs
          off it.
        </>
      }
      standfirst={
        <>
          Tip jar, per-client label, invoice, product. The path after your
          handle is just metadata — every variant lands in the same private
          vault.
        </>
      }
    >
      <div className="rounded-2xl border border-border bg-card/60 p-2 md:p-3">
        <ul className="divide-y divide-border/60">
          {PATHS.map((p) => (
            <li
              key={p.url}
              className="grid grid-cols-1 items-center gap-2 px-4 py-4 md:grid-cols-[auto_1fr_2fr] md:gap-6 md:px-5"
            >
              <span className="font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                {p.kind}
              </span>
              <p
                aria-label={p.url}
                className="break-all font-mono tabular text-[14px] leading-snug text-foreground/90 md:text-[15px]"
              >
                <span className="text-muted-foreground/70">{APP_DOMAIN}</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="text-muted-foreground/70">@</span>
                <span className="text-foreground">alice</span>
                {p.highlight && (
                  <span className="text-primary">{p.highlight}</span>
                )}
              </p>
              <p className="text-[13px] leading-relaxed text-muted-foreground/85">
                {p.blurb}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </SectionFrame>
  );
}
