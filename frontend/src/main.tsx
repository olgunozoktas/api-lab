import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
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
    "padding:12px 16px",
    "background:#c53030",
    "color:#fff",
    "font:13px/1.5 system-ui,-apple-system,sans-serif",
    "white-space:pre-wrap",
    "word-break:break-word",
    "max-height:40vh",
    "overflow:auto",
    "box-shadow:0 2px 8px rgba(0,0,0,0.3)",
  ].join(";");
  banner.textContent = "API Lab — fatal error: " + message;
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
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} catch (e) {
  showFatalBanner((e as Error)?.stack || String(e));
  throw e;
}
