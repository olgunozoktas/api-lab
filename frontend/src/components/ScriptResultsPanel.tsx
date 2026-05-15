/** Olgun Özoktaş geliştirdi · API Lab */
// Script result surfaces for the response area: the Tests panel
// (pass/fail per `pm.test`) and the Console panel (captured
// `console.log` output). Both read the pre/post-script outcomes
// threaded onto `lastResponse.scriptResults` by App.onSend.

import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { cn } from "../lib/cn";
import type { ScriptAssert, ScriptOutcome } from "../lib/types";

function AssertRow({ assert }: { assert: ScriptAssert }) {
  return (
    <div className="px-3 py-1.5 flex items-start gap-2 text-[12px] border-b border-[var(--color-border)]">
      <span
        className={cn(
          "font-mono font-semibold text-[10px] pt-0.5 shrink-0 w-9",
          assert.passed ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
        )}
      >
        {assert.passed ? "PASS" : "FAIL"}
      </span>
      <span className="min-w-0">
        <span className="text-[var(--color-fg)]">{assert.name}</span>
        {!assert.passed && assert.error ? (
          <span className="block text-[11px] text-[var(--color-danger)] font-mono mt-0.5">
            {assert.error}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export type ScriptTestsPanelProps = {
  pre?: ScriptOutcome;
  post?: ScriptOutcome;
};

/** Tests panel presenter — pure props. */
export function ScriptTestsPanel({ pre, post }: ScriptTestsPanelProps) {
  const t = useT();
  const asserts = [...(pre?.asserts ?? []), ...(post?.asserts ?? [])];
  // A script that threw before/around its assertions — surfaced above
  // the rows so a green-looking run isn't mistaken for a clean one.
  const scriptError = pre?.error || post?.error;
  if (asserts.length === 0 && !scriptError) {
    return (
      <div className="p-3 text-[12px] text-[var(--color-fg-muted)]">{t("scripts.tests.empty")}</div>
    );
  }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {scriptError ? (
        <div className="px-3 py-2 text-[11px] font-mono text-[var(--color-danger)] border-b border-[var(--color-border)]">
          {scriptError}
        </div>
      ) : null}
      {asserts.map((a, i) => (
        <AssertRow key={`${a.name}-${i}`} assert={a} />
      ))}
    </div>
  );
}

/** Tests panel container — reads the active response's script results. */
export function ScriptTestsPanelContainer() {
  const sr = useStore((s) => s.lastResponse?.scriptResults);
  return <ScriptTestsPanel pre={sr?.pre} post={sr?.post} />;
}

export type ScriptConsolePanelProps = {
  pre?: ScriptOutcome;
  post?: ScriptOutcome;
};

/** Console panel presenter — pure props. */
export function ScriptConsolePanel({ pre, post }: ScriptConsolePanelProps) {
  const t = useT();
  const lines = [...(pre?.console_log ?? []), ...(post?.console_log ?? [])];
  if (lines.length === 0) {
    return (
      <div className="p-3 text-[12px] text-[var(--color-fg-muted)]">
        {t("scripts.console.empty")}
      </div>
    );
  }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "whitespace-pre-wrap break-words",
            line.startsWith("[error]")
              ? "text-[var(--color-danger)]"
              : line.startsWith("[warn]")
                ? "text-[var(--color-warning)]"
                : "text-[var(--color-fg)]"
          )}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

/** Console panel container — reads the active response's script results. */
export function ScriptConsolePanelContainer() {
  const sr = useStore((s) => s.lastResponse?.scriptResults);
  return <ScriptConsolePanel pre={sr?.pre} post={sr?.post} />;
}
