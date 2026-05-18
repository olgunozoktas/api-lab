/** Olgun Özoktaş geliştirdi · API Lab */
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded font-medium leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]",
        accent: "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
        success: "bg-green-500/15 text-[var(--color-success)]",
        warning: "bg-orange-500/15 text-[var(--color-warning)]",
        danger: "bg-red-500/15 text-[var(--color-danger)]",
        purple: "bg-purple-500/15 text-[var(--color-purple)]",
        info: "bg-sky-500/15 text-sky-500",
      },
      size: {
        sm: "px-1.5 py-0.5 text-3xs",
        md: "px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone, size }), className)} {...props} />
  ),
);
Badge.displayName = "Badge";

// Map an HTTP method to a badge tone — absorbs the colour intent of
// `methodClass` in lib/utils.ts so method pills can render as <Badge>.
// Case-insensitive (the old helper required upper-case input).
export function methodBadgeTone(method: string): BadgeTone {
  switch (method.toUpperCase()) {
    case "GET":
      return "success";
    case "POST":
      return "warning";
    case "PUT":
      return "info";
    case "PATCH":
      return "purple";
    case "DELETE":
      return "danger";
    default:
      return "neutral";
  }
}

// Map an HTTP status code to a badge tone — absorbs the colour intent
// of `statusPillClass` in lib/utils.ts (3xx shares the 2xx tone, as in
// the original helper).
export function statusBadgeTone(code: number): BadgeTone {
  if (code >= 500) return "danger";
  if (code >= 400) return "warning";
  if (code >= 200) return "success";
  return "neutral";
}

export { badgeVariants };
