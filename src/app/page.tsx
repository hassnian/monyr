import { handleUrl } from "@/lib/brand";
import Link from "next/link";
import { LandingProfilePreview } from "@/components/payments/landing-profile-preview";
import { SolanaMark } from "@/components/payments/solana-mark";
import { LandingNav } from "./_components/landing/landing-nav";
import { HeroPrimaryCta } from "./_components/landing/hero-primary-cta";
import { SectionLeak } from "./_components/landing/section-leak";
import { SectionWhat } from "./_components/landing/section-what";
import { SectionHow } from "./_components/landing/section-how";
import { SectionFaq } from "./_components/landing/section-faq";
import { SectionCta } from "./_components/landing/section-cta";
import { LandingFooter } from "./_components/landing/landing-footer";
import { SectionDivider } from "./_components/landing/section-frame";

export const metadata = {
  title: "Monyr — Get paid at @yourname",
  description:
    "A handle is a private payment profile on Solana. One signature, an encrypted vault, and a URL you can put in any bio — without handing the chain your wallet history.",
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="amber-vignette pointer-events-none absolute inset-x-0 top-0 h-[1200px]"
      />
      <div
        aria-hidden
        className="grain pointer-events-none absolute inset-0"
      />
      <OrnamentalAt />

      <LandingNav />

      <main className="relative z-10">
        {/* HERO — kept intact. Amber-on-identity word, italic-serif figcaption,
            figure tilt, the caret. The voice the rest of the page extends. */}
        <section
          aria-labelledby="hero-headline"
          className="mx-auto w-full max-w-7xl px-6 pt-6 pb-24 md:px-10 md:pt-12 md:pb-32"
        >
          <div className="grid gap-16 md:grid-cols-12 md:items-center md:gap-10 lg:gap-16">
            <HeroCopy />
            <HeroFigure />
          </div>
        </section>

        <SectionDivider />
        <SectionLeak />
        <SectionDivider />
        <SectionWhat />
        <SectionDivider />
        <SectionHow />
        <SectionDivider />
        <SectionFaq />
        <SectionCta />
      </main>

      <LandingFooter />
    </div>
  );
}

function HeroCopy() {
  return (
    <div className="md:col-span-7">
      <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1 font-mono tabular text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/85 backdrop-blur-sm">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        Private payments · by handle · on Solana
      </p>

      <h1
        id="hero-headline"
        className="font-serif text-[2.75rem] leading-[1.02] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[5rem]"
      >
        Get paid at{" "}
        <span className="relative whitespace-nowrap text-primary">
          @yourname
          <Caret />
        </span>
        <span className="text-primary">.</span>
      </h1>

      <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Monyr turns your handle into a payment profile. Share one link in a bio,
        a newsletter, an invoice, a QR — no wallet addresses to copy, no public
        ledger to scan. Just USDC, landing in a vault only you can decrypt.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <HeroPrimaryCta />
        <Link
          href="#how"
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl px-5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          How it works
          <span aria-hidden className="text-primary">↓</span>
        </Link>
      </div>

      <p className="mt-14 flex max-w-md flex-wrap items-center gap-x-1.5 font-serif text-[14px] italic leading-relaxed text-muted-foreground/75">
        <span>Non-custodial. One signature. Live on</span>
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
          {handleUrl("alice")}
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
