import { TopBar } from "./_components/top-bar";
import { IdentityStrip } from "./_components/identity-strip";
import { MetricsBand } from "./_components/metrics-band";
import { QuickActions } from "./_components/quick-actions";
import { DashboardTabs } from "./_components/dashboard";
import { profile } from "./_data";

export const metadata = {
  title: "Monyr — Dashboard",
  description: "Your private payments workspace.",
};

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Atmospheric layers, per design §7. Grain + single amber vignette. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, oklch(0.82 0.11 72 / 0.06) 0%, transparent 55%)",
        }}
      />
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />
      {/* Editorial ornamental @ — echoes the landing page, but quieter. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-[10vw] top-[24%] hidden select-none font-serif italic md:inline-block"
        style={{
          fontSize: "clamp(20rem, 40vw, 46rem)",
          lineHeight: 0.78,
          fontWeight: 400,
          color: "oklch(0.82 0.11 72)",
          opacity: 0.022,
          letterSpacing: "-0.04em",
        }}
      >
        @
      </span>

      <TopBar handle={profile.handle} />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-10 md:px-10 md:pt-12">
        <div className="flex flex-col gap-10">
          <IdentityStrip profile={profile} />
          <MetricsBand />
          <QuickActions />
          <div className="h-px w-full bg-border/60" />
          <DashboardTabs />
        </div>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6 text-[12px] text-muted-foreground/70">
          <p className="font-serif italic">
            Non-custodial. Amounts, memos, and senders stay off the public
            ledger.
          </p>
          <p className="font-mono tabular text-[11px] uppercase tracking-[0.2em]">
            Monyr v0.1 · Solana mainnet
          </p>
        </footer>
      </main>
    </div>
  );
}
