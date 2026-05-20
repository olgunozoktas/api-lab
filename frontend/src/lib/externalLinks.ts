/** Olgun Özoktaş geliştirdi · API Lab */
// Global delegated click interceptor for external links (`<a
// target="_blank" href="https?://...">`). The WKWebView host doesn't
// honor `target="_blank"` — clicking such a link in zero-native
// would silently no-op (the browser has no popup-window concept
// when there's no native window manager wired). Route those clicks
// through the `shell.open` bridge so the OS default browser opens
// the URL instead.
//
// Single delegated listener (not per-component) so every existing
// `<a target="_blank">` in the tree benefits without touching each
// call-site. Safe to no-op outside zero-native — `shellOpen` returns
// false when the bridge is unavailable, in which case we let the
// browser's default handler take over (no `preventDefault`).
import { useEffect } from "react";
import { bridge, shellOpen } from "./bridge";

// Minimal click-shape the predicate needs. Wider than `MouseEvent`
// on purpose so the unit test can fake it without pulling in jsdom
// (the rest of the test suite runs in node environment).
export type LinkClickShape = {
  defaultPrevented: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  anchorTarget: string | null;
  anchorHref: string | null;
};

// Pure predicate — does this click on this anchor look like an
// external-link click we should route through shell.open? Exported
// so the test exercises the same rule the hook installs.
export function shouldInterceptExternalLink(c: LinkClickShape): boolean {
  if (c.defaultPrevented) return false;
  // Modifier-key clicks signal a different intent (⌘+click to copy
  // URL on macOS, ⌃+click as context menu, ⇧+click as "open in new
  // window"); leave those to the browser.
  if (c.metaKey || c.ctrlKey || c.altKey || c.shiftKey) return false;
  if (c.anchorTarget !== "_blank") return false;
  const href = c.anchorHref ?? "";
  return /^https?:\/\//i.test(href);
}

export function useExternalLinkInterceptor(): void {
  useEffect(() => {
    if (!bridge.available) return;
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      const shape: LinkClickShape = {
        defaultPrevented: e.defaultPrevented,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        anchorTarget: anchor?.target ?? null,
        anchorHref: anchor?.getAttribute("href") ?? null,
      };
      if (!shouldInterceptExternalLink(shape)) return;
      e.preventDefault();
      // Fire-and-forget — shellOpen never throws; a bridge failure
      // (denied permission, malformed URL) means the link just
      // doesn't open, same outcome as the current silent no-op but
      // without spurious console noise.
      void shellOpen(shape.anchorHref!);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
