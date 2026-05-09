import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 " +
  "focus-visible:ring-offset-[var(--color-bg)] " +
  "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:    "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90",
        secondary:  "bg-[var(--color-bg-elev-2)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]/80",
        ghost:      "bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]",
        danger:     "bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90",
        outline:    "border border-[var(--color-border)] bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]",
        dashed:     "border border-dashed border-[var(--color-border)] bg-transparent text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
      },
      size: {
        sm: "h-7  px-2.5",
        md: "h-8  px-3",
        lg: "h-10 px-4 text-sm",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
