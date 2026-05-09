import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import type { Auth, AuthType } from "../lib/types";
import type { TKey } from "../lib/i18n";

const inputCls =
  "bg-[var(--color-bg-elev)] border border-[var(--color-border)] " +
  "rounded px-2 py-1 font-mono text-xs outline-none " +
  "focus:border-[var(--color-accent)] text-[var(--color-fg)]";

// Presenter — pure props in / events out.
export type AuthPanelProps = {
  value: Auth;
  onChange: (auth: Auth) => void;
};

export function AuthPanel({ value, onChange }: AuthPanelProps) {
  const t = useT();

  const setType = (type: AuthType) => onChange({ type });
  const setField = (k: keyof Auth, v: string) => onChange({ ...value, [k]: v });

  return (
    <div>
      <Row labelKey="auth.type">
        <Select value={value.type} onValueChange={(v) => setType(v as AuthType)}>
          <SelectTrigger aria-label={t("auth.type")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("auth.none")}</SelectItem>
            <SelectItem value="bearer">{t("auth.bearer")}</SelectItem>
            <SelectItem value="basic">{t("auth.basic")}</SelectItem>
            <SelectItem value="apikey">{t("auth.apikey")}</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      {value.type === "bearer" && (
        <Row labelKey="auth.token">
          <input
            type="text"
            value={value.token ?? ""}
            placeholder="eyJhbGc..."
            onChange={(e) => setField("token", e.target.value)}
            className={inputCls}
          />
        </Row>
      )}
      {value.type === "basic" && (
        <>
          <Row labelKey="auth.user">
            <input
              type="text"
              value={value.user ?? ""}
              onChange={(e) => setField("user", e.target.value)}
              className={inputCls}
            />
          </Row>
          <Row labelKey="auth.pass">
            <input
              type="password"
              value={value.pass ?? ""}
              onChange={(e) => setField("pass", e.target.value)}
              className={inputCls}
            />
          </Row>
        </>
      )}
      {value.type === "apikey" && (
        <>
          <Row labelKey="auth.header">
            <input
              type="text"
              value={value.header ?? ""}
              placeholder="X-API-Key"
              onChange={(e) => setField("header", e.target.value)}
              className={inputCls}
            />
          </Row>
          <Row labelKey="auth.value">
            <input
              type="text"
              value={value.value ?? ""}
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

// Container — wires the store.
export function AuthPanelContainer() {
  const value = useStore((s) => s.current.auth);
  const setCurrent = useStore((s) => s.setCurrent);
  return <AuthPanel value={value} onChange={(auth) => setCurrent({ auth })} />;
}
