/** Olgun Özoktaş geliştirdi · API Lab */
// Reusable empty-state template — icon, title, description, optional
// call-to-action, and a children slot for extra content (tip lists,
// recent-history rows). Pure presenter: no store, no app logic, so it
// drops into any surface. Every prop but `title` is optional.
//
// Two sizes. `default` is the rich first-impression surface (bold
// title, generous padding). `compact` is for dense inline "no results"
// states that sit inside a scroll area — the title renders muted and
// small so it reads as a quiet hint, not a headline. The size has to
// be a prop, not a `className` override, because the caller's
// `className` merges onto the root <div> only and can't reach the
// title element's baked typography.
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
  // `default` — rich first-impression surface. `compact` — dense
  // inline no-results hint (muted small title, tighter padding).
  size?: "default" | "compact";
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, children, size = "default", ...props }, ref) => {
    const compact = size === "compact";
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center text-center px-4 gap-2",
          compact ? "py-6" : "py-8",
          className
        )}
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
        <div
          className={cn(
            compact
              ? "text-2xs text-[var(--color-fg-muted)]"
              : "text-sm font-medium text-[var(--color-fg)]"
          )}
        >
          {title}
        </div>
        {description && (
          <div className="text-2xs text-[var(--color-fg-muted)] leading-relaxed max-w-xs">
            {description}
          </div>
        )}
        {action && <div className="mt-1">{action}</div>}
        {children && <div className="mt-1 w-full">{children}</div>}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";
