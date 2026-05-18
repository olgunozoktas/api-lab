/** Olgun Özoktaş geliştirdi · API Lab */
// gRPC composer presenter — the message / metadata / proto / tls
// request tabs over a response section. Pure props; the load
// lifecycle and store wiring live in GrpcPanelContainer.tsx.
import { useState } from "react";
import { useT } from "../lib/i18n/useT";
import type { GrpcState, GrpcTls, KvRow } from "../lib/types";
import type { GrpcResponse } from "../lib/bridge";
import { extractTarget, isLikelyFullMethod } from "../lib/grpc";
import {
  GrpcServicesSidebar,
  type ServiceMethodPick,
  type SidebarState,
} from "./GrpcServicesSidebar";
import { Button } from "./ui/button";
import { CodeEditor } from "./ui/code-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { KvTable } from "./KvTable";
import { cn } from "../lib/cn";
import { Send, Plug, Info, ShieldAlert } from "lucide-react";
import { GrpcResponseSection, GrpcStatusPill, type GrpcStatus } from "./GrpcResponseSection";

export type { GrpcStatus };

export type GrpcPanelProps = {
  url: string;
  fullMethod: string;
  grpc: GrpcState;
  status: GrpcStatus;
  response: GrpcResponse | null;
  durationMs: number;
  reflectState: SidebarState;
  reqTab: "message" | "metadata" | "proto" | "tls";
  onReqTabChange: (tab: "message" | "metadata" | "proto" | "tls") => void;
  onFullMethodChange: (s: string) => void;
  onMessageChange: (s: string) => void;
  onMetadataChange: (rows: KvRow[]) => void;
  onUseReflectionChange: (b: boolean) => void;
  onImportPathsChange: (s: string) => void;
  onProtoFilesChange: (s: string) => void;
  onTlsChange: (patch: Partial<GrpcTls>) => void;
  onReflectLoad: () => void;
  onReflectRefresh?: () => void;
  onReflectMethodPick: (pick: ServiceMethodPick) => void;
  onSend: () => void;
};

export function GrpcPanel(p: GrpcPanelProps) {
  const t = useT();
  const tls = p.grpc.tls ?? {};
  const [resTab, setResTab] = useState<"message" | "headers" | "trailers" | "raw">("message");
  const target = extractTarget(p.url);
  const canSend = target.length > 0 && p.fullMethod.trim().length > 0 && p.status !== "running";
  const fullMethodHint = p.fullMethod.length > 0 && !isLikelyFullMethod(p.fullMethod);

  return (
    <section className="bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap">
        <GrpcStatusPill status={p.status} statusCode={p.response?.status} />
        <input
          type="text"
          placeholder={t("grpc.fullMethod.placeholder")}
          value={p.fullMethod}
          onChange={(e) => p.onFullMethodChange(e.target.value)}
          aria-label={t("grpc.fullMethod.label")}
          className={cn(
            "bg-[var(--color-bg)] border rounded-md px-2 py-1 font-mono text-xs flex-1 min-w-[280px] outline-none",
            fullMethodHint
              ? "border-[var(--color-warning)]"
              : "border-[var(--color-border)] focus:border-[var(--color-accent)]"
          )}
        />
        <span
          className="text-xs font-mono text-[var(--color-fg-muted)] tabular-nums"
          title={t("grpc.duration.title")}
        >
          {p.durationMs > 0 ? `${p.durationMs} ms` : "—"}
        </span>
        <Button variant="primary" size="md" onClick={p.onSend} disabled={!canSend}>
          {p.status === "running" ? (
            <>
              <Plug className="w-3.5 h-3.5" />
              {t("grpc.sending")}
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              {t("grpc.send")}
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-rows-2 flex-1 min-h-0 divide-y divide-[var(--color-border)]">
        <Tabs
          value={p.reqTab}
          onValueChange={(v) => p.onReqTabChange(v as typeof p.reqTab)}
          className="flex flex-col min-h-0"
        >
          <TabsList>
            <TabsTrigger value="message">{t("grpc.tab.message")}</TabsTrigger>
            <TabsTrigger value="metadata">{t("grpc.tab.metadata")}</TabsTrigger>
            <TabsTrigger value="proto">{t("grpc.tab.proto")}</TabsTrigger>
            <TabsTrigger value="tls">{t("grpc.tab.tls")}</TabsTrigger>
          </TabsList>
          <TabsContent value="message" className="p-3">
            <CodeEditor
              value={p.grpc.message}
              onChange={p.onMessageChange}
              language="json"
              placeholder={t("grpc.message.placeholder")}
              minHeight={160}
            />
          </TabsContent>
          <TabsContent value="metadata" className="p-3">
            <KvTable
              rows={p.grpc.metadata}
              onChange={p.onMetadataChange}
              addLabelKey="grpc.addMetadata"
            />
          </TabsContent>
          <TabsContent value="proto" className="p-3 space-y-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={p.grpc.useReflection}
                onChange={(e) => p.onUseReflectionChange(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              <span>{t("grpc.useReflection.label")}</span>
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-[var(--color-fg-muted)]">{t("grpc.importPaths.label")}</span>
              <input
                type="text"
                placeholder={t("grpc.importPaths.placeholder")}
                value={p.grpc.importPaths.join(",")}
                disabled={p.grpc.useReflection}
                onChange={(e) => p.onImportPathsChange(e.target.value)}
                className="w-full bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-[var(--color-fg-muted)]">{t("grpc.protoFiles.label")}</span>
              <input
                type="text"
                placeholder={t("grpc.protoFiles.placeholder")}
                value={p.grpc.protoFiles.join(",")}
                disabled={p.grpc.useReflection}
                onChange={(e) => p.onProtoFilesChange(e.target.value)}
                className="w-full bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
              />
            </label>
            <p className="text-3xs text-[var(--color-fg-muted)] flex gap-1.5 items-start">
              <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />
              {t("grpc.proto.hint")}
            </p>
            <div className="border-t border-[var(--color-border)] pt-3 mt-2">
              <GrpcServicesSidebar
                state={p.reflectState}
                onLoad={p.onReflectLoad}
                onRefresh={p.onReflectRefresh}
                onMethodPick={p.onReflectMethodPick}
              />
            </div>
          </TabsContent>
          <TabsContent value="tls" className="p-3 space-y-3 overflow-auto">
            <p className="text-3xs text-[var(--color-fg-muted)] flex gap-1.5 items-start">
              <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />
              {t("grpc.tls.hint")}
            </p>
            <label className="block text-xs space-y-1">
              <span className="text-[var(--color-fg-muted)]">{t("grpc.tls.serverName.label")}</span>
              <input
                type="text"
                placeholder={t("grpc.tls.serverName.placeholder")}
                value={tls.serverName ?? ""}
                onChange={(e) => p.onTlsChange({ serverName: e.target.value })}
                className="w-full bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-[var(--color-fg-muted)]">{t("grpc.tls.authority.label")}</span>
              <input
                type="text"
                placeholder={t("grpc.tls.authority.placeholder")}
                value={tls.authority ?? ""}
                onChange={(e) => p.onTlsChange({ authority: e.target.value })}
                className="w-full bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-[var(--color-fg-muted)]">{t("grpc.tls.caCert.label")}</span>
              <CodeEditor
                value={tls.caCert ?? ""}
                onChange={(v) => p.onTlsChange({ caCert: v })}
                language="text"
                placeholder={t("grpc.tls.caCert.placeholder")}
                minHeight={96}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-[var(--color-fg-muted)]">{t("grpc.tls.clientCert.label")}</span>
              <CodeEditor
                value={tls.clientCert ?? ""}
                onChange={(v) => p.onTlsChange({ clientCert: v })}
                language="text"
                placeholder={t("grpc.tls.clientCert.placeholder")}
                minHeight={96}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-[var(--color-fg-muted)]">{t("grpc.tls.clientKey.label")}</span>
              <CodeEditor
                value={tls.clientKey ?? ""}
                onChange={(v) => p.onTlsChange({ clientKey: v })}
                language="text"
                placeholder={t("grpc.tls.clientKey.placeholder")}
                minHeight={96}
              />
            </label>
            <p className="text-3xs text-[var(--color-warning)] flex gap-1.5 items-start">
              <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />
              {t("grpc.tls.security.warning")}
            </p>
          </TabsContent>
        </Tabs>

        <Tabs
          value={resTab}
          onValueChange={(v) => setResTab(v as typeof resTab)}
          className="flex flex-col min-h-0"
        >
          <TabsList>
            <TabsTrigger value="message">{t("grpc.response.tab.message")}</TabsTrigger>
            <TabsTrigger value="headers">
              {t("grpc.response.tab.headers")}
              {p.response && p.response.headers.length > 0 && (
                <span className="ml-1 text-[var(--color-fg-muted)]">
                  ({p.response.headers.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="trailers">
              {t("grpc.response.tab.trailers")}
              {p.response && p.response.trailers.length > 0 && (
                <span className="ml-1 text-[var(--color-fg-muted)]">
                  ({p.response.trailers.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw">{t("grpc.response.tab.raw")}</TabsTrigger>
          </TabsList>
          <GrpcResponseSection response={p.response} status={p.status} tab={resTab} />
        </Tabs>
      </div>
    </section>
  );
}

// GrpcPanelContainer lives in `./GrpcPanelContainer.tsx` (wires this
// presenter to the store + bridge). Re-exported there so callers
// continue importing `GrpcPanel` and `GrpcPanelContainer` from this
// module's siblings without churn.
