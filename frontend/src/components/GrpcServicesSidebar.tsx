/** Olgun Özoktaş geliştirdi · API Lab */
// Lazy-loaded reflection browser. Lives inside GrpcPanel's Proto tab.
// User clicks "Browse services" → bridge fans out (one `grpcurl list`
// + N `grpcurl describe` calls), the tree renders, and clicking a
// method populates the parent composer's fullMethod + a JSON skeleton
// of the request message.
//
// No store access here — pure presenter + a small container that owns
// the load lifecycle. Caller hands in target + plaintext + the click
// handler. The container fetches via `bridge.invoke<>`; the presenter
// renders the four states (idle / loading / error / ready).

import { useState } from "react";
import { ChevronRight, ChevronDown, RefreshCw, Globe, Layers, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { useT } from "../lib/i18n/useT";
import { formatCachedAge } from "../lib/reflectionCache";
import type { GrpcReflectMethod, GrpcReflectService } from "../lib/bridge";

export type SidebarState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; error: string; hint?: string }
  | { kind: "ready"; services: GrpcReflectService[]; cachedAt?: number };

export type ServiceMethodPick = {
  service: string;
  method: GrpcReflectMethod;
};

export type GrpcServicesSidebarProps = {
  state: SidebarState;
  onLoad: () => void;
  // Explicit-invalidate refresh used by the ready-state header. Falls
  // back to onLoad for callers that don't yet differentiate (so the
  // sidebar stays drop-in compatible).
  onRefresh?: () => void;
  onMethodPick: (pick: ServiceMethodPick) => void;
};

export function GrpcServicesSidebar({
  state,
  onLoad,
  onRefresh,
  onMethodPick,
}: GrpcServicesSidebarProps) {
  const t = useT();

  if (state.kind === "idle") {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={onLoad}>
          <Globe className="w-3.5 h-3.5" />
          {t("grpc.reflect.browse")}
        </Button>
        <p className="text-3xs text-[var(--color-fg-muted)]">{t("grpc.reflect.idleHint")}</p>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)] py-2">
        <Spinner />
        {t("grpc.reflect.loading")}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-xs text-[var(--color-warning)]">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1">
            <div>{t("grpc.reflect.error.title")}</div>
            {state.hint && (
              <div className="text-3xs text-[var(--color-fg-muted)] mt-1 font-mono">
                {state.hint}
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLoad}>
          <RefreshCw className="w-3.5 h-3.5" />
          {t("grpc.reflect.retry")}
        </Button>
      </div>
    );
  }

  const services = state.services;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-3xs text-[var(--color-fg-muted)] uppercase tracking-wide flex items-center gap-1.5">
          {t("grpc.reflect.servicesCount", { count: String(services.length) })}
          {state.cachedAt !== undefined && <CachedBadge cachedAt={state.cachedAt} />}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh ?? onLoad}
          title={t("grpc.reflect.refresh")}
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
      <ul className="space-y-1">
        {services.map((s) => (
          <ServiceRow key={s.name} service={s} onMethodPick={onMethodPick} />
        ))}
      </ul>
    </div>
  );
}

function ServiceRow({
  service,
  onMethodPick,
}: {
  service: GrpcReflectService;
  onMethodPick: (pick: ServiceMethodPick) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(true);
  return (
    <li className="border-l-2 border-[var(--color-border)] pl-2">
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-mono text-[var(--color-fg)] hover:text-[var(--color-accent)] w-full text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Layers className="w-3 h-3" aria-hidden />
        <span>{service.name}</span>
      </button>
      {service.error && (
        <div className="text-3xs text-[var(--color-warning)] ml-4 mt-1">
          {t("grpc.reflect.serviceError", { error: service.error })}
        </div>
      )}
      {open && (
        <ul className="ml-4 mt-1 space-y-0.5">
          {service.methods.map((m) => (
            <li key={m.name}>
              <MethodPickRow service={service.name} method={m} onMethodPick={onMethodPick} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function MethodPickRow({
  service,
  method,
  onMethodPick,
}: {
  service: string;
  method: GrpcReflectMethod;
  onMethodPick: (pick: ServiceMethodPick) => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => onMethodPick({ service, method })}
      className="w-full text-left flex items-center gap-2 text-xs font-mono py-0.5 px-1 rounded hover:bg-[var(--color-bg-elev-2)]"
      title={t("grpc.reflect.method.title", {
        request: method.request_type,
        response: method.response_type,
      })}
    >
      <span className="text-[var(--color-accent)]">{method.name}</span>
      <span className="text-[var(--color-fg-muted)]">·</span>
      <span className="text-[var(--color-fg-muted)] truncate">
        {shortType(method.request_type)}
      </span>
      {(method.client_stream || method.server_stream) && (
        <StreamBadge client={method.client_stream} server={method.server_stream} />
      )}
    </button>
  );
}

function StreamBadge({ client, server }: { client: boolean; server: boolean }) {
  const t = useT();
  let label = "";
  if (client && server) label = t("grpc.reflect.stream.bidi");
  else if (client) label = t("grpc.reflect.stream.client");
  else if (server) label = t("grpc.reflect.stream.server");
  if (!label) return null;
  return (
    <span className="ml-auto text-4xs uppercase tracking-wide text-[var(--color-fg-muted)] bg-[var(--color-bg-elev-2)] px-1 py-px rounded">
      {label}
    </span>
  );
}

// Strip the leading `.` and any package prefix for compact display.
// `.helloworld.HelloRequest` → `HelloRequest`.
function shortType(t: string): string {
  const cleaned = t.startsWith(".") ? t.slice(1) : t;
  const dot = cleaned.lastIndexOf(".");
  return dot >= 0 ? cleaned.slice(dot + 1) : cleaned;
}

function CachedBadge({ cachedAt }: { cachedAt: number }) {
  const t = useT();
  const age = formatCachedAge(Date.now() - cachedAt);
  return (
    <span className="text-4xs normal-case tracking-normal text-[var(--color-fg-muted)] italic">
      {age.unit === "seconds"
        ? t("grpc.reflect.cachedAgo.seconds", { count: String(age.count) })
        : t("grpc.reflect.cachedAgo.minutes", { count: String(age.count) })}
    </span>
  );
}
