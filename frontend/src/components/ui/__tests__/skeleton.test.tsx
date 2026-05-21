/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render } from "@testing-library/react";
import { Skeleton } from "../skeleton";

// First render-coverage tests for the ui/ primitive library. Pinned
// here so a regression in `forwardRef` wiring, ARIA defaults, or
// `className` merge precedence breaks the build instead of shipping
// to the live UI. The whole suite now runs under jsdom so any
// `.tsx` test files added later get the same treatment.

describe("<Skeleton>", () => {
  it("renders a div with the shimmer + default sizing classes", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(div.className).toContain("animate-pulse");
    expect(div.className).toContain("h-4");
    expect(div.className).toContain("w-full");
  });

  it("merges callsite className with the defaults", () => {
    const { container } = render(<Skeleton className="h-32 rounded-full" />);
    const div = container.firstChild as HTMLElement;
    // Default sizing classes stay (h-4) AND callsite override appends
    // (h-32) — Tailwind picks the last one at compute time. Both
    // tokens must be present in the class list.
    expect(div.className).toContain("animate-pulse");
    expect(div.className).toContain("h-32");
    expect(div.className).toContain("rounded-full");
  });

  it("is aria-hidden by default — decoration, not content", () => {
    // Skeleton communicates "loading" through its parent's
    // surrounding chrome; the placeholder itself isn't useful to a
    // screen-reader. Pin the default so a careless edit doesn't
    // remove it.
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute("aria-hidden")).toBe("true");
  });

  it("forwards ref to the underlying div", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} data-testid="sk" />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current?.dataset.testid).toBe("sk");
  });

  it("passes through arbitrary HTML attributes", () => {
    const { container } = render(<Skeleton id="loading-row" role="progressbar" />);
    const div = container.firstChild as HTMLElement;
    expect(div.id).toBe("loading-row");
    expect(div.getAttribute("role")).toBe("progressbar");
  });
});
