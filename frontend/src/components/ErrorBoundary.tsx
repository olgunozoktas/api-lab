import { Component, type ReactNode } from "react";
import {
  resolveStackSafe,
  pickUserFrame,
  buildSourceExcerpt,
  findReactErrorHint,
  type ResolveResult,
  type ResolvedFrame,
} from "../lib/resolveStack";

// ErrorBoundary — last-line-of-defense for runtime crashes. Surfaces a
// rich diagnostic panel mirroring Astro/Vite's "blame frame" UX:
// human-friendly hint for known React minified errors, the user-code
// source location pinpointed, ±3 lines of code with `>` arrow + `^`
// caret marking the offending column, resolved component stack, and a
// one-shot "Copy report" button that bundles all of it for paste-into-AI.
//
// The hint catalogue + source-map plumbing live in lib/resolveStack.ts.

type Props = { children: ReactNode };
type State = {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
  errorStackResult: ResolveResult | null;
  componentStackResult: ResolveResult | null;
  resolving: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    componentStack: null,
    copied: false,
    errorStackResult: null,
    componentStackResult: null,
    resolving: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      error,
      componentStack: null,
      copied: false,
      errorStackResult: null,
      componentStackResult: null,
      resolving: false,
    };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({
      error,
      componentStack: info.componentStack ?? null,
      copied: false,
      resolving: !!error.stack || !!info.componentStack,
      errorStackResult: null,
      componentStackResult: null,
    });
    // eslint-disable-next-line no-console
    console.error("[api-lab] React error boundary caught:", error, info);
    void this.runResolution(error.stack ?? "", info.componentStack ?? "");
  }

  private async runResolution(stack: string, componentStack: string) {
    const [errorStackResult, componentStackResult] = await Promise.all([
      stack
        ? resolveStackSafe(stack)
        : Promise.resolve({
            resolved: "",
            frames: [],
            mappedCount: 0,
            totalFrames: 0,
            fetchFailures: [],
          } satisfies ResolveResult),
      componentStack
        ? resolveStackSafe(componentStack)
        : Promise.resolve({
            resolved: "",
            frames: [],
            mappedCount: 0,
            totalFrames: 0,
            fetchFailures: [],
          } satisfies ResolveResult),
    ]);
    // eslint-disable-next-line no-console
    console.info(
      `[resolveStack] error=${errorStackResult.mappedCount}/${errorStackResult.totalFrames}, ` +
        `componentStack=${componentStackResult.mappedCount}/${componentStackResult.totalFrames}`
    );
    this.setState({ errorStackResult, componentStackResult, resolving: false });
  }

  private buildReport(): string {
    const e = this.state.error;
    const errorName = e?.name || "Error";
    const errorMsg = e?.message || "(no message)";
    const hint = e ? findReactErrorHint(errorMsg) : null;
    const errResult = this.state.errorStackResult;
    const compResult = this.state.componentStackResult;
    const userFrame = errResult ? pickUserFrame(errResult.frames) : null;

    const lines: string[] = [];
    lines.push("# API Lab runtime error");
    lines.push("");
    lines.push(`When: ${new Date().toISOString()}`);
    lines.push(`URL: ${typeof location !== "undefined" ? location.href : "(no location)"}`);
    lines.push(
      `User-Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "(no nav)"}`
    );
    if (errResult) {
      lines.push(
        `Source-map resolution: ${errResult.mappedCount}/${errResult.totalFrames} error frames` +
          (compResult
            ? `, ${compResult.mappedCount}/${compResult.totalFrames} component frames`
            : "") +
          (errResult.fetchFailures.length > 0
            ? ` (fetch failed: ${errResult.fetchFailures.join(", ")})`
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
    if (hint) {
      lines.push("");
      lines.push(`## React error #${hint.code} — likely cause`);
      lines.push(hint.hint);
      lines.push(`Reference: https://react.dev/errors/${hint.code}`);
    }
    if (userFrame && userFrame.file) {
      lines.push("");
      lines.push("## Source location (first user-code frame)");
      lines.push(
        `${userFrame.file}:${userFrame.line ?? "?"}:${userFrame.column ?? "?"}` +
          (userFrame.fn ? ` in ${userFrame.fn}` : "")
      );
      if (userFrame.sourceContent && userFrame.line) {
        lines.push("");
        lines.push("```");
        lines.push(buildSourceExcerpt(userFrame.sourceContent, userFrame.line, userFrame.column));
        lines.push("```");
      }
    }
    lines.push("");
    lines.push(
      errResult && errResult.mappedCount > 0 ? "## Stack (source-map resolved)" : "## Stack (raw)"
    );
    lines.push("```");
    lines.push(errResult?.resolved || e?.stack || "(no stack)");
    lines.push("```");
    if (this.state.componentStack) {
      lines.push("");
      lines.push(
        compResult && compResult.mappedCount > 0
          ? "## Component stack (source-map resolved)"
          : "## Component stack (raw)"
      );
      lines.push("```");
      lines.push(compResult?.resolved || this.state.componentStack);
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
      // eslint-disable-next-line no-console
      console.error("[api-lab] clipboard copy failed; report below:\n" + text);
      alert("Clipboard write failed — report dumped to console (open devtools).");
    }
  };

  reset = () => {
    try {
      localStorage.removeItem("apilab.store.v1");
    } catch {
      /* null-origin */
    }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorScreen state={this.state} onCopy={this.copy} onReset={this.reset} />;
  }
}

// Presenter — split out so JSX is easier to read. State-shape access
// only (no setState wiring); callbacks injected by the boundary class.
function ErrorScreen({
  state,
  onCopy,
  onReset,
}: {
  state: State;
  onCopy: () => void;
  onReset: () => void;
}) {
  const e = state.error;
  const errorMsg = e?.message || "(no message)";
  const errorName = e?.name || "Error";
  const hint = e ? findReactErrorHint(errorMsg) : null;
  const errResult = state.errorStackResult;
  const compResult = state.componentStackResult;
  const userFrame = errResult ? pickUserFrame(errResult.frames) : null;

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "14px 16px",
    margin: "0 0 12px",
  };
  const codeBlock: React.CSSProperties = {
    background: "#0f172a",
    color: "#f1f5f9",
    padding: "12px 14px",
    borderRadius: "6px",
    fontSize: "11.5px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    lineHeight: 1.55,
    margin: "8px 0 0",
    whiteSpace: "pre",
    overflow: "auto",
    maxHeight: "260px",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6b7280",
    margin: "0 0 8px",
    fontWeight: 700,
  };

  return (
    <div
      style={{
        padding: "20px",
        margin: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#fef2f2",
        color: "#1a1a1a",
        border: "2px solid #c53030",
        borderRadius: "10px",
        maxWidth: "980px",
        fontSize: "13px",
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: "18px", margin: "0 0 6px", color: "#c53030" }}>
        API Lab — runtime error
      </h1>
      <div
        style={{
          background: "#fee2e2",
          color: "#7a1010",
          padding: "10px 12px",
          margin: "0 0 14px",
          borderRadius: "6px",
          border: "1px solid #fca5a5",
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        <strong>{errorName}:</strong> <span style={{ fontWeight: 400 }}>{errorMsg}</span>
      </div>

      {hint && (
        <div style={card}>
          <div style={sectionTitle}>React #{hint.code} — likely cause</div>
          <div>{hint.hint}</div>
          <a
            href={`https://react.dev/errors/${hint.code}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              marginTop: "6px",
              color: "#2563eb",
              fontSize: "12px",
            }}
          >
            react.dev/errors/{hint.code} →
          </a>
        </div>
      )}

      {state.resolving && (
        <p style={{ margin: "0 0 12px", fontSize: "12px", fontStyle: "italic", color: "#666" }}>
          Resolving source maps… (Copy disabled until done — typically 1-3 s)
        </p>
      )}

      {userFrame && userFrame.file && (
        <div style={card}>
          <div style={sectionTitle}>Source location · first user-code frame</div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
            <strong>{userFrame.file}</strong>:{userFrame.line ?? "?"}:{userFrame.column ?? "?"}
            {userFrame.fn ? (
              <span style={{ color: "#6b7280" }}> &nbsp;in&nbsp;{userFrame.fn}</span>
            ) : null}
          </div>
          {userFrame.sourceContent && userFrame.line && (
            <pre style={codeBlock}>
              {buildSourceExcerpt(userFrame.sourceContent, userFrame.line, userFrame.column)}
            </pre>
          )}
        </div>
      )}

      {compResult && compResult.resolved && (
        <details style={card}>
          <summary style={{ cursor: "pointer", ...sectionTitle, margin: 0 }}>
            Component stack {compResult.mappedCount > 0 ? "(resolved)" : "(raw)"}
          </summary>
          <pre style={codeBlock}>{compResult.resolved}</pre>
        </details>
      )}

      {errResult && errResult.resolved && (
        <details style={card}>
          <summary style={{ cursor: "pointer", ...sectionTitle, margin: 0 }}>
            Stack {errResult.mappedCount > 0 ? "(resolved)" : "(raw)"} · {errResult.mappedCount}/
            {errResult.totalFrames} frames mapped
          </summary>
          <pre style={codeBlock}>{errResult.resolved}</pre>
        </details>
      )}

      <div style={{ marginTop: "8px" }}>
        <Btn
          onClick={onCopy}
          disabled={state.resolving}
          bg={state.resolving ? "#9ca3af" : state.copied ? "#16a34a" : "#0f172a"}
          color="#fff"
        >
          {state.resolving ? "Resolving…" : state.copied ? "✓ Copied" : "Copy report"}
        </Btn>
        <Btn onClick={onReset} bg="#c53030" color="#fff">
          Reset state + reload
        </Btn>
        <Btn onClick={() => location.reload()} bg="transparent" color="#1a1a1a" border="#1a1a1a">
          Reload (keep state)
        </Btn>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  bg,
  color,
  border,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  bg: string;
  color: string;
  border?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 14px",
        fontSize: "13px",
        fontWeight: 600,
        borderRadius: "6px",
        cursor: disabled ? "not-allowed" : "pointer",
        marginRight: "8px",
        border: border ? `1px solid ${border}` : "none",
        background: bg,
        color,
      }}
    >
      {children}
    </button>
  );
}

// Re-export so the (unused) ResolvedFrame type doesn't trigger
// "import not used" warnings at the boundary call sites that may
// destructure result.frames in the future.
export type { ResolvedFrame };
