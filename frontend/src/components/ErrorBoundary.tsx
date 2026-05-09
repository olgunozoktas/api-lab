import { Component, type ReactNode } from "react";

// ErrorBoundary — last-line-of-defense for runtime crashes. Without it
// a thrown error during render leaves the user with a white screen and
// no clue what broke. With it, the UI swaps to a recovery panel that
// shows the error + a "Reset state" escape hatch (clears localStorage)
// so a wedged store doesn't trap the user.
//
// Pair with the global onerror / onunhandledrejection listeners wired
// in main.tsx — those catch async errors that React doesn't see (event
// handlers fired by the bridge, unhandled Promise rejections, etc.).

type Props = { children: ReactNode };
type State = { error: Error | null; info: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ error, info: info.componentStack ?? null });
    // eslint-disable-next-line no-console
    console.error("[api-lab] React error boundary caught:", error, info);
  }

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
          The UI crashed during render. The full error is shown below; if it looks state-related
          (something about <code>collectionItems</code>, <code>tabs</code>, or migration), reset
          persisted state and reload.
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
          onClick={this.reset}
          style={{
            background: "#c53030",
            color: "#fff",
            border: "none",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "8px",
          }}
        >
          Reset state + reload
        </button>
        <button
          onClick={() => location.reload()}
          style={{
            background: "transparent",
            color: "#1a1a1a",
            border: "1px solid #1a1a1a",
            padding: "8px 14px",
            fontSize: "13px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Reload (keep state)
        </button>
      </div>
    );
  }
}
