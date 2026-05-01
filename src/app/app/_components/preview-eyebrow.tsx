import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Honest "this surface is design-only" marker. Sits at the top of any
 * dashboard pane whose data is still mocked, so the user can scan the layout
 * without trusting the numbers it contains.
 */
export function PreviewEyebrow({
  note,
  className,
}: {
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-raised/40 px-3 py-1",
        "font-mono tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80",
        className,
      )}
    >
      <Sparkles className="size-3 text-primary/85" strokeWidth={2.25} />
      Preview
      {note ? (
        <>
          <span aria-hidden className="text-muted-foreground/30">
            ·
          </span>
          <span className="font-sans normal-case tracking-normal italic text-muted-foreground/85">
            {note}
          </span>
        </>
      ) : null}
    </div>
  );
}
