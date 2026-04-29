"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { useAuth } from "@/app/contexts/auth-context";
import { cn } from "@/lib/utils";

const SHARED = cn(
  "inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold",
  "bg-primary text-primary-foreground hover:bg-primary/90",
  "ring-1 ring-primary/30 transition-all",
  "shadow-[0_0_0_1px_rgba(240,184,122,0.2),0_8px_24px_-8px_rgba(240,184,122,0.45)]",
  "hover:shadow-[0_0_0_1px_rgba(240,184,122,0.28),0_12px_32px_-8px_rgba(240,184,122,0.55)]",
  "active:translate-y-px",
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
);

/**
 * The landing hero's primary CTA. When the connected wallet already owns a
 * handle, the action becomes "Open dashboard" — there's nothing left to
 * claim. Otherwise we keep the original "Claim your handle" pitch.
 */
export function HeroPrimaryCta() {
  const { user } = useAuth();

  if (user) {
    return (
      <Link href="/app" className={SHARED} prefetch>
        <LayoutDashboard className="mr-1.5 size-4" strokeWidth={2} />
        Open dashboard
        <ArrowRight className="ml-1.5 size-4" />
      </Link>
    );
  }

  return (
    <Link href="/claim" className={SHARED}>
      Claim your handle
      <ArrowRight className="ml-1.5 size-4" />
    </Link>
  );
}
