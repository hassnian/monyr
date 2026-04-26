export function nativeAmount(amount: number, decimals: number) {
  return BigInt(Math.round(amount * 10 ** decimals));
}
