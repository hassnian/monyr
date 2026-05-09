import { ArrowUpRight } from "lucide-react";

import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { cn } from "@/lib/utils";

const FAUCET_URL = "https://faucet.umbraprivacy.com/";

type Tone = "muted" | "warning";

export function DevnetFaucetHint({
  tone = "muted",
  className,
}: {
  tone?: Tone;
  className?: string;
}) {
  if (solanaPaymentConfig.chain !== "solana:devnet") return null;

  // Two forms:
  // - "warning" pairs with an explanatory error sentence next to it, so the
  //   link only needs to be the action ("Get test funds").
  // - "muted" stands alone, so it carries its own context.
  const label =
    tone === "warning"
      ? "Get test funds"
      : `Need test ${solanaPaymentConfig.tokenSymbol}? Use the faucet`;

  return (
    <a
      href={FAUCET_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex w-fit items-center gap-0.5 text-[11.5px] font-medium underline-offset-2 transition-colors hover:underline",
        tone === "warning"
          ? "text-warning"
          : "text-muted-foreground/80 hover:text-foreground/90",
        className,
      )}
    >
      <span>{label}</span>
      <ArrowUpRight
        className="size-3 transition-transform group-hover:translate-x-px group-hover:-translate-y-px"
        strokeWidth={2.25}
      />
    </a>
  );
}
