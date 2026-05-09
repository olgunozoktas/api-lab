import { useStore, useActiveVars } from "../store";
import { useT } from "../lib/i18n/useT";
import { humanSize, statusPillClass, statusText } from "../lib/utils";
import { toCurl } from "../lib/curlGen";
import { buildHeadersList, buildUrl, buildBody, effectiveContentType } from "../lib/sendRequest";

export function ResponseHead() {
  const r = useStore((s) => s.lastResponse);
  const current = useStore((s) => s.current);
  const isGraphql = useStore((s) => s.ui.composerTab === "graphql");
  const showToast = useStore((s) => s.showToast);
  const vars = useActiveVars();
  const t = useT();

  if (!r) return null;

  const copyBody = () => {
    navigator.clipboard.writeText(r.body).then(() => showToast(t("response.bodyCopied")));
  };

  const copyCurl = () => {
    const url = buildUrl(current, vars);
    const method = isGraphql ? "POST" : current.method;
    const headers = buildHeadersList(current, vars);
    effectiveContentType(current, isGraphql, headers);
    const body = method === "GET" || method === "HEAD" ? null : buildBody(current, isGraphql, vars) ?? null;
    const headersArr: { name: string; value: string }[] = [];
    headers.forEach((v, k) => headersArr.push({ name: k, value: v }));
    navigator.clipboard
      .writeText(toCurl({ method, url, headers: headersArr, body }))
      .then(() => showToast(t("response.curlCopied")));
  };

  const iconBtn =
    "text-xs px-2.5 py-1 rounded-md text-[var(--color-fg-muted)] " +
    "hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]";

  return (
    <div className="px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap">
      <span className={"font-mono font-bold text-xs px-2.5 py-0.5 rounded-full " + statusPillClass(r.status)}>
        {r.status} {r.statusText || statusText(r.status)}
      </span>
      <span className="text-xs text-[var(--color-fg-muted)]">{r.elapsedMs} ms</span>
      <span className="text-xs text-[var(--color-fg-muted)]">{humanSize(r.sizeBytes)}</span>
      <span
        className={"text-xs " + (r.transport === "native" ? "text-[var(--color-success)]" : "text-[var(--color-fg-muted)]")}
        title={t("response.transport.title")}
      >
        {r.transport}
      </span>
      <div className="flex-1" />
      <button onClick={copyBody}  className={iconBtn}>{t("response.copy.body")}</button>
      <button onClick={copyCurl}  className={iconBtn}>{t("response.copy.curl")}</button>
    </div>
  );
}
