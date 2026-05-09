import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "../../lib/cn";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 gap-0.5",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap border-0 bg-transparent " +
        "px-3.5 py-2 text-xs font-medium border-b-2 -mb-px outline-none " +
        "text-[var(--color-fg-muted)] border-transparent transition-colors " +
        "hover:text-[var(--color-fg)] " +
        "focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] " +
        "data-[state=active]:text-[var(--color-fg)] " +
        "data-[state=active]:border-[var(--color-accent)] " +
        "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("flex-1 overflow-y-auto outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
