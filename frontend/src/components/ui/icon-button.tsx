/** Olgun Özoktaş geliştirdi · API Lab */
// An icon-only action button. Icon-only controls are a discoverability
// trap, so a `tooltip` is first-class here: pass it and the button is
// wrapped in the styled Tooltip primitive on hover/focus. `aria-label`
// stays required by convention — the tooltip is sighted-only.
import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export type IconButtonProps = ButtonProps & {
  // The lucide (or any) icon element to render.
  icon: React.ReactNode;
  // When set, the button gets a hover/focus tooltip. Plain string or
  // rich node (e.g. label + a <KbdHint>).
  tooltip?: React.ReactNode;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, tooltip, variant = "ghost", size = "sm", ...props }, ref) => {
    const button = (
      <Button ref={ref} variant={variant} size={size} {...props}>
        {icon}
      </Button>
    );
    if (tooltip === undefined) return button;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
);
IconButton.displayName = "IconButton";
