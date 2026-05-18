/** Olgun Özoktaş geliştirdi · API Lab */
// Tooltip primitive — Radix Tooltip wrapped + theme-styled. Each
// Tooltip carries its own Provider (see the note below) so it works
// without app-root setup; content sits at z-1100.
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";
import { cn } from "../../lib/cn";

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> & {
  delayDuration?: number;
};

// Self-contained Tooltip — wraps its own Provider so a tooltip works
// anywhere without app-root setup. Mount a shared <TooltipProvider>
// higher up only when several tooltips should share one delay group.
export const Tooltip = ({ delayDuration = 300, children, ...props }: TooltipProps) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration}>
    <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);
Tooltip.displayName = "Tooltip";

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[1100] max-w-xs rounded-md border border-[var(--color-border)] " +
          "bg-[var(--color-bg-elev)] px-2.5 py-1.5 text-xs text-[var(--color-fg)] " +
          "shadow-lg select-none " +
          "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out " +
          "data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 " +
          "data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-[var(--color-bg-elev)]" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";
