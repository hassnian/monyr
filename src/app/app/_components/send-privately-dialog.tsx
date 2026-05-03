"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Check,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AmountDisplay } from "@/components/payments/amount-display";
import { AmountInput } from "@/components/payments/amount-input";
import { HandleText } from "@/components/payments/handle-text";
import { usePrivateBalance } from "@/app/hooks/usePrivateBalance";
import { appUrl } from "@/lib/brand";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Mode = "handle" | "link";
type Phase = "form" | "sending" | "done";

function randomLinkId() {
  return Math.random().toString(36).slice(2, 10);
}

function isValidHandle(input: string) {
  const bare = input.trim().replace(/^@/, "");
  return /^[a-z0-9][a-z0-9_-]{1,30}$/i.test(bare);
}

export function SendPrivatelyDialog({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<Mode>("handle");
  const [phase, setPhase] = useState<Phase>("form");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkId, setLinkId] = useState(() => randomLinkId());

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setMode("handle");
        setPhase("form");
        setRecipient("");
        setAmount("");
        setMemo("");
        setAcknowledged(false);
        setCopied(false);
        setLinkId(randomLinkId());
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [amount]);

  const { balance: privateBalance, isLoading: isLoadingBalance } =
    usePrivateBalance();
  const overBalance =
    numericAmount !== null &&
    privateBalance !== null &&
    numericAmount > privateBalance;

  const recipientValid = mode === "handle" ? isValidHandle(recipient) : true;
  const ackOk = mode === "link" ? acknowledged : true;
  const canSubmit =
    phase === "form" &&
    numericAmount !== null &&
    !overBalance &&
    recipientValid &&
    ackOk;

  const linkUrl = useMemo(() => appUrl(`/c/${linkId}`), [linkId]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setPhase("sending");
    await new Promise((r) => setTimeout(r, 1100));
    setPhase("done");
  }

  function handleCopyLink() {
    try {
      navigator.clipboard?.writeText(`https://${linkUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const isSending = phase === "sending";
  const isDone = phase === "done";

  // Mode-aware copy. The eyebrow stays "Send privately" (the action category);
  // the headline names the *outcome* of this specific mode, mirroring how the
  // invoice/label dialogs read.
  const headline = isDone
    ? mode === "handle"
      ? "Payment is on its way."
      : "Link is ready — copy it now."
    : mode === "handle"
      ? "Pay anyone, by handle."
      : "Mint a claimable link.";

  const description = isDone
    ? mode === "handle"
      ? "Lands in their encrypted vault. Amount and memo stay off the public ledger."
      : "Anyone with this URL can claim it. We don't keep a copy — share it before you close this."
    : mode === "handle"
      ? "Lands in their encrypted vault. Amount and memo stay off the public ledger."
      : "Anyone with the link can claim. The secret lives in the URL — we don't keep a copy.";

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
            {isDone ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/15 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-primary">
                <Check className="size-3" strokeWidth={2.5} />
                {mode === "handle" ? "Sent" : "Link ready"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">
                <Send className="size-3 text-primary" strokeWidth={2.25} />
                Send privately
              </span>
            )}
            <DialogTitle className="font-serif text-[26px] leading-[1.05] tracking-tight text-foreground">
              {headline}
            </DialogTitle>
            <DialogDescription className="max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          </div>

          {!isDone && (
            <ModeSwitch
              mode={mode}
              onChange={setMode}
              disabled={isSending}
            />
          )}

          {isDone ? (
            <DonePanel
              mode={mode}
              recipient={recipient.trim()}
              amount={numericAmount ?? 0}
              memo={memo.trim()}
              linkUrl={linkUrl}
              copied={copied}
              onCopy={handleCopyLink}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              {mode === "handle" && (
                <Field label="Recipient" htmlFor="send-recipient">
                  <div
                    className={cn(
                      "flex h-10 items-center gap-1 rounded-lg border border-input bg-transparent px-3 transition-colors",
                      "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                      "dark:bg-input/30",
                    )}
                  >
                    <AtSign
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground/70"
                      strokeWidth={2}
                    />
                    <input
                      id="send-recipient"
                      value={recipient.replace(/^@/, "")}
                      onChange={(e) =>
                        setRecipient(
                          e.target.value
                            .replace(/^@/, "")
                            .replace(/\s+/g, "")
                            .slice(0, 32),
                        )
                      }
                      placeholder="bob"
                      autoFocus
                      className={cn(
                        "h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none",
                        "placeholder:text-muted-foreground/50",
                      )}
                    />
                  </div>
                </Field>
              )}

              <AmountInput
                variant="owner"
                id="send-amount"
                label="Amount"
                value={amount}
                onValueChange={setAmount}
                balance={privateBalance}
                isLoadingBalance={isLoadingBalance}
                invalid={overBalance}
                validationMessage={
                  overBalance
                    ? "Amount exceeds your private balance."
                    : null
                }
                autoFocus={mode === "link"}
                disabled={isSending}
              />


              <Field
                label="Memo"
                htmlFor="send-memo"
                hint={
                  mode === "handle"
                    ? "Encrypted to recipient."
                    : "Sealed until claim."
                }
              >
                <Textarea
                  id="send-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder={
                    mode === "handle"
                      ? "Rent split · April"
                      : "Birthday gift"
                  }
                  rows={2}
                  className="resize-none px-3 py-2 text-sm"
                />
              </Field>

              <PreviewCard
                mode={mode}
                recipient={recipient.trim()}
                amount={numericAmount}
                memo={memo.trim()}
                linkUrl={linkUrl}
              />

              {mode === "link" && (
                <AcknowledgmentCheckbox
                  checked={acknowledged}
                  onChange={setAcknowledged}
                />
              )}

              <Button
                type="submit"
                disabled={!canSubmit || isSending}
                className={cn(
                  "h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90",
                  "ring-1 ring-primary/30 transition-all active:translate-y-px",
                  "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
                  "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
                  "disabled:opacity-60 disabled:hover:bg-primary",
                )}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {mode === "handle" ? "Sending…" : "Creating link…"}
                  </>
                ) : mode === "handle" ? (
                  "Send privately"
                ) : (
                  "Create claimable link"
                )}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11.5px] leading-snug text-muted-foreground/85">
                <ShieldCheck className="size-3.5" strokeWidth={2} />
                Amount and memo stay off the public ledger.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeSwitch({
  mode,
  onChange,
  disabled,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
  disabled?: boolean;
}) {
  const options: { value: Mode; label: string; icon: React.ReactNode }[] = [
    {
      value: "handle",
      label: "To handle",
      icon: <AtSign className="size-3.5" strokeWidth={2.25} />,
    },
    {
      value: "link",
      label: "Claimable link",
      icon: <Link2 className="size-3.5" strokeWidth={2.25} />,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Send mode"
      className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-raised/40 p-1"
    >
      {options.map((opt) => {
        const selected = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition-all",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected
                ? "bg-card text-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_4px_10px_-6px_rgba(0,0,0,0.5)]"
                : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed opacity-55",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
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
  mode,
  recipient,
  amount,
  memo,
  linkUrl,
}: {
  mode: Mode;
  recipient: string;
  amount: number | null;
  memo: string;
  linkUrl: string;
}) {
  const showAmount = amount !== null;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 ring-1 ring-primary/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85">
          Preview
        </span>
        {mode === "link" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <KeyRound className="size-3" strokeWidth={2} />
            Bearer
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          {mode === "handle" ? (
            recipient ? (
              <HandleText handle={recipient} size="lg" />
            ) : (
              <span className="font-serif text-[20px] italic text-muted-foreground/50">
                @recipient
              </span>
            )
          ) : (
            <p className="truncate font-mono tabular text-[12.5px] text-foreground">
              {linkUrl}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {showAmount ? (
            <AmountDisplay amount={amount} size="lg" />
          ) : (
            <span className="font-mono tabular text-[20px] text-muted-foreground/40">
              0.00 <span className="text-[11px] uppercase">USDC</span>
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

function AcknowledgmentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "group/ack flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        checked
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-warning/30 bg-warning/[0.04] hover:border-warning/45",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border transition-all",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-warning/55 bg-transparent text-transparent group-hover/ack:border-warning/75",
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider text-warning">
          <TriangleAlert className="size-3" strokeWidth={2.25} />
          One-time link
        </span>
        <span className="text-[12.5px] leading-snug text-foreground/90">
          I understand anyone with this URL can claim the funds. Monyr
          won&apos;t store or show this link again.
        </span>
      </span>
    </button>
  );
}

function DonePanel({
  mode,
  recipient,
  amount,
  memo,
  linkUrl,
  copied,
  onCopy,
  onClose,
}: {
  mode: Mode;
  recipient: string;
  amount: number;
  memo: string;
  linkUrl: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-5 ring-1 ring-primary/15">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/85">
              {mode === "handle" ? "To" : "Claimable link"}
            </p>
            <h4 className="mt-1 font-serif text-[22px] leading-tight tracking-tight text-foreground">
              {mode === "handle" ? (
                <HandleText handle={recipient} size="lg" />
              ) : (
                <span className="inline-flex items-center gap-2 text-foreground">
                  <KeyRound
                    className="size-4 text-primary"
                    strokeWidth={2.25}
                  />
                  Bearer · awaiting claim
                </span>
              )}
            </h4>
          </div>
          <AmountDisplay amount={amount} size="lg" />
        </div>

        {mode === "link" ? (
          <button
            type="button"
            onClick={onCopy}
            autoFocus
            className={cn(
              "mt-4 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-3 text-left transition-all",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              copied
                ? "border-success/45 bg-success/[0.06]"
                : "border-primary/40 bg-primary/[0.06] hover:border-primary/60 hover:bg-primary/[0.10]",
            )}
          >
            <span className="min-w-0 truncate font-mono tabular text-[12.5px] text-foreground">
              {linkUrl}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold transition-colors",
                copied ? "text-success" : "text-primary",
              )}
            >
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
        ) : (
          memo && (
            <p className="mt-4 border-t border-primary/15 pt-3 font-serif text-[13px] italic leading-relaxed text-muted-foreground/85">
              “{memo}”
            </p>
          )
        )}

        {mode === "link" && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] leading-snug text-warning">
            <TriangleAlert className="size-3" strokeWidth={2.25} />
            This is the only time you&apos;ll see this link.
          </p>
        )}
      </div>

      {mode === "link" && (
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          className="h-10 w-full rounded-xl border-border-strong/50 bg-surface-raised/40 text-[13px] font-medium text-foreground hover:bg-surface-raised/70"
        >
          {copied ? "I've saved the link" : "I've copied the link"}
        </Button>
      )}

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground/80">
        Mock preview · sending isn&apos;t wired up yet.
      </p>
    </div>
  );
}
