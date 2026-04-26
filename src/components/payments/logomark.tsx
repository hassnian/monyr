import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  href?: string;
  size?: "sm" | "md";
};

/**
 * The wordmark. Serif italic "Monyr" with a trailing dot in amber.
 * The dot is the logo — readable at 20 feet, distinctive at 20 pixels.
 */
export function Logomark({ className, href = "/", size = "md" }: Props) {
  const content = (
    <span
      className={cn(
        "inline-flex items-baseline font-serif italic font-normal tracking-tight select-none",
        size === "sm" ? "text-lg" : "text-xl",
        className
      )}
    >
      <span className="text-foreground">Monyr</span>
      <span aria-hidden className="ml-0.5 translate-y-[-0.05em] text-primary">
        .
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      aria-label="Monyr — home"
      className="outline-none rounded-md focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {content}
    </Link>
  );
}
