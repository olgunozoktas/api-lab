import { useStore } from "../store";
import type { AuthType } from "../lib/types";

const inputCls =
  "bg-[var(--color-bg-elev)] border border-[var(--color-border)] " +
  "rounded px-2 py-1 font-mono text-xs outline-none " +
  "focus:border-[var(--color-accent)] text-[var(--color-fg)]";

export function AuthPanel() {
  const auth = useStore((s) => s.current.auth);
  const setCurrent = useStore((s) => s.setCurrent);

  const setType = (t: AuthType) => setCurrent({ auth: { type: t } });
  const setField = (k: string, v: string) =>
    setCurrent({ auth: { ...auth, [k]: v } });

  return (
    <div>
      <Row label="Tip">
        <select
          value={auth.type}
          onChange={(e) => setType(e.target.value as AuthType)}
          className={inputCls}
        >
          <option value="none">Yok</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
        </select>
      </Row>
      {auth.type === "bearer" && (
        <Row label="Token">
          <input
            type="text"
            value={auth.token ?? ""}
            placeholder="eyJhbGc..."
            onChange={(e) => setField("token", e.target.value)}
            className={inputCls}
          />
        </Row>
      )}
      {auth.type === "basic" && (
        <>
          <Row label="Kullanıcı">
            <input
              type="text"
              value={auth.user ?? ""}
              onChange={(e) => setField("user", e.target.value)}
              className={inputCls}
            />
          </Row>
          <Row label="Parola">
            <input
              type="password"
              value={auth.pass ?? ""}
              onChange={(e) => setField("pass", e.target.value)}
              className={inputCls}
            />
          </Row>
        </>
      )}
      {auth.type === "apikey" && (
        <>
          <Row label="Header">
            <input
              type="text"
              value={auth.header ?? ""}
              placeholder="X-API-Key"
              onChange={(e) => setField("header", e.target.value)}
              className={inputCls}
            />
          </Row>
          <Row label="Value">
            <input
              type="text"
              value={auth.value ?? ""}
              onChange={(e) => setField("value", e.target.value)}
              className={inputCls}
            />
          </Row>
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="grid gap-2 mb-2 items-center"
      style={{ gridTemplateColumns: "120px 1fr" }}
    >
      <label className="text-xs text-[var(--color-fg-muted)]">{label}</label>
      {children}
    </div>
  );
}
