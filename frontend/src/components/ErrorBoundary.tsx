import { Component, type ReactNode } from "react";

// ErrorBoundary — last-line-of-defense for runtime crashes. Without it
// a thrown error during render leaves the user with a white screen and
// no clue what broke. With it, the UI swaps to a recovery panel that
// shows the error + a "Copy" button (one-shot to clipboard for pasting
// into AI agents / bug reports) + a "Reset state" escape hatch (clears
// localStorage so a wedged store doesn't trap the user).
//
// Pair with the global onerror / onunhandledrejection listeners wired
// in main.tsx — those catch async errors that React doesn't see (event
// handlers fired by the bridge, unhandled Promise rejections, etc.).

type Props = { children: ReactNode };
type State = {
  error: Error | null;
  info: string | null;
  copied: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null, copied: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null, copied: false };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ error, info: info.componentStack ?? null, copied: false });
    // eslint-disable-next-line no-console
    console.error("[api-lab] React error boundary caught:", error, info);
  }

  // Build a multi-section payload that's useful both for the user
  // copy-pasting into a chat AND for an LLM trying to diagnose. Includes
  // location, user agent, build hash if injected, and the full error +
  // component stack.
  private buildReport(): string {
    const e = this.state.error;
    const lines: string[] = [];
    lines.push("# API Lab runtime error");
    lines.push("");
    lines.push(`When: ${new Date().toISOString()}`);
    lines.push(`URL: ${typeof location !== "undefined" ? location.href : "(no location)"}`);
    lines.push(
      `User-Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "(no nav)"}`
    );
    lines.push("");
    lines.push("## Error");
    lines.push("```");
    lines.push(String(e?.stack || e?.message || e || "(no error)"));
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
        <p style={{ margin: "0 0 12px" }}>
          The UI crashed during render. The full error is shown below — click{" "}
          <strong>Copy report</strong> to grab a complete bundle (error + stack + component tree +
          UA) for pasting into a chat or bug report. If the error mentions{" "}
          <code>collectionItems</code>, <code>tabs</code>, or migration, try{" "}
          <strong>Reset state + reload</strong>.
        </p>
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
          {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
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
          style={{
            ...btnBase,
            background: this.state.copied ? "#22863a" : "#1a1a1a",
            color: "#fff",
          }}
        >
          {this.state.copied ? "✓ Copied" : "Copy report"}
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
