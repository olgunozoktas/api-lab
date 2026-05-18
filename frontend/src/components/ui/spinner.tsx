/** Olgun Özoktaş geliştirdi · API Lab */
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/cn";

const spinnerVariants = cva("shrink-0 animate-spin text-current", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-6 w-6",
    },
  },
  defaultVariants: { size: "sm" },
});

export interface SpinnerProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, "size">,
    VariantProps<typeof spinnerVariants> {}

// Generic indeterminate spinner. Inherits the current text colour, so
// `<Spinner className="text-[var(--color-accent)]" />` recolours it.
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, ...props }, ref) => (
    <Loader2 ref={ref} aria-hidden className={cn(spinnerVariants({ size }), className)} {...props} />
  ),
);
Spinner.displayName = "Spinner";

export { spinnerVariants };
