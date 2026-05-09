import { useStore } from "../store";
import { methodClass } from "../lib/utils";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

type Props = {
  busy: boolean;
  onSend: () => void;
};

export function UrlBar({ busy, onSend }: Props) {
  const method = useStore((s) => s.current.method);
  const url = useStore((s) => s.current.url);
  const setCurrent = useStore((s) => s.setCurrent);

  return (
    <div className="flex gap-1.5 px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)]">
      <select
        value={method}
        onChange={(e) => setCurrent({ method: e.target.value })}
        className={
          "bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] rounded-md " +
          "px-2 py-1.5 font-mono font-bold text-xs w-22 " + methodClass(method)
        }
        aria-label="HTTP method"
      >
        {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <input
        type="text"
        value={url}
        onChange={(e) => setCurrent({ url: e.target.value })}
        placeholder="https://api.example.com/path  (env: {{base_url}}/path)"
        className={
          "flex-1 bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] " +
          "rounded-md px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
        }
      />
      <button
        onClick={onSend}
        disabled={busy}
        className={
          "bg-[var(--color-accent)] text-white border-0 rounded-md px-4 py-1.5 " +
          "font-semibold text-xs active:scale-[0.97] transition-transform " +
          (busy ? "opacity-50 cursor-progress" : "")
        }
      >
        {busy ? "Gönderiliyor..." : "Gönder"}
      </button>
    </div>
  );
}
