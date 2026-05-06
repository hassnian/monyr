"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Loader2,
  CalendarDays,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AmountDisplay } from "@/components/payments/amount-display";
import { AmountInput } from "@/components/payments/amount-input";
import {
  createInvoicePaymentContext,
  type PaymentContext,
} from "@/app/actions/payment-contexts";
import { handleUrl } from "@/lib/brand";
import { solanaPaymentConfig } from "@/lib/payments/solana-config";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  onCreated?: (context: PaymentContext) => void;
};

type Phase = "form" | "creating" | "done";

const EXPIRY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "2 weeks" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
] as const;

export function CreateInvoiceDialog({ open, onOpenChange, handle, onCreated }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [copied, setCopied] = useState(false);
  const [createdPath, setCreatedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("form");
        setClient("");
        setAmount("");
        setMemo("");
        setExpiryDays(30);
        setCopied(false);
        setCreatedPath(null);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [amount]);

  const previewPath = createdPath ?? "invoice/new";
  const previewUrl = handleUrl(handle, previewPath);

  const expiresAtLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + expiryDays);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, [expiryDays]);

  const canSubmit =
    phase === "form" && client.trim().length > 0 && numericAmount !== null;

  async function handleCreate() {
    if (!canSubmit || numericAmount === null) return;
    setPhase("creating");

    try {
      const context = await createInvoicePaymentContext({
        handle,
        client: client.trim(),
        amount: numericAmount,
        memo: memo.trim() || null,
        expiryDays: expiryDays as 7 | 14 | 30 | 60,
      });
      setCreatedPath(context.path);
      onCreated?.(context);
      setPhase("done");
    } catch (error) {
      console.error("Failed to create invoice", error);
      setPhase("form");
    }
  }

  function handleCopy() {
    try {
      navigator.clipboard?.writeText(`https://${previewUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[480px] gap-0 overflow-hidden border border-border-strong/60 bg-popover p-0",
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
            {phase === "done" ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/15 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-primary">
                <Check className="size-3" strokeWidth={2.5} />
                Ready to share
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">
                <FileText className="size-3 text-primary" strokeWidth={2.25} />
                New invoice
              </span>
            )}
            <DialogTitle className="font-serif text-[26px] leading-[1.05] tracking-tight text-foreground">
              {phase === "done"
                ? "Invoice ready."
                : "Bill a client, privately."}
            </DialogTitle>
            <DialogDescription className="max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">
              {phase === "done"
                ? "Share the link. The payer just clicks Pay — the amount and memo are pre-filled."
                : "Fixed-amount, time-bound. Share the URL and the payer just clicks Pay."}
            </DialogDescription>
          </div>

          {phase === "done" ? (
            <DonePanel
              previewUrl={previewUrl}
              amount={numericAmount ?? 0}
              client={client.trim()}
              expiresLabel={expiresAtLabel}
              copied={copied}
              onCopy={handleCopy}
            />
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <Field label="Client" htmlFor="invoice-client">
                <Input
                  id="invoice-client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Acme Corp"
                  className="h-10 px-3 text-sm"
                  autoFocus
                />
              </Field>

              <AmountInput
                variant="visitor"
                id="invoice-amount"
                label="Amount"
                hint="The client pays this on claim"
                value={amount}
                onValueChange={setAmount}
                disabled={phase !== "form"}
              />


              <Field label="Memo" htmlFor="invoice-memo" hint="Optional. Pre-filled for the payer.">
                <Textarea
                  id="invoice-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Frontend engineering · April 2026"
                  rows={2}
                  className="resize-none px-3 py-2 text-sm"
                />
              </Field>

              <Field label="Expires">
                <div className="flex flex-wrap gap-1.5">
                  {EXPIRY_OPTIONS.map((opt) => {
                    const selected = expiryDays === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setExpiryDays(opt.value)}
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-all",
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          selected
                            ? "border-primary/45 bg-primary/10 text-primary"
                            : "border-border bg-surface-raised/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <PreviewCard
                url={previewUrl}
                amount={numericAmount}
                client={client.trim()}
                memo={memo.trim()}
                expiresLabel={expiresAtLabel}
              />

              <Button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90",
                  "ring-1 ring-primary/30 transition-all active:translate-y-px",
                  "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
                  "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
                  "disabled:opacity-60",
                )}
              >
                {phase === "creating" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating invoice…
                  </>
                ) : (
                  "Create invoice"
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/85"
        >
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-muted-foreground/60">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function PreviewCard({
  url,
  amount,
  client,
  memo,
  expiresLabel,
}: {
  url: string;
  amount: number | null;
  client: string;
  memo: string;
  expiresLabel: string;
}) {
  const showAmount = amount !== null;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 ring-1 ring-primary/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85">
          Preview
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
          <CalendarDays className="size-3" strokeWidth={2} />
          Expires {expiresLabel}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[20px] leading-tight tracking-tight text-foreground">
            {client || <span className="text-muted-foreground/50">Client name</span>}
          </p>
          <p className="mt-1 truncate font-mono tabular text-[11.5px] text-muted-foreground/70">
            {url}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {showAmount ? (
            <AmountDisplay amount={amount} size="lg" />
          ) : (
            <span className="font-mono tabular text-[20px] text-muted-foreground/40">
              0.00 <span className="text-[11px]">{solanaPaymentConfig.tokenSymbol}</span>
            </span>
          )}
        </div>
      </div>
      {memo && (
        <p className="mt-3 border-t border-primary/15 pt-3 font-serif text-[13px] italic leading-relaxed text-muted-foreground/85">
          “{memo}”
        </p>
      )}
    </div>
  );
}

function DonePanel({
  previewUrl,
  amount,
  client,
  expiresLabel,
  copied,
  onCopy,
}: {
  previewUrl: string;
  amount: number;
  client: string;
  expiresLabel: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-5 ring-1 ring-primary/15">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/85">
              {client}
            </p>
            <h4 className="mt-1 font-serif text-[24px] leading-tight tracking-tight text-foreground">
              <AmountDisplay amount={amount} size="lg" />
            </h4>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <CalendarDays className="size-3" strokeWidth={2} />
            Expires {expiresLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-border-strong/50 bg-surface-raised/60 px-3 py-2.5 text-left transition-all",
            "hover:border-primary/45 hover:bg-surface-raised/80",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <span className="truncate font-mono tabular text-[12px] text-foreground">
            {previewUrl}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-primary">
            {copied ? (
              <>
                <Check className="size-3.5" strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" strokeWidth={2} />
                Copy link
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
