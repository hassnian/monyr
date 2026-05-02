"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Tag } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { handleUrl } from "@/lib/brand";
import { HandleText } from "@/components/payments/handle-text";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
};

type Phase = "form" | "creating" | "done";

const SLUG_RE = /[^a-z0-9-]/g;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(SLUG_RE, "")
    .slice(0, 32);
}

export function CreateLabelDialog({ open, onOpenChange, handle }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("form");
        setName("");
        setSlug("");
        setSlugTouched(false);
        setCopied(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-derive slug from name until the user edits the slug field directly.
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  const previewUrl = useMemo(
    () => (slug ? handleUrl(handle, slug) : handleUrl(handle, "label")),
    [handle, slug],
  );

  const canSubmit =
    phase === "form" && name.trim().length > 0 && slug.length > 0;

  async function handleCreate() {
    if (!canSubmit) return;
    setPhase("creating");
    await new Promise((r) => setTimeout(r, 600));
    setPhase("done");
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
          "sm:max-w-[460px] gap-0 overflow-hidden border border-border-strong/60 bg-popover p-0",
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
                Label live
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">
                <Tag className="size-3 text-primary" strokeWidth={2.25} />
                New label
              </span>
            )}
            <DialogTitle className="font-serif text-[26px] leading-[1.05] tracking-tight text-foreground">
              {phase === "done"
                ? "Label is ready."
                : "Group payments by client."}
            </DialogTitle>
            <DialogDescription className="max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">
              {phase === "done"
                ? "Share the URL. Payments through it group under this label — context for you, simplicity for them."
                : "Per-client paths. You see the context, the payer just sees the label."}
            </DialogDescription>
          </div>

          {phase === "done" ? (
            <DonePanel
              previewUrl={previewUrl}
              handle={handle}
              slug={slug}
              name={name.trim()}
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
              <Field
                label="Name"
                htmlFor="label-name"
                hint="Only you see this."
              >
                <Input
                  id="label-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Corp"
                  className="h-10 px-3 text-sm"
                  autoFocus
                />
              </Field>

              <Field label="URL slug" htmlFor="label-slug">
                <div
                  className={cn(
                    "flex h-10 items-center gap-1 rounded-lg border border-input bg-transparent px-3 transition-colors",
                    "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                    "dark:bg-input/30",
                  )}
                >
                  <HandleText
                    handle={handle}
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="text-muted-foreground/50">/</span>
                  <input
                    id="label-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="acme"
                    className={cn(
                      "h-full min-w-0 flex-1 bg-transparent font-mono tabular text-sm text-foreground outline-none",
                      "placeholder:text-muted-foreground/50",
                    )}
                  />
                </div>
              </Field>

              <PreviewCard url={previewUrl} name={name.trim()} />

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
                    Creating label…
                  </>
                ) : (
                  "Create label"
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

function PreviewCard({ url, name }: { url: string; name: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85">
          Preview
        </span>
        <span className="text-[11px] text-muted-foreground/60">
          What payers see
        </span>
      </div>
      <p className="truncate font-mono tabular text-[13px] text-foreground">
        {url}
      </p>
      {name && (
        <p className="mt-1 truncate text-[12px] text-muted-foreground/75">
          Internal label: <span className="text-foreground/85">{name}</span>
        </p>
      )}
    </div>
  );
}

function DonePanel({
  previewUrl,
  handle,
  slug,
  name,
  copied,
  onCopy,
}: {
  previewUrl: string;
  handle: string;
  slug: string;
  name: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card/80 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <HandleText handle={handle} subPath={slug} size="md" />
            <p className="mt-1 truncate text-[13px] font-medium text-muted-foreground">
              {name}
            </p>
          </div>
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

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground/80">
        Mock preview · label creation isn&apos;t wired up yet.
      </p>
    </div>
  );
}
