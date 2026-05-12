/** Olgun Özoktaş geliştirdi · API Lab */
// Response section + status pill for the gRPC composer. Split out of
// GrpcPanel.tsx to stay under the 400-LOC cap (CLAUDE.md hard rule).

import { useT } from "../lib/i18n/useT";
import type { GrpcResponse } from "../lib/bridge";
import JsonView from "@uiw/react-json-view";
import { CodeEditor } from "./ui/code-editor";
import { TabsContent } from "./ui/tabs";
import { AlertCircle } from "lucide-react";

export type GrpcStatus = "idle" | "running" | "ok" | "error" | "missing-binary";

const treeStyle: Record<string, string> = {
  "--w-rjv-font-family": "var(--font-mono)",
  "--w-rjv-color": "var(--color-fg)",
  "--w-rjv-background-color": "transparent",
  "--w-rjv-key-string": "var(--color-accent)",
  "--w-rjv-line-color": "var(--color-border)",
  "--w-rjv-arrow-color": "var(--color-fg-muted)",
  "--w-rjv-string-color": "var(--color-success)",
  "--w-rjv-number-color": "var(--color-warning)",
  "--w-rjv-boolean-color": "var(--color-purple)",
  "--w-rjv-null-color": "var(--color-fg-muted)",
  fontSize: "12px",
  padding: "0",
};

export function GrpcStatusPill({
  status,
  statusCode,
}: {
  status: GrpcStatus;
  statusCode?: string;
}) {
  const t = useT();
  const tone = (() => {
    if (status === "ok") return "bg-green-500/15 text-[var(--color-success)]";
    if (status === "running") return "bg-orange-500/15 text-[var(--color-warning)]";
    if (status === "error" || status === "missing-binary")
      return "bg-red-500/15 text-[var(--color-danger)]";
    return "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]";
  })();
  const label = (() => {
    if (status === "running") return t("grpc.status.running");
    if (status === "missing-binary") return t("grpc.status.missing");
    if (statusCode) return statusCode.toUpperCase();
    if (status === "ok") return "OK";
    if (status === "error") return t("grpc.status.error");
    return t("grpc.status.idle");
  })();
  return (
    <span className={"font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full " + tone}>
      {label}
    </span>
  );
}

export type ResponseSectionProps = {
  response: GrpcResponse | null;
  status: GrpcStatus;
  tab: "message" | "headers" | "trailers" | "raw";
};

export function GrpcResponseSection({ response, status, tab }: ResponseSectionProps) {
  const t = useT();

  if (status === "missing-binary" || (response && response.error === "grpcurl_missing")) {
    return (
      <div className="p-3 flex items-start gap-3 bg-[var(--color-bg-elev)] border-t border-[var(--color-warning)]">
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-[var(--color-warning)]" aria-hidden />
        <div className="flex-1 text-xs space-y-1.5">
          <div className="font-semibold">{t("grpc.missing.title")}</div>
          <div className="text-[var(--color-fg-muted)]">{t("grpc.missing.hint")}</div>
          <code className="block px-2 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded font-mono">
            brew install grpcurl
          </code>
          {response?.docs && (
            <a
              href={response.docs}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              {t("grpc.missing.docs")}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <TabsContent value={tab} className="p-3">
        <div className="text-xs text-[var(--color-fg-muted)] italic text-center py-8">
          {status === "running" ? t("grpc.empty.running") : t("grpc.empty.idle")}
        </div>
      </TabsContent>
    );
  }

  if (tab === "headers" || tab === "trailers") {
    const rows = tab === "headers" ? response.headers : response.trailers;
    return (
      <TabsContent value={tab} className="p-3">
        {rows.length === 0 ? (
          <div className="text-xs text-[var(--color-fg-muted)] italic">{t("grpc.kv.empty")}</div>
        ) : (
          <table className="w-full border-collapse font-mono text-[11px] select-text">
            <tbody>
              {rows.map((h, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]">
                  <td className="px-2.5 py-1.5 align-top text-[var(--color-fg-muted)] w-[35%] break-all">
                    {h.name}
                  </td>
                  <td className="px-2.5 py-1.5 align-top break-all">{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TabsContent>
    );
  }

  if (tab === "raw") {
    const raw = JSON.stringify(response, null, 2);
    return (
      <TabsContent value={tab} className="p-3">
        <CodeEditor value={raw} language="json" readOnly minHeight={240} />
      </TabsContent>
    );
  }

  // Message tab — handles both unary (1 message) and server-streaming
  // (N messages). The bridge always returns an array; we render a tree
  // per message with an index header when N > 1.
  const messages = response.messages ?? [];
  return (
    <TabsContent value={tab} className="p-3 space-y-3">
      {response.error && response.error !== "grpcurl_missing" ? (
        <div className="text-xs text-[var(--color-danger)] font-mono whitespace-pre-wrap">
          {response.error}
          {response.stderr ? `\n\n${response.stderr}` : ""}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-xs text-[var(--color-fg-muted)] italic">{t("grpc.empty.message")}</div>
      ) : (
        <>
          {messages.length > 1 && (
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold">
              {t("grpc.streaming.received", { count: String(messages.length) })}
            </div>
          )}
          {messages.map((raw, i) => (
            <MessageTree key={i} raw={raw} index={messages.length > 1 ? i + 1 : null} />
          ))}
        </>
      )}
    </TabsContent>
  );
}

function MessageTree({ raw, index }: { raw: string; index: number | null }) {
  let body: React.ReactNode;
  try {
    const parsed = JSON.parse(raw);
    body = (
      <div className="select-text">
        <JsonView
          value={parsed}
          style={treeStyle as React.CSSProperties}
          displayDataTypes={false}
          displayObjectSize={true}
          collapsed={2}
        />
      </div>
    );
  } catch {
    body = (
      <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-words leading-6 select-text">
        {raw}
      </pre>
    );
  }
  if (index === null) return body;
  return (
    <div className="border-l-2 border-[var(--color-border)] pl-3">
      <div className="text-[10px] font-mono text-[var(--color-fg-muted)] mb-1.5">#{index}</div>
      {body}
    </div>
  );
}
