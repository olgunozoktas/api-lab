import { useStore } from "../store";
import { highlightJson, isProbablyJson } from "../lib/utils";

export function ResponseBody() {
  const r = useStore((s) => s.lastResponse);
  const tab = useStore((s) => s.ui.responseTab);

  if (!r) {
    return <EmptyState />;
  }

  if (tab === "headers") {
    return (
      <div className="flex-1 overflow-auto p-3">
        <table className="w-full border-collapse font-mono text-[11px] select-text">
          <tbody>
            {r.headers.map((h, i) => (
              <tr key={i} className="border-b border-[var(--color-border)]">
                <td className="px-2.5 py-1.5 align-top text-[var(--color-fg-muted)] w-[30%] break-all">{h.k}</td>
                <td className="px-2.5 py-1.5 align-top break-all">{h.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "raw") {
    return (
      <div className="flex-1 overflow-auto p-3">
        <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-words leading-6 select-text">
          {r.body}
        </pre>
      </div>
    );
  }

  if (r.contentType.includes("application/json") || isProbablyJson(r.body)) {
    try {
      const parsed = JSON.parse(r.body);
      return (
        <div className="flex-1 overflow-auto p-3">
          <pre
            className="m-0 font-mono text-xs whitespace-pre-wrap break-words leading-6 select-text"
            dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(parsed, null, 2)) }}
          />
        </div>
      );
    } catch { /* fall through */ }
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-words leading-6 select-text">
        {r.body}
      </pre>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-center text-[var(--color-fg-muted)] gap-2 flex-col">
      <div>İstek atmaya hazır.</div>
      <div className="text-[11px]">
        <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd> Gönder · <Kbd>⌘</Kbd>+<Kbd>S</Kbd> Kaydet · <Kbd>⌘</Kbd>+<Kbd>N</Kbd> Yeni
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </kbd>
  );
}
