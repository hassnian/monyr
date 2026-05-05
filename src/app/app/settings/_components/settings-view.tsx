"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";

import { handleUrl } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { GradientAvatar } from "@/components/payments/gradient-avatar";
import { HandleText } from "@/components/payments/handle-text";

import type { AuthUser } from "@/app/contexts/auth-context";

import { VaultAddressCard } from "./vault-address-card";
import { SecretKeyCard } from "./secret-key-card";

type Props = {
  user: AuthUser;
  onRefresh?: () => void | Promise<void>;
};

type SectionValue = "vault" | "security";

/**
 * Settings reads as a sub-section of the same workspace surface — the
 * masthead, divider, and tab grammar all mirror the dashboard so navigation
 * across `/app` feels like one continuous document. Identity stays anchored;
 * only the eyebrow and the tab row change.
 */
export function SettingsView({ user }: Props) {
  const [active, setActive] = useState<SectionValue>("vault");

  const sections = [
    { value: "vault" as const, label: "Vault" },
    { value: "security" as const, label: "Security" },
  ];

  return (
    <>
      <div className="flex flex-col gap-10">
        <SettingsMasthead user={user} />

        <div className="h-px w-full bg-border/60" />

        <section aria-label="Settings sections" className="flex flex-col gap-6">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="flex items-end gap-1 border-b border-border/80 pb-0"
          >
            {sections.map((s) => {
              const isActive = active === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`settings-panel-${s.value}`}
                  id={`settings-tab-${s.value}`}
                  onClick={() => setActive(s.value)}
                  className={cn(
                    "relative -mb-px inline-flex items-end gap-2 px-3 pb-3 pt-1.5 text-[13px] font-medium outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring/50",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="tracking-tight">{s.label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-t transition-all",
                      isActive
                        ? "bg-primary opacity-100"
                        : "bg-transparent opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div
            id={`settings-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${active}`}
            className="min-h-[320px]"
          >
            {active === "vault" && (
              <VaultAddressCard vaultPubkey={user.vaultPubkey} />
            )}
            {active === "security" && <SecretKeyCard user={user} />}
          </div>
        </section>
      </div>

      <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6 text-[12px] text-muted-foreground/70">
        <p className="font-serif italic">
          Non-custodial. Keys never leave your device.
        </p>
        <p className="font-mono tabular text-[11px] uppercase tracking-[0.2em]">
          Monyr v0.1 · Settings
        </p>
      </footer>
    </>
  );
}

function SettingsMasthead({ user }: { user: AuthUser }) {
  const url = handleUrl(user.handle);
  const [copied, setCopied] = useState(false);
  const displayName = user.displayName?.trim() || user.handle;

  function copy() {
    try {
      navigator.clipboard?.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked — ignore. */
    }
  }

  return (
    <section aria-labelledby="settings-name" className="relative">
      {/* Mirrors the dashboard candlelight so the surface reads as one room. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 45% at 25% 50%, oklch(0.82 0.11 72 / 0.14), transparent 70%)",
        }}
      />
      <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="flex items-start gap-5">
          <GradientAvatar handle={user.handle} size={84} />
          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Settings
              <UmbraStatusPill status={user.umbraStatus} />
            </p>
            <h1
              id="settings-name"
              className="font-serif text-4xl leading-[1.04] tracking-tight text-foreground md:text-5xl"
            >
              {displayName}
            </h1>
            <div className="pt-1">
              <HandleText
                handle={user.handle}
                size="md"
                className="text-muted-foreground/85"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copy}
            aria-live="polite"
            className={cn(
              "group inline-flex h-10 items-center gap-2.5 rounded-lg px-3.5 text-[13px] font-medium",
              "border border-border-strong/60 bg-surface-raised/40 backdrop-blur-sm",
              "transition-all hover:border-primary/45 hover:bg-surface-raised/70",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <span className="font-mono tabular text-[12.5px] text-foreground/90">
              {url}
            </span>
            <span aria-hidden className="h-4 w-px bg-border" />
            {copied ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Check className="size-3.5" strokeWidth={2.5} />
                Copied
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground">
                <Copy className="size-3.5" />
                Copy link
              </span>
            )}
          </button>

          <Link
            href={`/@${user.handle}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Open profile"
            className={cn(
              "grid size-10 place-items-center rounded-lg border text-muted-foreground transition-all",
              "border-border-strong/60 bg-surface-raised/40 backdrop-blur-sm",
              "hover:border-primary/45 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function UmbraStatusPill({ status }: { status: AuthUser["umbraStatus"] }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-success">
        <ShieldCheck className="size-3" strokeWidth={2.25} />
        Private
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised/40 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground/90">
      Not yet activated
    </span>
  );
}
