const DEFAULT_DISPLAY_FRACTION_DIGITS = 2;
const DEFAULT_SMALL_AMOUNT_MAX_FRACTION_DIGITS = 4;

export type FormatAmountOptions = {
  /** Native/base-unit decimals for the asset. USDC is 6. */
  decimals: number;
  /** Fraction digits used for normal amounts. */
  fractionDigits?: number;
  /** Max fraction digits used for non-zero values below the normal precision. */
  smallAmountMaxFractionDigits?: number;
  /** Thousands separator for the whole-number part. */
  groupSeparator?: string;
  /** Decimal separator between whole and fractional parts. */
  decimalSeparator?: string;
};

function assertDecimals(decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`Invalid token decimals: ${decimals}`);
  }
}

function pow10(exponent: number) {
  assertDecimals(exponent);
  return 10n ** BigInt(exponent);
}

function groupWhole(whole: string, separator: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function trimTrailingZeroes(value: string) {
  return value.replace(/0+$/g, "");
}

export function nativeAmount(amount: number, decimals: number) {
  assertDecimals(decimals);
  return BigInt(Math.round(amount * 10 ** decimals));
}

function formatRoundedBaseUnits(
  amountBaseUnits: bigint,
  decimals: number,
  fractionDigits: number,
  groupSeparator: string,
  decimalSeparator: string,
) {
  const sign = amountBaseUnits < 0n ? "-" : "";
  const absoluteAmount = amountBaseUnits < 0n ? -amountBaseUnits : amountBaseUnits;

  let scaled: bigint;
  if (decimals > fractionDigits) {
    const divisor = pow10(decimals - fractionDigits);
    scaled = (absoluteAmount + divisor / 2n) / divisor;
  } else {
    scaled = absoluteAmount * pow10(fractionDigits - decimals);
  }

  const displayScale = pow10(fractionDigits);
  const whole = scaled / displayScale;
  const fraction = (scaled % displayScale).toString().padStart(fractionDigits, "0");

  return `${sign}${groupWhole(whole.toString(), groupSeparator)}${decimalSeparator}${fraction}`;
}

export function formatBaseUnitsAmount(
  amountBaseUnits: bigint | string | number,
  {
    decimals,
    fractionDigits = DEFAULT_DISPLAY_FRACTION_DIGITS,
    smallAmountMaxFractionDigits = DEFAULT_SMALL_AMOUNT_MAX_FRACTION_DIGITS,
    groupSeparator = ",",
    decimalSeparator = ".",
  }: FormatAmountOptions,
) {
  assertDecimals(decimals);
  assertDecimals(fractionDigits);
  assertDecimals(smallAmountMaxFractionDigits);

  const native = BigInt(amountBaseUnits);
  const sign = native < 0n ? "-" : "";
  const absoluteAmount = native < 0n ? -native : native;

  if (absoluteAmount === 0n) {
    return formatRoundedBaseUnits(0n, decimals, fractionDigits, groupSeparator, decimalSeparator);
  }

  const normalPrecisionThreshold = pow10(Math.max(decimals - fractionDigits, 0));

  if (absoluteAmount >= normalPrecisionThreshold || decimals <= fractionDigits) {
    return formatRoundedBaseUnits(native, decimals, fractionDigits, groupSeparator, decimalSeparator);
  }

  const scale = pow10(decimals);
  const whole = absoluteAmount / scale;
  const fraction = (absoluteAmount % scale).toString().padStart(decimals, "0");
  const firstNonZeroFractionIndex = fraction.search(/[1-9]/);

  if (firstNonZeroFractionIndex === -1) {
    return formatRoundedBaseUnits(0n, decimals, fractionDigits, groupSeparator, decimalSeparator);
  }

  const displayedFractionDigits = Math.max(fractionDigits + 1, firstNonZeroFractionIndex + 1);

  if (displayedFractionDigits > smallAmountMaxFractionDigits) {
    const smallestDisplayedAmount = `${sign}<0${decimalSeparator}${"0".repeat(
      Math.max(smallAmountMaxFractionDigits - 1, 0),
    )}1`;
    return smallestDisplayedAmount;
  }

  const displayedFraction = trimTrailingZeroes(fraction.slice(0, displayedFractionDigits));
  return `${sign}${groupWhole(whole.toString(), groupSeparator)}${decimalSeparator}${displayedFraction}`;
}

export function formatDecimalAmount(
  amount: number,
  { decimals, ...options }: FormatAmountOptions,
) {
  return formatBaseUnitsAmount(nativeAmount(amount, decimals), { decimals, ...options });
}
