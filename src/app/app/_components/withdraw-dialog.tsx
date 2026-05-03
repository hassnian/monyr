"use client";

import { useEffect, useMemo, useState } from "react";
import { createSignerFromKeyPair as createUmbraSignerFromKeyPair } from "@umbra-privacy/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Loader2,
  Wallet,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AmountDisplay } from "@/components/payments/amount-display";
import { AmountInput } from "@/components/payments/amount-input";
import { fundVaultForUtxoCreation } from "@/app/actions/vault";
import { useAuth } from "@/app/contexts/auth-context";
import { useUmbra } from "@/app/hooks/useUmbra";
import { formatBaseUnitsAmount, nativeAmount } from "@/lib/payments/amount";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { sweepWithdrawalSetupSol } from "@/lib/vault/sweep";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Decrypted private balance in human USDC. `null` while loading or locked. */
  availableBalance: number | null;
  /** Connected wallet address — withdrawal destination. Read-only here. */
  walletAddress: string | null;
};

type Phase = "form" | "withdrawing" | "done";

type WithdrawalEstimate = {
  createFeeBaseUnits: bigint;
  claimFeeBaseUnits: bigint;
  totalFeeBaseUnits: bigint;
  utxoAmountBaseUnits: bigint;
  receiveBaseUnits: bigint;
};

const CREATE_SELF_CLAIMABLE_BASE_FEE = 1n;
const CREATE_SELF_CLAIMABLE_COMMISSION_BPS = 30n;
const CREATE_SELF_CLAIMABLE_FEE_DENOMINATOR = 16_384n;
const CLAIM_PROTOCOL_FEE_NUMERATOR = 35n;
const CLAIM_PROTOCOL_FEE_DENOMINATOR = 16_384n;
const TOKEN_DECIMALS = solanaPaymentConfig.tokenDecimals;
const ONE_TOKEN_BASE_UNITS = 10n ** BigInt(TOKEN_DECIMALS);
const PRIVATE_WITHDRAWAL_RESERVE_BASE_UNITS = ONE_TOKEN_BASE_UNITS / 100n; // 0.01 USDC
const MIN_PRIVATE_WITHDRAWAL_BASE_UNITS = (ONE_TOKEN_BASE_UNITS * 5n) / 100n; // 0.05 USDC

function parseDecimalBaseUnits(value: string, decimals: number) {
  const trimmed = value.trim();
  if (!/^\d*(?:\.\d*)?$/.test(trimmed)) return null;

  const [wholeRaw = "", fractionRaw = ""] = trimmed.split(".");
  if (!wholeRaw && !fractionRaw) return null;
  if (fractionRaw.length > decimals) return null;

  const whole = BigInt(wholeRaw || "0");
  const fraction = BigInt(fractionRaw.padEnd(decimals, "0") || "0");
  const amount = whole * 10n ** BigInt(decimals) + fraction;
  return amount > 0n ? amount : null;
}

function toHumanAmount(amountBaseUnits: bigint) {
  return Number(amountBaseUnits) / 10 ** TOKEN_DECIMALS;
}

function estimatePrivateWithdrawal(amountBaseUnits: bigint): WithdrawalEstimate {
  const amountAfterBaseFee = amountBaseUnits - CREATE_SELF_CLAIMABLE_BASE_FEE;
  if (amountAfterBaseFee <= 0n) {
    return {
      createFeeBaseUnits: amountBaseUnits,
      claimFeeBaseUnits: 0n,
      totalFeeBaseUnits: amountBaseUnits,
      utxoAmountBaseUnits: 0n,
      receiveBaseUnits: 0n,
    };
  }

  const createCommission =
    (amountAfterBaseFee * CREATE_SELF_CLAIMABLE_COMMISSION_BPS) /
    CREATE_SELF_CLAIMABLE_FEE_DENOMINATOR;
  const utxoAmountBaseUnits = amountAfterBaseFee - createCommission;
  const claimFeeBaseUnits =
    (utxoAmountBaseUnits * CLAIM_PROTOCOL_FEE_NUMERATOR) /
    CLAIM_PROTOCOL_FEE_DENOMINATOR;
  const receiveBaseUnits =
    utxoAmountBaseUnits > claimFeeBaseUnits
      ? utxoAmountBaseUnits - claimFeeBaseUnits
      : 0n;

  return {
    createFeeBaseUnits: CREATE_SELF_CLAIMABLE_BASE_FEE + createCommission,
    claimFeeBaseUnits,
    totalFeeBaseUnits:
      CREATE_SELF_CLAIMABLE_BASE_FEE + createCommission + claimFeeBaseUnits,
    utxoAmountBaseUnits,
    receiveBaseUnits,
  };
}

function estimateWithdrawalDebitBaseUnits(amountBaseUnits: bigint) {
  return amountBaseUnits + estimatePrivateWithdrawal(amountBaseUnits).createFeeBaseUnits;
}

function getMaxWithdrawalAmountBaseUnits(availableBaseUnits: bigint) {
  if (availableBaseUnits <= PRIVATE_WITHDRAWAL_RESERVE_BASE_UNITS) return 0n;

  const spendableBaseUnits =
    availableBaseUnits - PRIVATE_WITHDRAWAL_RESERVE_BASE_UNITS;
  let low = 0n;
  let high = spendableBaseUnits;

  while (low < high) {
    const mid = (low + high + 1n) / 2n;
    if (estimateWithdrawalDebitBaseUnits(mid) <= spendableBaseUnits) {
      low = mid;
    } else {
      high = mid - 1n;
    }
  }

  return low;
}

function formatBaseUnitsForUi(amountBaseUnits: bigint) {
  return formatBaseUnitsAmount(amountBaseUnits, {
    decimals: TOKEN_DECIMALS,
    fractionDigits: 2,
    smallAmountMaxFractionDigits: 6,
  });
}

function truncateAddress(address: string, head = 4, tail = 4) {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function WithdrawDialog({
  open,
  onOpenChange,
  availableBalance,
  walletAddress,
}: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [amount, setAmount] = useState("");
  const [withdrawSignature, setWithdrawSignature] = useState<string | null>(null);
  const { unlockedVault } = useAuth();
  const { withdrawPrivateUsdcToWallet } = useUmbra();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("form");
        setAmount("");
        setWithdrawSignature(null);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const availableBalanceBaseUnits = useMemo(
    () =>
      availableBalance !== null
        ? nativeAmount(availableBalance, TOKEN_DECIMALS)
        : null,
    [availableBalance],
  );

  const amountBaseUnits = useMemo(
    () => parseDecimalBaseUnits(amount, TOKEN_DECIMALS),
    [amount],
  );
  const numericAmount = useMemo(
    () => (amountBaseUnits !== null ? toHumanAmount(amountBaseUnits) : null),
    [amountBaseUnits],
  );
  const withdrawalEstimate = useMemo(
    () => (amountBaseUnits !== null ? estimatePrivateWithdrawal(amountBaseUnits) : null),
    [amountBaseUnits],
  );

  const withdrawalDebitBaseUnits = useMemo(
    () =>
      amountBaseUnits !== null
        ? estimateWithdrawalDebitBaseUnits(amountBaseUnits)
        : null,
    [amountBaseUnits],
  );

  const withdrawalSpendableBaseUnits =
    availableBalanceBaseUnits !== null &&
    availableBalanceBaseUnits > PRIVATE_WITHDRAWAL_RESERVE_BASE_UNITS
      ? availableBalanceBaseUnits - PRIVATE_WITHDRAWAL_RESERVE_BASE_UNITS
      : 0n;
  const overBalance =
    withdrawalDebitBaseUnits !== null &&
    availableBalanceBaseUnits !== null &&
    withdrawalDebitBaseUnits > withdrawalSpendableBaseUnits;
  const belowFees =
    withdrawalEstimate !== null && withdrawalEstimate.receiveBaseUnits <= 0n;
  const belowMinimum =
    amountBaseUnits !== null && amountBaseUnits < MIN_PRIVATE_WITHDRAWAL_BASE_UNITS;
  const validationMessage = belowMinimum
    ? `Minimum private withdrawal is ${formatBaseUnitsForUi(MIN_PRIVATE_WITHDRAWAL_BASE_UNITS)} USDC.`
    : overBalance
      ? "Amount exceeds your available private balance."
      : belowFees
        ? "Amount is too small after Umbra fees."
        : null;

  const isWithdrawing = phase === "withdrawing";
  const isDone = phase === "done";

  const canSubmit =
    phase === "form" &&
    numericAmount !== null &&
    !overBalance &&
    walletAddress !== null &&
    unlockedVault != null &&
    !belowFees &&
    !belowMinimum;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!amountBaseUnits || !walletAddress || !unlockedVault) return;

    setPhase("withdrawing");
    try {
      const signer = createUmbraSignerFromKeyPair(unlockedVault.keyPairSigner);

      try {
        await fundVaultForUtxoCreation(unlockedVault.vaultPubkey);
      } catch (fundingError) {
        console.warn("[Withdraw] Could not top up vault SOL; retrying with current vault balance", fundingError);
      }

      const result = await withdrawPrivateUsdcToWallet({
        signer,
        destinationAddress: walletAddress,
        amountBaseUnits,
      });
      setWithdrawSignature(result.createResult.queueSignature);
      try {
        await sweepWithdrawalSetupSol(unlockedVault);
      } catch (sweepError) {
        console.warn("[Withdraw] Could not sweep leftover withdrawal SOL", sweepError);
      }
      await queryClient.invalidateQueries({
        queryKey: ["metrics", "private-balance", unlockedVault.vaultPubkey],
      });
      setPhase("done");
      toast.success("Withdrawal submitted", {
        description: "Your private balance was moved through a self-claimable UTXO.",
      });
    } catch (error) {
      console.error("[Withdraw] Umbra private withdrawal failed", error);
      setPhase("form");
      toast.error("Withdrawal failed", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  }

  const headline = isDone ? "Funds are on the way." : "Send to your wallet.";
  const description = isDone
    ? "Confirmed on Solana. The funds are now in your connected wallet."
    : "Move funds from your private balance to your connected wallet.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[440px] gap-0 overflow-hidden border border-border-strong/60 bg-popover p-0",
          "shadow-2xl shadow-black/50",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -top-16 h-56 -z-10 blur-3xl opacity-80"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, oklch(0.82 0.11 72 / 0.18), transparent 70%)",
          }}
        />

        <div className="flex flex-col gap-6 px-7 pb-7 pt-9">
          <div className="flex flex-col items-center gap-3 text-center">
            {isDone ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/15 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-primary">
                <Check className="size-3" strokeWidth={2.5} />
                Sent
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">
                <ArrowUpRight
                  className="size-3 text-primary"
                  strokeWidth={2.25}
                />
                Withdraw
              </span>
            )}
            <DialogTitle className="font-serif text-[26px] leading-[1.05] tracking-tight text-foreground">
              {headline}
            </DialogTitle>
            <DialogDescription className="max-w-[38ch] text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          </div>

          {isDone ? (
            <DonePanel
              receives={withdrawalEstimate?.receiveBaseUnits ?? 0n}
              walletAddress={walletAddress ?? ""}
              signature={withdrawSignature}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <AmountInput
                variant="owner"
                id="withdraw-amount"
                label="Amount"
                value={amount}
                onValueChange={setAmount}
                balance={availableBalance}
                getMaxBaseUnits={getMaxWithdrawalAmountBaseUnits}
                invalid={overBalance}
                validationMessage={validationMessage}
                autoFocus
                disabled={isWithdrawing}
              />

              <Summary
                walletAddress={walletAddress}
                amount={numericAmount}
                amountBaseUnits={amountBaseUnits}
                estimate={withdrawalEstimate}
              />

              <Button
                type="submit"
                disabled={!canSubmit || isWithdrawing}
                className={cn(
                  "h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90",
                  "ring-1 ring-primary/30 transition-all active:translate-y-px",
                  "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
                  "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
                  "disabled:opacity-60 disabled:hover:bg-primary",
                )}
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Withdraw"
                )}
              </Button>

              <p className="text-center text-[11.5px] leading-snug text-muted-foreground/70">
                Private exit via self-claimable UTXO. Minimum withdrawal is {formatBaseUnitsForUi(MIN_PRIVATE_WITHDRAWAL_BASE_UNITS)} USDC.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Summary({
  walletAddress,
  amount,
  amountBaseUnits,
  estimate,
}: {
  walletAddress: string | null;
  amount: number | null;
  amountBaseUnits: bigint | null;
  estimate: WithdrawalEstimate | null;
}) {
  const showAmount = amount !== null && estimate !== null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised/30 p-4">
      <Row label="To">
        {walletAddress ? (
          <span
            className="inline-flex items-center gap-1.5 font-mono tabular text-[12.5px] text-foreground"
            title={walletAddress}
          >
            <Wallet
              className="size-3.5 text-muted-foreground/80"
              strokeWidth={2}
            />
            {truncateAddress(walletAddress, 6, 6)}
          </span>
        ) : (
          <span className="text-[12.5px] text-muted-foreground/60">
            Connect a wallet
          </span>
        )}
      </Row>

      <Row label="Balance used" hint="est.">
        {showAmount ? (
          <span className="font-mono tabular text-[12.5px] text-foreground/85">
            {formatBaseUnitsForUi(estimateWithdrawalDebitBaseUnits(amountBaseUnits ?? 0n))}{" "}
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              USDC
            </span>
          </span>
        ) : (
          <span className="font-mono tabular text-[12.5px] text-muted-foreground/40">
            —
          </span>
        )}
      </Row>

      <Row label="Protocol fee" hint="est.">
        {showAmount ? (
          <span className="font-mono tabular text-[12.5px] text-foreground/85">
            {formatBaseUnitsForUi(estimate.totalFeeBaseUnits)}{" "}
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              USDC
            </span>
          </span>
        ) : (
          <span className="font-mono tabular text-[12.5px] text-muted-foreground/40">
            —
          </span>
        )}
      </Row>

      <div className="mt-1 flex items-baseline justify-between border-t border-border/60 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/85">
          You receive
        </span>
        {showAmount ? (
          <AmountDisplay amount={toHumanAmount(estimate.receiveBaseUnits)} size="lg" />
        ) : (
          <span className="font-mono tabular text-[20px] text-muted-foreground/40">
            0.00 <span className="text-[11px] uppercase">USDC</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="inline-flex items-baseline gap-2 text-[12.5px] text-muted-foreground">
        {label}
        {hint && (
          <span className="font-mono tabular text-[10px] uppercase tracking-wider text-muted-foreground/55">
            {hint}
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

function DonePanel({
  receives,
  walletAddress,
  signature,
  onClose,
}: {
  receives: bigint;
  walletAddress: string;
  signature: string | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-5 ring-1 ring-primary/15">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/85">
              Sent to
            </p>
            <h4
              className="mt-1 inline-flex items-center gap-2 font-mono tabular text-[15px] text-foreground"
              title={walletAddress}
            >
              <Wallet className="size-4 text-primary" strokeWidth={2.25} />
              {truncateAddress(walletAddress, 6, 6)}
            </h4>
          </div>
          <AmountDisplay amount={toHumanAmount(receives)} size="lg" />
        </div>

        <a
          href={signature ? `https://solscan.io/tx/${signature}` : "https://solscan.io"}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "mt-4 inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
            "border-border/70 bg-surface-raised/40 hover:border-primary/40 hover:bg-surface-raised/70",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <span className="font-mono tabular text-[12px] text-foreground/90">
            View on Solana Explorer
          </span>
          <ExternalLink
            className="size-3.5 text-muted-foreground/80"
            strokeWidth={2}
          />
        </a>
      </div>

      <Button
        type="button"
        onClick={onClose}
        variant="outline"
        className="h-10 w-full rounded-xl border-border-strong/50 bg-surface-raised/40 text-[13px] font-medium text-foreground hover:bg-surface-raised/70"
      >
        Done
      </Button>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground/80">
        Withdrawal used Umbra&apos;s self-claimable UTXO path before exiting to your wallet.
      </p>
    </div>
  );
}
