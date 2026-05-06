"use client";

import { useId, useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBaseUnitsAmount, nativeAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { cn } from "@/lib/utils";

const TOKEN_DECIMALS = solanaPaymentConfig.tokenDecimals;

type Size = "md" | "lg";

type CommonProps = {
  id?: string;
  /** Optional label rendered in the header row. Omit to render input only. */
  label?: string;
  /** Right-aligned hint when no balance is displayed (visitor variant only). */
  hint?: React.ReactNode;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** `md` for dialog forms (h-10/11), `lg` for the public profile card (h-14). */
  size?: Size;
  validationMessage?: React.ReactNode;
  /** When true, applies the warning border style. */
  invalid?: boolean;
  className?: string;
};

type OwnerProps = CommonProps & {
  variant: "owner";
  /** Available balance in human token units. `null` = locked / loading / unknown. */
  balance: number | null;
  isLoadingBalance?: boolean;
  /**
   * Optional override for Max — returns the Max amount in base units given
   * the full available balance in base units. Defaults to identity.
   */
  getMaxBaseUnits?: (availableBaseUnits: bigint) => bigint;
  /** Default true. */
  showMax?: boolean;
};

type VisitorProps = CommonProps & {
  variant: "visitor";
};

export type AmountInputProps = OwnerProps | VisitorProps;

const SIZE_INPUT_CLASSES: Record<Size, string> = {
  md: "h-11 px-3 pr-24 text-base",
  lg: "h-14 pl-4 pr-24 text-2xl border-border-strong bg-surface-raised/30 placeholder:text-muted-foreground/40 focus-visible:ring-primary/30",
};

const SIZE_SUFFIX_CLASSES: Record<Size, string> = {
  md: "text-[10.5px] tracking-wider text-muted-foreground/80",
  lg: "text-sm tracking-wide text-muted-foreground",
};

export function AmountInput(props: AmountInputProps) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const size: Size = props.size ?? "md";

  const {
    label,
    value,
    onValueChange,
    placeholder = "0.00",
    autoFocus,
    disabled,
    validationMessage,
    invalid,
    className,
  } = props;

  const isOwner = props.variant === "owner";
  const balance = isOwner ? props.balance : null;
  const isLoadingBalance = isOwner ? Boolean(props.isLoadingBalance) : false;
  const showMax = isOwner ? (props.showMax ?? true) : false;
  const getMaxBaseUnits = isOwner ? props.getMaxBaseUnits : undefined;

  const balanceBaseUnits = useMemo(
    () =>
      isOwner && balance !== null
        ? nativeAmount(balance, TOKEN_DECIMALS)
        : null,
    [isOwner, balance],
  );

  const maxBaseUnits = useMemo(() => {
    if (!isOwner || balanceBaseUnits === null) return null;
    const computed = getMaxBaseUnits
      ? getMaxBaseUnits(balanceBaseUnits)
      : balanceBaseUnits;
    return computed > 0n ? computed : 0n;
  }, [isOwner, balanceBaseUnits, getMaxBaseUnits]);

  const canMax =
    isOwner &&
    showMax &&
    !disabled &&
    maxBaseUnits !== null &&
    maxBaseUnits > 0n;

  function handleMaxClick() {
    if (!canMax || maxBaseUnits === null) return;
    const formatted = formatBaseUnitsAmount(maxBaseUnits, {
      decimals: TOKEN_DECIMALS,
      fractionDigits: TOKEN_DECIMALS,
    }).replace(/\.?0+$/, "");
    onValueChange(formatted || "0");
  }

  // Header row (label + balance|hint). Rendered when at least one is present.
  const headerRight =
    isOwner && !props.hint ? (
      <BalanceLabel
        balance={balance}
        isLoading={isLoadingBalance}
      />
    ) : props.hint ? (
      <span className="text-[11px] text-muted-foreground/70">{props.hint}</span>
    ) : null;

  const headerVisible = Boolean(label) || Boolean(headerRight);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {headerVisible && (
        <div className="flex items-baseline justify-between gap-2">
          {label ? (
            <label
              htmlFor={inputId}
              className={cn(
                "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/85",
                size === "lg" && "text-xs tracking-wide",
              )}
            >
              {label}
            </label>
          ) : (
            <span aria-hidden />
          )}
          {headerRight}
        </div>
      )}

      <div className="relative">
        <Input
          id={inputId}
          inputMode="decimal"
          value={value}
          onChange={(e) =>
            onValueChange(e.target.value.replace(/[^0-9.]/g, ""))
          }
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "font-mono tabular",
            SIZE_INPUT_CLASSES[size],
            invalid && "border-warning/60 focus-visible:ring-warning/40",
          )}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
          {showMax && (
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={!canMax}
              className={cn(
                "pointer-events-auto rounded-md border border-border/70 bg-surface-raised/60 px-1.5 py-0.5 font-mono tabular text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors",
                "hover:border-primary/40 hover:text-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border/70 disabled:hover:text-muted-foreground",
              )}
            >
              Max
            </button>
          )}
          <span
            className={cn(
              "font-mono tabular font-medium",
              SIZE_SUFFIX_CLASSES[size],
            )}
          >
            {solanaPaymentConfig.tokenSymbol}
          </span>
        </div>
      </div>

      {validationMessage && (
        <p className="text-[11.5px] text-warning">{validationMessage}</p>
      )}
    </div>
  );
}

function BalanceLabel({
  balance,
  isLoading,
}: {
  balance: number | null;
  isLoading: boolean;
}) {
  if (isLoading && balance === null) {
    return (
      <Skeleton className="inline-block h-3 w-24 rounded bg-muted/60" />
    );
  }
  if (balance === null) return <span aria-hidden />;
  return (
    <span className="text-[11px] text-muted-foreground/80">
      Available{" "}
      <span className="font-mono tabular text-foreground/85">
        {balance.toFixed(2)}
      </span>
    </span>
  );
}
