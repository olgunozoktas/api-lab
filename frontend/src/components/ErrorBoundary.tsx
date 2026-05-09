import { Component, type ReactNode } from "react";
import { resolveStackSafe, type ResolveResult } from "../lib/resolveStack";

// ErrorBoundary — last-line-of-defense for runtime crashes. Without it
// a thrown error during render leaves the user with a white screen and
// no clue what broke. With it, the UI swaps to a recovery panel that
// shows the error + a "Copy" button (one-shot to clipboard for pasting
// into AI agents / bug reports) + a "Reset state" escape hatch (clears
// localStorage so a wedged store doesn't trap the user).
//
// On catch we also kick off async source-map resolution against the
// `.js.map` sidecar Vite emits — by the time the render commits, the
// stack frames in this.state.resolvedStack carry real function + file
// names instead of minifier output. Falls back to the raw stack if the
// fetch / parse fails.
//
// Pair with the global onerror / onunhandledrejection listeners wired
// in main.tsx — those catch async errors that React doesn't see (event
// handlers fired by the bridge, unhandled Promise rejections, etc.).

type Props = { children: ReactNode };
type State = {
  error: Error | null;
  info: string | null;
  copied: boolean;
  resolvedStack: string | null;
  resolveStats: ResolveResult | null;
  resolving: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    info: null,
    copied: false,
    resolvedStack: null,
    resolveStats: null,
    resolving: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      error,
      info: null,
      copied: false,
      resolvedStack: null,
      resolveStats: null,
      resolving: false,
    };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({
      error,
      info: info.componentStack ?? null,
      copied: false,
      resolving: !!error.stack,
      resolvedStack: null,
      resolveStats: null,
    });
    // eslint-disable-next-line no-console
    console.error("[api-lab] React error boundary caught:", error, info);
    if (error.stack) {
      // Fire async source-map resolution. Render keeps showing the raw
      // stack until this completes; UI swaps to resolved version when
      // setState fires below. Errors swallowed by resolveStackSafe.
      // ALWAYS commit the result to state, even when 0/N frames mapped —
      // the stats tell the user what happened (previously we hid no-op
      // resolutions, which made "Source-map resolved: no" ambiguous
      // between "fetch failed", "all frames unmappable", and "never ran").
      void resolveStackSafe(error.stack).then((stats) => {
        // eslint-disable-next-line no-console
        console.info(
          `[resolveStack] ${stats.mappedCount}/${stats.totalFrames} frames mapped` +
            (stats.fetchFailures.length > 0 ? ` — failed: ${stats.fetchFailures.join(", ")}` : "")
        );
        this.setState({
          resolvedStack: stats.resolved,
          resolveStats: stats,
          resolving: false,
        });
      });
    }
  }

  // Build a multi-section payload that's useful both for the user
  // copy-pasting into a chat AND for an LLM trying to diagnose. Includes
  // location, user agent, the error MESSAGE (the most diagnostic single
  // field — WebKit's `error.stack` is just frames without the message),
  // the resolved-or-raw stack, and the component stack.
  private buildReport(): string {
    const e = this.state.error;
    const errorName = e?.name || "Error";
    const errorMsg = e?.message || "(no message)";
    const stack = this.state.resolvedStack || e?.stack || "(no stack)";
    const lines: string[] = [];
    lines.push("# API Lab runtime error");
    lines.push("");
    lines.push(`When: ${new Date().toISOString()}`);
    lines.push(`URL: ${typeof location !== "undefined" ? location.href : "(no location)"}`);
    lines.push(
      `User-Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "(no nav)"}`
    );
    const stats = this.state.resolveStats;
    if (stats) {
      lines.push(
        `Source-map resolution: ${stats.mappedCount}/${stats.totalFrames} frames mapped` +
          (stats.fetchFailures.length > 0
            ? ` (fetch failed: ${stats.fetchFailures.join(", ")})`
            : "")
      );
    } else {
      lines.push("Source-map resolution: not yet completed");
    }
    lines.push("");
    lines.push("## Message");
    lines.push("```");
    lines.push(`${errorName}: ${errorMsg}`);
    lines.push("```");
    lines.push("");
    lines.push(
      stats && stats.mappedCount > 0 ? "## Stack (source-map resolved)" : "## Stack (raw)"
    );
    lines.push("```");
    lines.push(stack);
    lines.push("```");
    if (this.state.info) {
      lines.push("");
      lines.push("## Component stack");
      lines.push("```");
      lines.push(this.state.info);
      lines.push("```");
    }
    return lines.join("\n");
  }

  copy = async () => {
    const text = this.buildReport();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for permission-denied clipboard contexts: temporary
        // textarea + execCommand. Deprecated but still works in WebKit.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 1500);
    } catch {
      // Last resort: dump to console so the user can copy from there.
      // eslint-disable-next-line no-console
      console.error("[api-lab] clipboard copy failed; report below:\n" + text);
      alert("Clipboard write failed — report dumped to console (open devtools).");
    }
  };

  reset = () => {
    try {
      localStorage.removeItem("apilab.store.v1");
    } catch {
      // null-origin / privacy mode — nothing to clear
    }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const btnBase: React.CSSProperties = {
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: 600,
      borderRadius: "4px",
      cursor: "pointer",
      marginRight: "8px",
      border: "none",
    };
    return (
      <div
        style={{
          padding: "24px",
          margin: "24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff5f5",
          color: "#1a1a1a",
          border: "2px solid #c53030",
          borderRadius: "8px",
          maxWidth: "920px",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      >
        <h1 style={{ fontSize: "18px", margin: "0 0 12px", color: "#c53030" }}>
          API Lab — runtime error
        </h1>
        <div
          style={{
            background: "#fee",
            color: "#7a1010",
            padding: "10px 12px",
            margin: "0 0 12px",
            borderRadius: "4px",
            border: "1px solid #f5b8b8",
            fontSize: "13px",
            fontWeight: 600,
            wordBreak: "break-word",
          }}
        >
          {(this.state.error?.name || "Error") + ": "}
          <span style={{ fontWeight: 400 }}>{this.state.error?.message || "(no message)"}</span>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: "12px" }}>
          Click <strong>Copy report</strong> to grab a complete bundle (message + stack + component
          tree + UA) for pasting into a chat or bug report. Wait for source-map resolution to finish
          so the stack carries real function names. If the error mentions{" "}
          <code>collectionItems</code>, <code>tabs</code>, or migration, try{" "}
          <strong>Reset state + reload</strong>.
        </p>
        {this.state.resolving && (
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              fontStyle: "italic",
              color: "#666",
            }}
          >
            Resolving source maps… (Copy disabled until done — this can take 5-15 s on a 4-5 MB
            sourcemap)
          </p>
        )}
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#1a1a1a",
            color: "#f7fafc",
            padding: "12px",
            borderRadius: "4px",
            fontSize: "12px",
            margin: "0 0 12px",
            maxHeight: "240px",
            overflow: "auto",
          }}
        >
          {this.state.resolvedStack ||
            String(this.state.error?.stack || this.state.error?.message || this.state.error)}
        </pre>
        {this.state.info && (
          <details style={{ marginBottom: "12px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Component stack</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "11px",
                background: "#fafafa",
                padding: "8px",
                borderRadius: "4px",
                marginTop: "8px",
                maxHeight: "200px",
                overflow: "auto",
              }}
            >
              {this.state.info}
            </pre>
          </details>
        )}
        <button
          onClick={this.copy}
          disabled={this.state.resolving}
          style={{
            ...btnBase,
            background: this.state.resolving ? "#999" : this.state.copied ? "#22863a" : "#1a1a1a",
            color: "#fff",
            cursor: this.state.resolving ? "not-allowed" : "pointer",
          }}
        >
          {this.state.resolving ? "Resolving…" : this.state.copied ? "✓ Copied" : "Copy report"}
        </button>
        <button
          onClick={this.reset}
          style={{
            ...btnBase,
            background: "#c53030",
            color: "#fff",
          }}
        >
          Reset state + reload
        </button>
        <button
          onClick={() => location.reload()}
          style={{
            ...btnBase,
            background: "transparent",
            color: "#1a1a1a",
            border: "1px solid #1a1a1a",
          }}
        >
          Reload (keep state)
        </button>
      </div>
    );
  }
}
