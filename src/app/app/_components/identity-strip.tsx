"use client";

import { handleUrl } from "@/lib/brand";
import { useState } from "react";

import { Copy, Check, ExternalLink, Share2 } from "lucide-react";

import { GradientAvatar } from "@/components/payments/gradient-avatar";

import { HandleText } from "@/components/payments/handle-text";

import { cn } from "@/lib/utils";
import type { Profile } from "../_data";

type Props = {
  profile: Profile;
};

/**
 * Editorial masthead for the dashboard — large gradient avatar, serif display
 * name, and a copy-the-URL affordance that reads like a print colophon.
 */
export function IdentityStrip({ profile }: Props) {
  const url = handleUrl(profile.handle);
  const [copied, setCopied] = useState(false);

  function copy() {
    try {
      navigator.clipboard?.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked in some contexts — ignore for mock. */
    }
  }

  return (
    <section
      aria-labelledby="dashboard-name"
      className="relative"
    >
      {/* Soft candlelight behind the identity — once, not stacked with other glows. */}
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
          <GradientAvatar handle={profile.handle} size={84} />
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Your private workspace
            </p>
            <h1
              id="dashboard-name"
              className="font-serif text-4xl leading-[1.04] tracking-tight text-foreground md:text-5xl"
            >
              {profile.displayName}
            </h1>
            <div className="pt-1">
              <HandleText
                handle={profile.handle}
                size="md"
                className="text-muted-foreground/85"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
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
            <span
              aria-hidden
              className="h-4 w-px bg-border"
            />
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

          <IconAction
            href={`/@${profile.handle}`}
            label="Open profile"
            icon={<ExternalLink className="size-4" />}
          />
          <IconAction
            label="Share profile"
            icon={<Share2 className="size-4" />}
          />
        </div>
      </div>
    </section>
  );
}

function IconAction({
  href,
  label,
  icon,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
}) {
  const className = cn(
    "grid size-10 place-items-center rounded-lg border text-muted-foreground transition-all",
    "border-border-strong/60 bg-surface-raised/40 backdrop-blur-sm",
    "hover:border-primary/45 hover:text-foreground",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  );
  if (href) {
    return (
      <a href={href} aria-label={label} className={className} target="_blank" rel="noreferrer">
        {icon}
      </a>
    );
  }
  return (
    <button type="button" aria-label={label} className={className}>
      {icon}
    </button>
  );
}
