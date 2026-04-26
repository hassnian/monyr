import { cn } from "@/lib/utils";

type Props = {
  handle: string;
  subPath?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeMap: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

/**
 * The handle is the brand primitive.
 * `@` is always one tone dimmer than the name.
 * Medium-weight sans, tight tracking — no full mono (too brittle).
 */
export function HandleText({ handle, subPath, className, size = "md" }: Props) {
  const bare = handle.replace(/^@/, "");
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-medium tracking-tight",
        sizeMap[size],
        className
      )}
    >
      <span className="text-muted-foreground/70" aria-hidden>
        @
      </span>
      <span className="text-foreground">{bare}</span>
      {subPath && (
        <>
          <span
            className="text-muted-foreground/50 px-0.5 font-normal"
            aria-hidden
          >
            /
          </span>
          <span className="text-foreground/80 font-normal">{subPath}</span>
        </>
      )}
    </span>
  );
}
