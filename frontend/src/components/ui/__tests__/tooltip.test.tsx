/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../tooltip";

// Render coverage for the Radix-wrapped Tooltip primitive. The
// open-state portal-mount + animation transitions aren't exercised
// here — they're Radix's responsibility — but the wrapper's static
// contract IS: trigger renders its child, the Tooltip's
// self-contained Provider doesn't crash, content stays closed by
// default. Catches forwardRef regressions + accidental Provider
// removal.

describe("<Tooltip>", () => {
  it("renders the trigger child without erroring", () => {
    // The trigger always renders; the content lives in a portal and
    // only mounts on hover/focus, which is not asserted here.
    const { getByText } = render(
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button">hover me</button>
        </TooltipTrigger>
        <TooltipContent>tip text</TooltipContent>
      </Tooltip>
    );
    expect(getByText("hover me")).toBeDefined();
    expect(getByText("hover me").tagName).toBe("BUTTON");
  });

  it("does NOT render content in the DOM by default (closed state)", () => {
    // Radix Tooltip mounts the portal only when open. Pin the
    // default-closed behaviour so a careless edit (e.g. `defaultOpen`
    // sneaking in) doesn't accidentally render every tooltip's text
    // at app launch.
    const { queryByText } = render(
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button">trigger</button>
        </TooltipTrigger>
        <TooltipContent>this should not appear</TooltipContent>
      </Tooltip>
    );
    expect(queryByText("this should not appear")).toBeNull();
  });

  // Open-state rendering is intentionally NOT asserted here: Radix
  // Tooltip portals its content asynchronously even when
  // `defaultOpen` is set, so a synchronous query right after `render`
  // returns null. Async portal-mount coverage belongs in interaction
  // tests (a future @testing-library/user-event slice), not in this
  // contract-pinning file.
});
