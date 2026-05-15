/**
 * API Lab — native macOS Postman-style API tester.
 *
 * Author:  Olgun Özoktaş <https://github.com/olgunozoktas>
 * Repo:    https://github.com/olgunozoktas/api-lab
 * License: PolyForm Noncommercial 1.0.0 + attribution addendum (see LICENSE)
 *
 * main.tsx — React mount + global fatal-error banner. The banner is
 * injected directly into <body> so users see crashes even when the React
 * tree never gets a chance to render.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DialogsProvider } from "./lib/dialogs";
import "./main.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root in index.html");

// Surface crashes that React's error boundary doesn't catch (async
// errors, unhandled promise rejections, bridge dispatch failures).
// We render a small banner on top of <html> so the user sees something
// even if the React tree never mounts.
function showFatalBanner(message: string) {
  const id = "api-lab-fatal-banner";
  if (document.getElementById(id)) return;
  const banner = document.createElement("div");
  banner.id = id;
  banner.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "right:0",
    "z-index:99999",
    "display:flex",
    "align-items:flex-start",
    "gap:12px",
    "padding:12px 16px",
    "background:#c53030",
    "color:#fff",
    "font:13px/1.5 system-ui,-apple-system,sans-serif",
    "box-shadow:0 2px 8px rgba(0,0,0,0.3)",
  ].join(";");

  // The message scrolls inside its own box so a long stack trace can't
  // push the dismiss button off-screen.
  const text = document.createElement("div");
  text.style.cssText = [
    "flex:1",
    "white-space:pre-wrap",
    "word-break:break-word",
    "max-height:40vh",
    "overflow:auto",
  ].join(";");
  text.textContent = "API Lab — fatal error: " + message;

  // Dismiss button — the error is shown for visibility, but many of
  // these (async / bridge failures) leave the app usable, so let the
  // user clear the banner and keep working. A fresh error re-shows it.
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Dismiss error");
  closeBtn.title = "Dismiss";
  closeBtn.textContent = "×";
  closeBtn.style.cssText = [
    "flex:none",
    "cursor:pointer",
    "background:transparent",
    "border:0",
    "color:#fff",
    "font:20px/1 system-ui,-apple-system,sans-serif",
    "padding:0 4px",
    "opacity:0.85",
  ].join(";");
  closeBtn.addEventListener("click", () => banner.remove());
  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.opacity = "1";
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.opacity = "0.85";
  });

  banner.appendChild(text);
  banner.appendChild(closeBtn);
  document.body?.appendChild(banner);
}

window.addEventListener("error", (ev) => {
  const msg = ev.error?.stack || ev.message || String(ev.error);
  showFatalBanner(msg);
});
window.addEventListener("unhandledrejection", (ev) => {
  const msg = (ev.reason as Error)?.stack || String(ev.reason);
  showFatalBanner("unhandled promise rejection: " + msg);
});

try {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <DialogsProvider>
          <App />
        </DialogsProvider>
      </ErrorBoundary>
    </StrictMode>
  );
} catch (e) {
  showFatalBanner((e as Error)?.stack || String(e));
  throw e;
}
