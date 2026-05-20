/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { shouldInterceptExternalLink, type LinkClickShape } from "../externalLinks";

// Pure-function tests for the predicate the hook installs. By
// staying off the DOM (the hook just packages a `MouseEvent` into a
// LinkClickShape before calling this), the suite stays in the
// default `node` vitest environment — no jsdom dependency needed.

function shape(over: Partial<LinkClickShape> = {}): LinkClickShape {
  return {
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    anchorTarget: "_blank",
    anchorHref: "https://example.com",
    ...over,
  };
}

describe("shouldInterceptExternalLink", () => {
  it("accepts http and https links with target=_blank", () => {
    expect(shouldInterceptExternalLink(shape({ anchorHref: "https://example.com" }))).toBe(true);
    expect(shouldInterceptExternalLink(shape({ anchorHref: "http://127.0.0.1:8080" }))).toBe(true);
  });

  it("rejects non-http schemes (mailto, javascript, file, data, anchors, relative)", () => {
    for (const href of [
      "mailto:user@example.com",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "data:text/html,<x>",
      "#anchor",
      "/relative",
      "",
    ]) {
      expect(shouldInterceptExternalLink(shape({ anchorHref: href })), `href=${href}`).toBe(false);
    }
  });

  it("rejects anchors without target=_blank", () => {
    expect(shouldInterceptExternalLink(shape({ anchorTarget: null }))).toBe(false);
    expect(shouldInterceptExternalLink(shape({ anchorTarget: "_self" }))).toBe(false);
    expect(shouldInterceptExternalLink(shape({ anchorTarget: "" }))).toBe(false);
  });

  it("rejects modifier-key clicks so ⌘/Ctrl/Shift/Alt+click keep their meaning", () => {
    expect(shouldInterceptExternalLink(shape({ metaKey: true }))).toBe(false);
    expect(shouldInterceptExternalLink(shape({ ctrlKey: true }))).toBe(false);
    expect(shouldInterceptExternalLink(shape({ shiftKey: true }))).toBe(false);
    expect(shouldInterceptExternalLink(shape({ altKey: true }))).toBe(false);
  });

  it("rejects clicks whose default has already been prevented", () => {
    // A higher-priority handler (e.g. a router) marked this as handled;
    // we must not double-intercept.
    expect(shouldInterceptExternalLink(shape({ defaultPrevented: true }))).toBe(false);
  });
});
