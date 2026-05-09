// Wires GrpcPanel to the store. Owns:
//   * gRPC unary call lifecycle (status / response / durationMs)
//   * reqTab (controlled — needed so the reflection picker can jump to
//     "message" after a click)
//   * Reflection sidebar state + bridge fetch for `grpc.reflect.list`
//     and `grpc.reflect.skeleton`
//
// Lives in its own file because the combined presenter+container in
// GrpcPanel.tsx hit the 400-LOC cap once reflection landed. Pure store
// wiring + bridge plumbing here; rendering stays in GrpcPanel.tsx.

import { useState } from "react";
import { useStore, useActiveVars } from "../store";
import { envSubst } from "../lib/utils";
import { emptyGrpcState, type GrpcState } from "../lib/types";
import { bridge } from "../lib/bridge";
import type {
  GrpcMetadataEntry,
  GrpcReflectListResponse,
  GrpcReflectSkeletonResponse,
  GrpcRequest,
  GrpcResponse,
} from "../lib/bridge";
import { buildTlsPayload, derivePlaintext, extractTarget } from "../lib/grpc";
import { GrpcPanel, type GrpcStatus } from "./GrpcPanel";
import type { ServiceMethodPick, SidebarState } from "./GrpcServicesSidebar";

export function GrpcPanelContainer() {
  const url = useStore((s) => s.current.url);
  const grpcState = useStore((s) => s.current.grpc);
  const setCurrent = useStore((s) => s.setCurrent);
  const vars = useActiveVars();

  const grpc: GrpcState = grpcState ?? emptyGrpcState();
  const fullMethod = grpc.fullMethod;

  const [status, setStatus] = useState<GrpcStatus>("idle");
  const [response, setResponse] = useState<GrpcResponse | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [reqTab, setReqTab] = useState<"message" | "metadata" | "proto" | "tls">("message");
  const [reflectState, setReflectState] = useState<SidebarState>({ kind: "idle" });

  const substitutedUrl = envSubst(url, vars);
  const target = extractTarget(substitutedUrl);

  const updateGrpc = (patch: Partial<GrpcState>) => {
    setCurrent({ grpc: { ...grpc, ...patch } });
  };

  const onReflectLoad = async () => {
    if (!target) {
      setReflectState({
        kind: "error",
        error: "no_target",
        hint: "Set a grpc:// or grpcs:// URL first.",
      });
      return;
    }
    setReflectState({ kind: "loading" });
    try {
      const r = await bridge.invoke<GrpcReflectListResponse>("grpc.reflect.list", {
        target,
        plaintext: grpc.plaintext ?? derivePlaintext(substitutedUrl),
        timeout_ms: 30000,
      });
      if (r.error) {
        setReflectState({ kind: "error", error: r.error, hint: r.stderr ?? r.install_hint });
      } else {
        setReflectState({ kind: "ready", services: r.services ?? [] });
      }
    } catch (e) {
      setReflectState({ kind: "error", error: (e as Error).message || String(e) });
    }
  };

  const onReflectMethodPick = async (pick: ServiceMethodPick) => {
    const newFullMethod = `${pick.service}/${pick.method.name}`;
    let skeleton = "{}";
    if (target) {
      try {
        const r = await bridge.invoke<GrpcReflectSkeletonResponse>("grpc.reflect.skeleton", {
          target,
          message_type: pick.method.request_type,
          plaintext: grpc.plaintext ?? derivePlaintext(substitutedUrl),
          timeout_ms: 15000,
        });
        if (r.skeleton && r.skeleton.length > 0) skeleton = r.skeleton;
      } catch {
        // best-effort: keep "{}" fallback
      }
    }
    updateGrpc({ fullMethod: newFullMethod, message: skeleton });
    setReqTab("message");
  };

  const onSend = async () => {
    if (status === "running") return;
    if (!target || !fullMethod.trim()) return;
    setStatus("running");
    setResponse(null);
    const t0 = performance.now();
    try {
      const metadata: GrpcMetadataEntry[] = grpc.metadata
        .filter((m) => m.enabled && m.k.trim().length > 0)
        .map((m) => ({
          name: envSubst(m.k, vars),
          value: envSubst(m.v, vars),
        }));
      const payload: GrpcRequest = {
        target,
        full_method: envSubst(fullMethod.trim(), vars),
        message: envSubst(grpc.message, vars),
        metadata,
        plaintext: grpc.plaintext ?? derivePlaintext(substitutedUrl),
        use_reflection: grpc.useReflection,
        import_paths: grpc.importPaths,
        proto_files: grpc.protoFiles,
        timeout_ms: 60000,
        ...buildTlsPayload(grpc.tls, (s) => envSubst(s, vars)),
      };
      const r = await bridge.invoke<GrpcResponse>("grpc.invoke", payload);
      setResponse(r);
      setDurationMs(Math.round(performance.now() - t0));
      if (r.error === "grpcurl_missing") setStatus("missing-binary");
      else if (r.error || r.exit_code !== 0) setStatus("error");
      else setStatus("ok");
    } catch (e) {
      setResponse({
        status: "Unknown",
        status_code_num: -1,
        status_message: "",
        messages: [],
        message_count: 0,
        headers: [],
        trailers: [],
        exit_code: -1,
        stderr: "",
        error: (e as Error).message || String(e),
      });
      setDurationMs(Math.round(performance.now() - t0));
      setStatus("error");
    }
  };

  return (
    <GrpcPanel
      url={substitutedUrl}
      fullMethod={fullMethod}
      grpc={grpc}
      status={status}
      response={response}
      durationMs={durationMs}
      onFullMethodChange={(fullMethod) => updateGrpc({ fullMethod })}
      onMessageChange={(message) => updateGrpc({ message })}
      onMetadataChange={(metadata) => updateGrpc({ metadata })}
      onUseReflectionChange={(useReflection) => updateGrpc({ useReflection })}
      onImportPathsChange={(s) =>
        updateGrpc({
          importPaths: s
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0),
        })
      }
      onProtoFilesChange={(s) =>
        updateGrpc({
          protoFiles: s
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0),
        })
      }
      onTlsChange={(patch) => updateGrpc({ tls: { ...(grpc.tls ?? {}), ...patch } })}
      reflectState={reflectState}
      reqTab={reqTab}
      onReqTabChange={setReqTab}
      onReflectLoad={onReflectLoad}
      onReflectMethodPick={onReflectMethodPick}
      onSend={onSend}
    />
  );
}
