/** Olgun Özoktaş geliştirdi · API Lab */
// Reusable empty-state template — icon, title, description, optional
// call-to-action, and a children slot for extra content (tip lists,
// recent-history rows). Pure presenter: no store, no app logic, so it
// drops into any surface. Every prop but `title` is optional.
import * as React from "react";
import { cn } from "../../lib/cn";

export type EmptyStateProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  // A lucide icon element, e.g. `<Inbox className="w-5 h-5" />`.
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  // A caller-owned CTA element (a <Button>, a link). The caller wires
  // the action so the template stays app-agnostic.
  action?: React.ReactNode;
  // Extra content rendered below the action — tip lists, restore CTAs.
  children?: React.ReactNode;
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col items-center text-center px-4 py-8 gap-2", className)}
      {...props}
    >
      {icon && (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="text-sm font-medium text-[var(--color-fg)]">{title}</div>
      {description && (
        <div className="text-2xs text-[var(--color-fg-muted)] leading-relaxed max-w-xs">
          {description}
        </div>
      )}
      {action && <div className="mt-1">{action}</div>}
      {children && <div className="mt-1 w-full">{children}</div>}
    </div>
  )
);
EmptyState.displayName = "EmptyState";
