import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logomark } from "@/components/hush/logomark";
import { LandingProfilePreview } from "@/components/hush/landing-profile-preview";
import { SolanaMark } from "@/components/hush/solana-mark";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Hush — Get paid at @yourname",
  description:
    "Turn your handle into a payment profile. Share one link anywhere — no wallet addresses to copy, no public ledger to scan. Just USDC, landing in your wallet.",
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="amber-vignette pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0"
      />
      <OrnamentalAt />

      <header className="relative z-10 flex items-center px-6 py-6 md:px-10 md:py-8">
        <Logomark />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-6 pb-24 md:px-10 md:pt-12 md:pb-32">
        <div className="grid gap-16 md:grid-cols-12 md:items-center md:gap-10 lg:gap-16">
          <HeroCopy />
          <HeroFigure />
        </div>
      </main>
    </div>
  );
}

function HeroCopy() {
  return (
    <div className="md:col-span-7">
      <h1 className="font-serif text-[2.75rem] leading-[1.02] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[5rem]">
        Get paid at{" "}
        <span className="relative whitespace-nowrap text-primary">
          @yourname
          <Caret />
        </span>
        <span className="text-primary">.</span>
      </h1>

      <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Hush turns your handle into a payment profile. Share one link in a bio,
        a newsletter, an invoice, a QR — no wallet addresses to copy, no public
        ledger to scan. Just USDC, landing in your wallet.
      </p>

      <div className="mt-9">
        <Link
          href="/claim"
          className={cn(
            "inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "ring-1 ring-primary/30 transition-all",
            "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
            "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
            "active:translate-y-px"
          )}
        >
          Claim your handle
          <ArrowRight className="ml-1.5 size-4" />
        </Link>
      </div>

      <p className="mt-14 flex max-w-md flex-wrap items-center gap-x-1.5 font-serif text-[14px] italic leading-relaxed text-muted-foreground/75">
        <span>Non-custodial. Gas-free for payers. Live on</span>
        <SolanaMark className="h-[0.72em] w-auto translate-y-[0.02em] text-foreground/70" />
        <span>Solana mainnet — amounts, memos, and senders stay off the public ledger.</span>
      </p>
    </div>
  );
}

function HeroFigure() {
  return (
    <figure className="md:col-span-5">
      <div className="relative mx-auto max-w-sm md:ml-auto md:mr-0 md:-rotate-[1.2deg]">
        <LandingProfilePreview />
      </div>
      <figcaption className="mt-6 text-center font-serif text-[13px] italic leading-relaxed text-muted-foreground/70 md:text-right">
        Fig. 01 &nbsp;·&nbsp; A public profile, rendered live at{" "}
        <span className="font-mono not-italic tracking-tight text-foreground/80">
          hush.to/@alice
        </span>
      </figcaption>
    </figure>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[0.9em] w-[3px] -translate-y-[0.05em] translate-x-[1px] rounded-[1px] bg-primary align-middle"
      style={{ animation: "hushCaret 1.1s steps(1, end) infinite" }}
    >
      <style>{`
        @keyframes hushCaret {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes hushCaret { 0%, 100% { opacity: 1; } }
        }
      `}</style>
    </span>
  );
}

function OrnamentalAt() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-[8vw] top-[4%] hidden select-none font-serif italic md:inline-block"
      style={{
        fontSize: "clamp(22rem, 44vw, 52rem)",
        lineHeight: 0.78,
        fontWeight: 400,
        color: "oklch(0.82 0.11 72)",
        opacity: 0.035,
        letterSpacing: "-0.04em",
      }}
    >
      @
    </span>
  );
}
