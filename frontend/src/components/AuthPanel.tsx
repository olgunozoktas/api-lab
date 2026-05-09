import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import type { AuthType } from "../lib/types";
import type { TKey } from "../lib/i18n";

const inputCls =
  "bg-[var(--color-bg-elev)] border border-[var(--color-border)] " +
  "rounded px-2 py-1 font-mono text-xs outline-none " +
  "focus:border-[var(--color-accent)] text-[var(--color-fg)]";

export function AuthPanel() {
  const auth = useStore((s) => s.current.auth);
  const setCurrent = useStore((s) => s.setCurrent);
  const t = useT();

  const setType = (type: AuthType) => setCurrent({ auth: { type } });
  const setField = (k: string, v: string) => setCurrent({ auth: { ...auth, [k]: v } });

  return (
    <div>
      <Row labelKey="auth.type">
        <select
          value={auth.type}
          onChange={(e) => setType(e.target.value as AuthType)}
          className={inputCls}
        >
          <option value="none">{t("auth.none")}</option>
          <option value="bearer">{t("auth.bearer")}</option>
          <option value="basic">{t("auth.basic")}</option>
          <option value="apikey">{t("auth.apikey")}</option>
        </select>
      </Row>
      {auth.type === "bearer" && (
        <Row labelKey="auth.token">
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
          <Row labelKey="auth.user">
            <input
              type="text"
              value={auth.user ?? ""}
              onChange={(e) => setField("user", e.target.value)}
              className={inputCls}
            />
          </Row>
          <Row labelKey="auth.pass">
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
          <Row labelKey="auth.header">
            <input
              type="text"
              value={auth.header ?? ""}
              placeholder="X-API-Key"
              onChange={(e) => setField("header", e.target.value)}
              className={inputCls}
            />
          </Row>
          <Row labelKey="auth.value">
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

function Row({ labelKey, children }: { labelKey: TKey; children: React.ReactNode }) {
  const t = useT();
  return (
    <div
      className="grid gap-2 mb-2 items-center"
      style={{ gridTemplateColumns: "120px 1fr" }}
    >
      <label className="text-xs text-[var(--color-fg-muted)]">{t(labelKey)}</label>
      {children}
    </div>
  );
}
