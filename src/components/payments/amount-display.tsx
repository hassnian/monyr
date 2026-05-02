import { formatBaseUnitsAmount, formatDecimalAmount, nativeAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { cn } from "@/lib/utils";

type Props = {
  /** Human/display amount, e.g. 0.001 USDC. Prefer amountBaseUnits when available. */
  amount: number | null;
  /** Native/base units, e.g. 1000 for 0.001 USDC when decimals=6. */
  amountBaseUnits?: bigint | string | number | null;
  /** Native/base-unit decimals for this asset. USDC is 6. */
  decimals?: number;
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
      <span className={cn("text-foreground", isEmpty && "text-muted-foreground")}>
        {isEmpty ? "••••" : formatAmount({ amount, amountBaseUnits: nativeAmountValue, decimals })}
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
