import { useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { refreshTokenBody, parseTokenResponse, expiresInToEpoch, formatExpiry } from "../lib/oauth";
import { bridge } from "../lib/bridge";
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
  const setOauth = (patch: Partial<NonNullable<Auth["oauth2"]>>) =>
    onChange({ ...value, oauth2: { ...(value.oauth2 ?? {}), ...patch } });

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
            <SelectItem value="oauth2">{t("auth.oauth2")}</SelectItem>
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
      {value.type === "oauth2" && <OAuthSubPanel value={value} setOauth={setOauth} />}
    </div>
  );
}

function OAuthSubPanel({
  value,
  setOauth,
}: {
  value: Auth;
  setOauth: (patch: Partial<NonNullable<Auth["oauth2"]>>) => void;
}) {
  const t = useT();
  const showToast = useStore((s) => s.showToast);
  const o = value.oauth2 ?? {};
  const expiry = formatExpiry(o.expires_at);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRefresh = !!o.refresh_token && !!o.token_url && !!o.client_id && !refreshing;

  const onRefresh = async () => {
    if (!canRefresh) return;
    setRefreshing(true);
    setError(null);
    try {
      const body = refreshTokenBody({
        refresh_token: o.refresh_token!,
        client_id: o.client_id!,
        client_secret: o.client_secret,
      });
      // Reuse the existing native bridge so the call goes around CORS
      // the same way every other request does.
      const res = await bridge.invoke<{
        status: number;
        body?: string;
        error?: string;
      }>("http.request", {
        method: "POST",
        url: o.token_url!,
        headers: [
          { name: "Content-Type", value: "application/x-www-form-urlencoded" },
          { name: "Accept", value: "application/json" },
        ],
        body,
        timeout_ms: 30000,
        follow_redirects: 5,
      });
      if (res.error) throw new Error(res.error);
      if (res.status >= 400) throw new Error(`HTTP ${res.status}: ${res.body || ""}`);
      const tok = parseTokenResponse(res.body || "");
      if (tok.error) throw new Error(tok.error_description || tok.error);
      if (!tok.access_token) throw new Error("Token endpoint returned no access_token");
      setOauth({
        access_token: tok.access_token,
        // Some providers omit refresh_token on refresh — keep the old one.
        refresh_token: tok.refresh_token || o.refresh_token,
        expires_at: tok.expires_in ? expiresInToEpoch(tok.expires_in) : undefined,
      });
      showToast(t("auth.oauth2.refreshed"));
    } catch (e) {
      setError((e as Error).message || String(e));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Row labelKey="auth.oauth2.access_token">
        <input
          type="text"
          value={o.access_token ?? ""}
          placeholder="paste-from-browser-flow"
          onChange={(e) => setOauth({ access_token: e.target.value })}
          className={inputCls}
        />
      </Row>
      <Row labelKey="auth.oauth2.expires_at">
        <span
          className={
            "text-xs " +
            (expiry.expired ? "text-[var(--color-danger)]" : "text-[var(--color-fg-muted)]")
          }
        >
          {expiry.text}
        </span>
      </Row>
      <Row labelKey="auth.oauth2.refresh_token">
        <input
          type="password"
          value={o.refresh_token ?? ""}
          placeholder="rt_..."
          onChange={(e) => setOauth({ refresh_token: e.target.value })}
          className={inputCls}
        />
      </Row>
      <Row labelKey="auth.oauth2.token_url">
        <input
          type="text"
          value={o.token_url ?? ""}
          placeholder="https://provider.example/oauth/token"
          onChange={(e) => setOauth({ token_url: e.target.value })}
          className={inputCls}
        />
      </Row>
      <Row labelKey="auth.oauth2.client_id">
        <input
          type="text"
          value={o.client_id ?? ""}
          onChange={(e) => setOauth({ client_id: e.target.value })}
          className={inputCls}
        />
      </Row>
      <Row labelKey="auth.oauth2.client_secret">
        <input
          type="password"
          value={o.client_secret ?? ""}
          placeholder={t("auth.oauth2.client_secret_optional")}
          onChange={(e) => setOauth({ client_secret: e.target.value })}
          className={inputCls}
        />
      </Row>
      <Row labelKey="auth.oauth2.refresh">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onRefresh}
            disabled={!canRefresh}
            title={!canRefresh ? t("auth.oauth2.need_refresh_fields") : undefined}
          >
            {refreshing ? t("auth.oauth2.refreshing") : t("auth.oauth2.refresh_button")}
          </Button>
          {error && (
            <span className="text-xs text-[var(--color-danger)]" title={error}>
              {error.length > 60 ? error.slice(0, 60) + "…" : error}
            </span>
          )}
        </div>
      </Row>
      <p className="text-[10px] text-[var(--color-fg-muted)] mt-2 leading-relaxed">
        {t("auth.oauth2.helper_note")}
      </p>
    </>
  );
}

function Row({ labelKey, children }: { labelKey: TKey; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="grid gap-2 mb-2 items-center" style={{ gridTemplateColumns: "150px 1fr" }}>
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
