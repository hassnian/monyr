import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Pixel-mirror skeleton of the live dashboard. Same spacing, same heights,
 * same column ratios — so the swap from skeleton → real content is invisible.
 * Render directly inside the workspace background; no atmospheric layers
 * needed because the page already provides them.
 */
export function DashboardSkeleton() {
  return (
    <>
      <TopBarSkeleton />
      <main
        aria-busy
        aria-label="Loading workspace"
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-10 md:px-10 md:pt-12"
      >
        <div className="flex flex-col gap-10">
          <IdentityStripSkeleton />
          <MetricsBandSkeleton />
          <QuickActionsSkeleton />
          <div className="h-px w-full bg-border/60" />
          <DashboardTabsSkeleton />
        </div>
      </main>
    </>
  );
}

function TopBarSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10">
        <div className="flex items-center gap-5">
          <Skeleton className="h-6 w-24 rounded" />
          <span aria-hidden className="h-4 w-px bg-border" />
          <nav className="flex items-center gap-1">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </nav>
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
    </header>
  );
}

function IdentityStripSkeleton() {
  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 45% at 25% 50%, oklch(0.82 0.11 72 / 0.10), transparent 70%)",
        }}
      />
      <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="flex items-start gap-5">
          <Skeleton className="size-[84px] shrink-0 rounded-full" />
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-10 w-72 rounded md:h-12 md:w-96" />
            <div className="pt-1">
              <Skeleton className="h-5 w-40 rounded" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-10 w-52 rounded-lg" />
          <Skeleton className="h-10 w-44 rounded-lg" />
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="size-10 rounded-lg" />
        </div>
      </div>
    </section>
  );
}

function MetricsBandSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-32 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Hero tile — col-span-3 */}
        <TileSkeleton className="md:col-span-3">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
          <Skeleton className="mt-4 h-[68px] w-full rounded" />
          <div className="mt-2 flex justify-between">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </TileSkeleton>

        {/* Three small tiles */}
        <TileSkeleton className="md:col-span-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-2 h-3 w-20" />
        </TileSkeleton>
        <TileSkeleton className="md:col-span-1">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-24" />
        </TileSkeleton>
        <TileSkeleton className="md:col-span-1">
          <Skeleton className="h-9 w-12" />
          <Skeleton className="mt-2 h-3 w-28" />
        </TileSkeleton>
      </div>
    </section>
  );
}

function TileSkeleton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[148px] flex-col justify-between rounded-xl border border-border bg-card/80 p-5",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.025)_inset,0_24px_48px_-32px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border border-border bg-card/70 p-4",
            )}
          >
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardTabsSkeleton() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end gap-1 border-b border-border/80">
        <TabSkeleton wide active />
        <TabSkeleton />
        <TabSkeleton wide />
        <TabSkeleton />
      </div>
      <div className="min-h-[320px] space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function TabSkeleton({ active, wide }: { active?: boolean; wide?: boolean }) {
  return (
    <div className="relative -mb-px inline-flex items-end gap-2 px-3 pb-3 pt-1.5">
      <Skeleton className={cn("h-4 rounded", wide ? "w-24" : "w-16")} />
      <Skeleton className="h-3.5 w-6 rounded" />
      {active && (
        <span
          aria-hidden
          className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-t bg-primary/40"
        />
      )}
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-card/50 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-3.5 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden flex-col items-end gap-1.5 sm:flex">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="size-7 rounded-md" />
      </div>
    </div>
  );
}
