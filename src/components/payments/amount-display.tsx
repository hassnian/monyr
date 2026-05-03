import { formatBaseUnitsAmount, formatDecimalAmount, nativeAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  /** Human/display amount, e.g. 0.001 USDC. Prefer amountBaseUnits when available. */
  amount: number | null;
  /** Native/base units, e.g. 1000 for 0.001 USDC when decimals=6. */
  amountBaseUnits?: bigint | string | number | null;
  /** Native/base-unit decimals for this asset. USDC is 6. */
  decimals?: number;
  currency?: string;
  /** Privacy-masked: render `••••` dots for an intentional hide. */
  hidden?: boolean;
  /** Initial-load state: render a skeleton bar instead of the value. */
  loading?: boolean;
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

const skeletonSizeMap: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-3.5 w-12",
  md: "h-4 w-16",
  lg: "h-6 w-24",
  xl: "h-9 w-32",
  display: "h-14 w-44",
};

function formatAmount({
  amount,
  amountBaseUnits,
  decimals,
}: Pick<Props, "amount" | "amountBaseUnits" | "decimals">) {
  const tokenDecimals = decimals ?? solanaPaymentConfig.tokenDecimals;

  if (amountBaseUnits !== undefined && amountBaseUnits !== null) {
    return formatBaseUnitsAmount(amountBaseUnits, { decimals: tokenDecimals });
  }

  return formatDecimalAmount(amount!, { decimals: tokenDecimals });
}

export function AmountDisplay({
  amount,
  amountBaseUnits,
  decimals,
  currency = "USDC",
  hidden = false,
  loading = false,
  className,
  size = "md",
}: Props) {
  const nativeAmountValue =
    amountBaseUnits ??
    (amount === null ? null : nativeAmount(amount, decimals ?? solanaPaymentConfig.tokenDecimals));
  const isEmpty = nativeAmountValue === null || hidden;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 font-mono tabular whitespace-nowrap",
        sizeMap[size],
        className
      )}
    >
      {loading ? (
        <Skeleton
          className={cn("rounded-md bg-muted/60", skeletonSizeMap[size])}
          aria-label="Loading amount"
        />
      ) : (
        <span className={cn("text-foreground", isEmpty && "text-muted-foreground")}>
          {isEmpty ? "••••" : formatAmount({ amount, amountBaseUnits: nativeAmountValue, decimals })}
        </span>
      )}
      <span
        className="text-muted-foreground font-sans font-medium tracking-wide uppercase"
        style={{ fontSize: "0.55em" }}
      >
        {currency}
      </span>
    </span>
  );
}
