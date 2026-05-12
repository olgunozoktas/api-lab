/** Olgun Özoktaş geliştirdi · API Lab */
// Source-frame + stack rendering for the ErrorBoundary overlay. Split
// out of ErrorBoundary.tsx to honor the 400-LOC cap (CLAUDE.md hard
// rule). Holds the Astro-style "blame frame" with syntax highlighting,
// the parsed component stack list, and the collapsible raw-stack
// section.

import {
  buildSourceExcerptLines,
  type ComponentFrame,
  type ResolvedFrame,
  type ResolveResult,
} from "../lib/resolveStack";
import { tokenizeLine, TOKEN_COLOR } from "../lib/syntaxHighlight";
import { C, Card, CopyMini, basename, dirname } from "./ErrorOverlayShell";

export function SourceCard({ frame }: { frame: ResolvedFrame }) {
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

export function ComponentStackCard({ frames }: { frames: ComponentFrame[] }) {
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

export function RawStackCard({ result }: { result: ResolveResult }) {
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
