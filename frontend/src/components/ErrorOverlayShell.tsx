// Shell-level pieces of the ErrorBoundary overlay: top banner, hint
// card, action button row, and reusable primitives (Card, Btn, CopyMini,
// Spinner, keyframe injector, color palette, path utils). Split out of
// ErrorBoundary.tsx to honor the 400-LOC cap (CLAUDE.md hard rule).
//
// All inline-styled — the overlay is a recovery path that has to render
// even when stylesheets fail to load.

import { type ReactNode } from "react";

// Color palette tuned for the dark slate panel + red accent. Exported
// so the sibling overlay-code module can match colors.
export const C = {
  bg: "#0b1020",
  panel: "#0f172a",
  panelAlt: "#111c33",
  border: "#1e293b",
  borderActive: "#7f1d1d",
  fg: "#e2e8f0",
  fgMuted: "#94a3b8",
  accent: "#f87171",
  accentBg: "#7f1d1d",
  link: "#60a5fa",
  caret: "#fb7185",
  gutter: "#475569",
  activeLineBg: "#1e293b",
};

export function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

export function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export function Banner({
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
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              gap: "6px",
              alignItems: "center",
            }}
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

export function HintCard({ code, hint }: { code: string; hint: string }) {
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

export function ActionRow({
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

export function Card({
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

export function Btn({
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

export function CopyMini({ text }: { text: string }) {
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

export function Spinner() {
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

// Keyframes injected once via a real <style> tag — inline @keyframes
// can't be expressed in the React style prop, so we render a stylesheet
// fragment alongside the overlay.
export function KeyframeStyles() {
  return <style>{`@keyframes apilab-spin{to{transform:rotate(360deg)}}`}</style>;
}
