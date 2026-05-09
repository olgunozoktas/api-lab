import { Component, type ReactNode } from "react";
import {
  resolveStackSafe,
  pickUserFrame,
  buildSourceExcerpt,
  buildSourceExcerptLines,
  parseComponentStack,
  findReactErrorHint,
  type ResolveResult,
  type ResolvedFrame,
  type ComponentFrame,
} from "../lib/resolveStack";
import { tokenizeLine, TOKEN_COLOR } from "../lib/syntaxHighlight";

// ErrorBoundary — last-line-of-defense for runtime crashes. Surfaces
// an Astro/Vite-style "blame frame" overlay: human-friendly hint for
// known React minified errors, the first user-code source location
// pinpointed with a syntax-highlighted ±3-line excerpt, parsed
// component stack, and a one-shot "Copy report" button that bundles
// everything into a markdown payload for paste-into-AI.
//
// All inline-styled. The overlay renders even if the app's stylesheet
// is wedged — the boundary is a recovery path, not a styled feature.

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
    const empty: ResolveResult = {
      resolved: "",
      frames: [],
      mappedCount: 0,
      totalFrames: 0,
      fetchFailures: [],
    };
    const [errorStackResult, componentStackResult] = await Promise.all([
      stack ? resolveStackSafe(stack) : Promise.resolve(empty),
      componentStack ? resolveStackSafe(componentStack) : Promise.resolve(empty),
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

// ============================================================
// Presentational layer below — split into small components for
// readability. All inline-styled (no CSS dep).
// ============================================================

// Color palette — dark slate background with red accent. Kept inline
// so the overlay renders even with broken stylesheets.
const C = {
  bg: "#0b1020", // outer
  panel: "#0f172a", // inner panels
  panelAlt: "#111c33", // nested panels
  border: "#1e293b",
  borderActive: "#7f1d1d",
  fg: "#e2e8f0",
  fgMuted: "#94a3b8",
  accent: "#f87171", // error red
  accentBg: "#7f1d1d",
  link: "#60a5fa",
  caret: "#fb7185",
  gutter: "#475569",
  activeLineBg: "#1e293b",
};

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
  const componentFrames = compResult ? parseComponentStack(compResult.resolved) : [];

  return (
    <>
      <KeyframeStyles />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100000,
          padding: "32px 24px",
          background: "rgba(0,0,0,0.65)",
          overflow: "auto",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            background: C.bg,
            borderRadius: "12px",
            border: `1px solid ${C.borderActive}`,
            boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            color: C.fg,
            fontSize: "13px",
            lineHeight: 1.55,
            overflow: "hidden",
          }}
        >
          <Banner errorName={errorName} errorMsg={errorMsg} resolving={state.resolving} />
          <div style={{ padding: "16px 20px 20px", display: "grid", gap: "14px" }}>
            {hint && <HintCard code={hint.code} hint={hint.hint} />}
            {userFrame && userFrame.file && <SourceCard frame={userFrame} />}
            {componentFrames.length > 0 && <ComponentStackCard frames={componentFrames} />}
            {errResult && errResult.resolved && <RawStackCard result={errResult} />}
            <ActionRow
              copied={state.copied}
              resolving={state.resolving}
              onCopy={onCopy}
              onReset={onReset}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Banner({
  errorName,
  errorMsg,
  resolving,
}: {
  errorName: string;
  errorMsg: string;
  resolving: boolean;
}) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${C.accentBg} 0%, ${C.panel} 100%)`,
        padding: "20px 24px 18px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "6px",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#fecaca",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: C.accent,
            boxShadow: `0 0 0 4px ${C.accentBg}`,
          }}
        />
        Runtime error
        {resolving && (
          <span
            style={{ marginLeft: "auto", display: "inline-flex", gap: "6px", alignItems: "center" }}
          >
            <Spinner /> resolving source maps…
          </span>
        )}
      </div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
        {errorName}: <span style={{ fontWeight: 500, color: "#fee2e2" }}>{errorMsg}</span>
      </div>
    </div>
  );
}

function HintCard({ code, hint }: { code: string; hint: string }) {
  return (
    <Card title={`React error #${code} · likely cause`} accent={C.accent}>
      <div style={{ color: C.fg }}>{hint}</div>
      <a
        href={`https://react.dev/errors/${code}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          marginTop: "8px",
          fontSize: "12px",
          color: C.link,
          textDecoration: "none",
        }}
      >
        react.dev/errors/{code} →
      </a>
    </Card>
  );
}

function SourceCard({ frame }: { frame: ResolvedFrame }) {
  if (!frame.file) return null;
  const lines =
    frame.sourceContent && frame.line
      ? buildSourceExcerptLines(frame.sourceContent, frame.line, frame.column)
      : [];
  return (
    <Card title="Source · first user-code frame">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "12px",
        }}
      >
        <span style={{ color: C.fg }}>
          <span style={{ color: C.fgMuted }}>{dirname(frame.file)}/</span>
          <strong>{basename(frame.file)}</strong>
          <span style={{ color: C.fgMuted }}>
            :{frame.line ?? "?"}:{frame.column ?? "?"}
          </span>
        </span>
        {frame.fn && (
          <span
            style={{
              fontSize: "11px",
              color: C.link,
              background: "rgba(96,165,250,0.12)",
              padding: "1px 8px",
              borderRadius: "999px",
            }}
          >
            in {frame.fn}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <CopyMini text={`${frame.file}:${frame.line}:${frame.column}`} />
      </div>
      {lines.length > 0 ? (
        <CodeFrame lines={lines} />
      ) : (
        <div style={{ color: C.fgMuted, fontStyle: "italic", fontSize: "12px" }}>
          (source content unavailable in this build's source-map)
        </div>
      )}
    </Card>
  );
}

function CodeFrame({ lines }: { lines: ReturnType<typeof buildSourceExcerptLines> }) {
  const widest = String(lines[lines.length - 1]?.lineNo ?? 0).length;
  return (
    <pre
      style={{
        margin: 0,
        padding: "10px 0",
        background: C.panelAlt,
        borderRadius: "8px",
        border: `1px solid ${C.border}`,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: "12.5px",
        lineHeight: 1.55,
        overflow: "auto",
        maxHeight: "320px",
      }}
    >
      {lines.map((ln) => (
        <div key={ln.lineNo}>
          <CodeLine lineNo={ln.lineNo} active={ln.isActive} code={ln.code} widest={widest} />
          {ln.isActive && ln.caretCol != null && <CaretLine col={ln.caretCol} widest={widest} />}
        </div>
      ))}
    </pre>
  );
}

function CodeLine({
  lineNo,
  active,
  code,
  widest,
}: {
  lineNo: number;
  active: boolean;
  code: string;
  widest: number;
}) {
  const tokens = tokenizeLine(code);
  return (
    <div
      style={{
        display: "flex",
        background: active ? C.activeLineBg : "transparent",
        borderLeft: `3px solid ${active ? C.accent : "transparent"}`,
        paddingLeft: "12px",
        paddingRight: "12px",
      }}
    >
      <span
        style={{
          color: active ? C.accent : C.gutter,
          width: `${widest + 1}ch`,
          marginRight: "12px",
          textAlign: "right",
          userSelect: "none",
          fontWeight: active ? 700 : 400,
        }}
      >
        {lineNo}
      </span>
      <span style={{ color: C.fg, whiteSpace: "pre" }}>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: TOKEN_COLOR[t.type] }}>
            {t.value}
          </span>
        ))}
      </span>
    </div>
  );
}

function CaretLine({ col, widest }: { col: number; widest: number }) {
  // The caret aligns to the same column the active line's code starts at.
  // 12 (padLeft) + widest+1 ch + 12 (gap) → use leading transparent space.
  return (
    <div
      style={{
        display: "flex",
        paddingLeft: "12px",
        paddingRight: "12px",
        color: C.caret,
        fontWeight: 700,
      }}
    >
      <span style={{ width: `${widest + 1}ch`, marginRight: "12px" }} />
      <span style={{ whiteSpace: "pre" }}>{`${" ".repeat(col)}^`}</span>
    </div>
  );
}

function ComponentStackCard({ frames }: { frames: ComponentFrame[] }) {
  return (
    <Card title="Component stack">
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "12px",
        }}
      >
        {frames.map((f, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px",
              borderRadius: "4px",
              background: i === 0 ? "rgba(248,113,113,0.08)" : "transparent",
              borderLeft: i === 0 ? `2px solid ${C.accent}` : "2px solid transparent",
            }}
          >
            <span style={{ color: C.fgMuted, width: "1.5ch" }}>{i === 0 ? "▸" : " "}</span>
            <span
              style={{
                color: f.isHtmlElement ? C.fgMuted : f.file ? "#fbbf24" : C.fg,
                fontWeight: i === 0 ? 700 : 500,
              }}
            >
              {f.isHtmlElement ? `<${f.name}>` : f.name}
            </span>
            {f.file && (
              <span style={{ color: C.fgMuted, fontSize: "11px" }}>
                {f.file}:{f.line}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function RawStackCard({ result }: { result: ResolveResult }) {
  return (
    <details>
      <summary
        style={{
          cursor: "pointer",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: C.fgMuted,
          fontWeight: 700,
          padding: "8px 0",
        }}
      >
        Full stack · {result.mappedCount}/{result.totalFrames} frames mapped
        {result.fetchFailures.length > 0 ? ` · fetch failed: ${result.fetchFailures.length}` : ""}
      </summary>
      <pre
        style={{
          margin: "6px 0 0",
          padding: "10px 12px",
          background: C.panelAlt,
          borderRadius: "8px",
          border: `1px solid ${C.border}`,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "11.5px",
          lineHeight: 1.55,
          color: C.fgMuted,
          maxHeight: "260px",
          overflow: "auto",
        }}
      >
        {result.resolved}
      </pre>
    </details>
  );
}

function Card({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`,
        borderRadius: "8px",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: "10.5px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: C.fgMuted,
          fontWeight: 700,
          marginBottom: "8px",
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function ActionRow({
  copied,
  resolving,
  onCopy,
  onReset,
}: {
  copied: boolean;
  resolving: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
      <Btn
        onClick={onCopy}
        disabled={resolving}
        bg={resolving ? "#475569" : copied ? "#16a34a" : C.fg}
        color={resolving || copied ? "#fff" : C.bg}
      >
        {resolving ? "Resolving…" : copied ? "✓ Copied to clipboard" : "Copy report"}
      </Btn>
      <Btn onClick={onReset} bg={C.accentBg} color="#fff">
        Reset state + reload
      </Btn>
      <Btn onClick={() => location.reload()} bg="transparent" color={C.fg} border={C.border}>
        Reload (keep state)
      </Btn>
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
        padding: "9px 16px",
        fontSize: "13px",
        fontWeight: 600,
        borderRadius: "6px",
        cursor: disabled ? "not-allowed" : "pointer",
        border: border ? `1px solid ${border}` : "none",
        background: bg,
        color,
        transition: "transform 80ms ease, opacity 120ms ease",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  );
}

function CopyMini({ text }: { text: string }) {
  return (
    <button
      onClick={() => {
        if (navigator?.clipboard?.writeText) void navigator.clipboard.writeText(text);
      }}
      title={`Copy ${text}`}
      style={{
        background: "transparent",
        color: C.fgMuted,
        border: `1px solid ${C.border}`,
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "10.5px",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      copy path
    </button>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "apilab-spin 0.7s linear infinite",
      }}
    />
  );
}

// Keyframes injected once via a <style> tag — inline @keyframes can't be
// expressed in the React style prop, so we render a real stylesheet.
function KeyframeStyles() {
  return <style>{`@keyframes apilab-spin{to{transform:rotate(360deg)}}`}</style>;
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

// Re-export so consumers can hold the type without re-importing from lib.
export type { ResolvedFrame, ComponentFrame };
