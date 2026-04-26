import { cn } from "@/lib/utils";

type Props = {
  /** Number rendered as `§ NN`. */
  number: string;
  /** Tiny-caps subtitle next to the number. */
  eyebrow: string;
  /** Display headline — serif, large, tracking-tight. */
  headline: React.ReactNode;
  /** Optional italic-serif standfirst — the editorial voice paragraph beneath the headline. */
  standfirst?: React.ReactNode;
  /** Section content. */
  children: React.ReactNode;
  /** Outermost class hook (background tints, ornaments). */
  className?: string;
  /** Hook for the inner container — defaults to max-w-6xl. */
  innerClassName?: string;
  /** Anchor id, for in-page scroll links from nav/FAQ/CTAs. */
  id?: string;
};

/**
 * Shared shape for every landing section: thin top hairline, numbered eyebrow,
 * serif headline, optional standfirst, then content. Magazine-page rhythm —
 * the eyebrow is meta-data, the headline is the masthead, the standfirst is
 * the dek, then the body.
 */
export function SectionFrame({
  number,
  eyebrow,
  headline,
  standfirst,
  children,
  className,
  innerClassName,
  id,
}: Props) {
  return (
    <section
      id={id}
      aria-labelledby={`${id ?? eyebrow}-headline`}
      className={cn("relative scroll-mt-24 py-24 md:py-32", className)}
    >
      <div
        className={cn(
          "relative mx-auto w-full max-w-6xl px-6 md:px-10",
          innerClassName,
        )}
      >
        <header className="mb-10 max-w-3xl md:mb-14">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="font-mono tabular text-[10.5px] uppercase tracking-[0.24em]">
              § {number}
            </span>
            <span aria-hidden className="h-px w-8 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {eyebrow}
            </span>
          </div>
          <h2
            id={`${id ?? eyebrow}-headline`}
            className="mt-5 font-serif text-3xl leading-[1.06] tracking-tight text-foreground sm:text-4xl md:text-[44px]"
          >
            {headline}
          </h2>
          {standfirst && (
            <p className="mt-5 max-w-2xl font-serif text-[16.5px] italic leading-relaxed text-muted-foreground/85 md:text-[17.5px]">
              {standfirst}
            </p>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}

export function SectionDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border to-transparent",
        className,
      )}
    />
  );
}
