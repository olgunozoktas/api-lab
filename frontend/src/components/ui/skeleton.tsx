/** Olgun Özoktaş geliştirdi · API Lab */
import * as React from "react";
import { cn } from "../../lib/cn";

// Token-driven shimmer placeholder. Defaults to a single text-line
// height; pass `className` for any width/height/shape — e.g.
// `rounded-full w-8 h-8` for an avatar, `h-32` for a block.
export const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden
      className={cn("h-4 w-full animate-pulse rounded bg-[var(--color-bg-elev-2)]", className)}
      {...props}
    />
  ),
);
Skeleton.displayName = "Skeleton";
