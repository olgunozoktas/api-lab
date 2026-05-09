// Right-click context menu — Radix wrapper, theme-styled to match the
// existing ui/ primitives (button.tsx, tabs.tsx). Used by CollectionList
// for folder + request row actions (rename, delete, new sub-folder, …).

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as React from "react";
import { cn } from "../../lib/cn";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] py-1",
        "shadow-lg outline-none",
        // tw-animate-css enter/exit (shadcn-style). Smooth fade + tiny
        // zoom + slide so the menu doesn't feel like it slammed in.
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
        "data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
        "duration-150",
        className,
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = "ContextMenuContent";

type ItemProps = React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
  danger?: boolean;
};

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  ItemProps
>(({ className, danger, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer outline-none transition-colors duration-100",
      "data-[highlighted]:bg-[var(--color-bg-elev-2)] data-[highlighted]:text-[var(--color-fg)]",
      "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
      danger &&
        "text-[var(--color-danger)] data-[highlighted]:text-white data-[highlighted]:bg-[var(--color-danger)]",
      className,
    )}
    {...props}
  />
));
ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-[var(--color-border)]", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = "ContextMenuSeparator";

export const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn("px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]", className)}
    {...props}
  />
));
ContextMenuLabel.displayName = "ContextMenuLabel";
