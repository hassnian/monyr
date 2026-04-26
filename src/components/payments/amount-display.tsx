import { cn } from "@/lib/utils";

type Props = {
  amount: number | null;
  currency?: string;
  hidden?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "display";
};

const sizeMap: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl",
  display: "text-6xl",
};

function formatAmount(amount: number) {
  const fixed = amount.toFixed(2);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${fraction}`;
}

export function AmountDisplay({
  amount,
  currency = "USDC",
  hidden = false,
  className,
  size = "md",
}: Props) {
  const isEmpty = amount === null || hidden;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 font-mono tabular whitespace-nowrap",
        sizeMap[size],
        className
      )}
    >
      <span className={cn("text-foreground", isEmpty && "text-muted-foreground")}>
        {isEmpty ? "••••" : formatAmount(amount!)}
      </span>
      <span
        className="text-muted-foreground font-sans font-medium tracking-wide uppercase"
        style={{ fontSize: "0.55em" }}
      >
        {currency}
      </span>
    </span>
  );
}
