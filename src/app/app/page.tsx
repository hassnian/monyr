import { DashboardShell } from "./_components/dashboard-shell";

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

      <DashboardShell />
    </div>
  );
}
