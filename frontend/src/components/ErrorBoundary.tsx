import { Component, type ReactNode } from "react";
import {
  resolveStackSafe,
  pickUserFrame,
  buildSourceExcerpt,
  parseComponentStack,
  findReactErrorHint,
  type ResolveResult,
} from "../lib/resolveStack";
import { Banner, HintCard, ActionRow, KeyframeStyles, C } from "./ErrorOverlayShell";
import { SourceCard, ComponentStackCard, RawStackCard } from "./ErrorOverlayCode";

// ErrorBoundary — last-line-of-defense for runtime crashes. Surfaces
// an Astro/Vite-style "blame frame" overlay: human-friendly hint for
// known React minified errors, the first user-code source location
// pinpointed with a syntax-highlighted ±3-line excerpt, parsed
// component stack, and a one-shot "Copy report" button that bundles
// everything into a markdown payload for paste-into-AI.
//
// Presentational pieces (banner, source card, stack list, primitives)
// live in ErrorOverlayShell.tsx + ErrorOverlayCode.tsx so each file
// stays under the 400-LOC project cap (CLAUDE.md hard rule).

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
