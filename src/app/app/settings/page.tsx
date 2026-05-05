import { SettingsShell } from "./_components/settings-shell";

export const metadata = {
  title: "Monyr — Settings",
  description: "Manage your vault address and decryption secret.",
};

export default function SettingsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Atmospheric layers, mirrored from the dashboard so the surface reads
          as one continuous workspace. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, oklch(0.82 0.11 72 / 0.06) 0%, transparent 55%)",
        }}
      />
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />

      <SettingsShell />
    </div>
  );
}
