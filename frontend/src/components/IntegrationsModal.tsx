/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useState } from "react";
import { INTEGRATIONS, findIntegration } from "../lib/integrations/registry";
import {
  fetchIntegrationSpec,
  headerValue,
  type IntegrationFetchResult,
} from "../lib/integrations/fetch";
import { checkSpecStaleness, type SpecProbe } from "../lib/integrations/staleness";
import { applyAuthToItems } from "../lib/integrations/auth";
import { bridge, type HttpResponse } from "../lib/bridge";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { IntegrationCard, type IntegrationCardStatus } from "./IntegrationCard";

type CardState = { status: IntegrationCardStatus; errorText?: string };

export interface IntegrationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Conditional GET of a spec URL through the native bridge, mapped to
// the staleness checker's `SpecProbe`. Passing the stored ETag as
// `If-None-Match` lets a well-behaved provider answer 304.
async function probeSpec(specUrl: string, ifNoneMatch: string): Promise<SpecProbe> {
  if (!bridge.available) return { error: "native bridge required" };
  try {
    const res = await bridge.invoke<HttpResponse>("http.request", {
      method: "GET",
      url: specUrl,
      headers: ifNoneMatch ? [{ name: "If-None-Match", value: ifNoneMatch }] : [],
      body: null,
    });
    if (res.error) return { error: res.error };
    return {
      status: res.status,
      etag: headerValue(res.headers, "etag"),
      lastModified: headerValue(res.headers, "last-modified"),
      body: res.body,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// Integrations gallery — opt-in surface. Reached from the TopBar; not
// shown by default. Page-level container: owns the per-integration
// fetch lifecycle and wires the store. Cards stay presentational.
export function IntegrationsModal({ open, onOpenChange }: IntegrationsModalProps) {
  const t = useT();
  const enabled = useStore((s) => s.enabledIntegrations);
  const enableIntegration = useStore((s) => s.enableIntegration);
  const disableIntegration = useStore((s) => s.disableIntegration);
  const fingerprints = useStore((s) => s.integrationFingerprints);
  const setIntegrationFingerprint = useStore((s) => s.setIntegrationFingerprint);
  const importItems = useStore((s) => s.importItems);
  const removeIntegrationCollection = useStore((s) => s.removeIntegrationCollection);
  const showToast = useStore((s) => s.showToast);
  const [states, setStates] = useState<Record<string, CardState>>({});
  // Ids flagged stale by the on-open check. Runtime-only (recomputed
  // each open) — never persisted, so a transient `unreachable` can't
  // leave a stuck badge.
  const [staleIds, setStaleIds] = useState<string[]>([]);

  // On gallery open, conditionally re-fetch each enabled `openapi-url`
  // spec and flag the ones whose upstream has drifted. Curated
  // providers are skipped (nothing upstream); `unreachable` providers
  // fail quietly — they simply aren't added to the stale set.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const stale: string[] = [];
      for (const def of INTEGRATIONS) {
        if (def.fetch.kind !== "openapi-url" || !enabled.includes(def.id)) continue;
        const verdict = await checkSpecStaleness(def, fingerprints[def.id] ?? "", probeSpec);
        if (verdict === "stale") stale.push(def.id);
      }
      if (!cancelled) setStaleIds(stale);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, enabled, fingerprints]);

  // Map a fetch failure to a user-facing line.
  function failureText(res: Extract<IntegrationFetchResult, { ok: false }>): string {
    switch (res.reason) {
      case "too-large":
        return t("integrations.error.tooLarge", { detail: res.detail });
      case "bridge-unavailable":
        return t("integrations.error.bridge");
      case "parse-failed":
        return t("integrations.error.parse", { detail: res.detail });
      default:
        return t("integrations.error.fetch", { detail: res.detail });
    }
  }

  async function handleToggle(id: string) {
    const def = findIntegration(id);
    if (!def) return;

    if (enabled.includes(id)) {
      // Disable also removes the imported collection so the sidebar
      // doesn't keep a dangling integration folder.
      removeIntegrationCollection(id);
      disableIntegration(id);
      showToast(t("integrations.toast.disabled", { name: def.name }), { severity: "info" });
      return;
    }

    setStates((prev) => ({ ...prev, [id]: { status: "fetching" } }));
    const res = await fetchIntegrationSpec(def);
    if (res.ok) {
      const items = applyAuthToItems(res.result.items, def.authType);
      importItems(items, res.result.envVars, def.name, def.id);
      enableIntegration(id);
      // Capture the spec fingerprint so a later open can detect drift.
      if (res.fingerprint) setIntegrationFingerprint(id, res.fingerprint);
      setStates((prev) => ({ ...prev, [id]: { status: "idle" } }));
      showToast(
        t("integrations.toast.enabled", {
          name: def.name,
          count: String(res.result.requestCount),
        }),
        { severity: "success" }
      );
    } else {
      const errorText = failureText(res);
      setStates((prev) => ({ ...prev, [id]: { status: "error", errorText } }));
      showToast(t("integrations.toast.failed", { name: def.name, reason: errorText }), {
        severity: "error",
      });
    }
  }

  // Re-import a stale integration's current spec. Replace, not merge:
  // the old collection is dropped and the fresh spec re-imported, then
  // the fingerprint baseline is refreshed and the stale flag cleared.
  async function handleUpdate(id: string) {
    const def = findIntegration(id);
    if (!def) return;
    setStates((prev) => ({ ...prev, [id]: { status: "fetching" } }));
    const res = await fetchIntegrationSpec(def);
    if (res.ok) {
      const items = applyAuthToItems(res.result.items, def.authType);
      removeIntegrationCollection(id);
      importItems(items, res.result.envVars, def.name, def.id);
      if (res.fingerprint) setIntegrationFingerprint(id, res.fingerprint);
      setStaleIds((prev) => prev.filter((sid) => sid !== id));
      setStates((prev) => ({ ...prev, [id]: { status: "idle" } }));
      showToast(t("integrations.toast.updated", { name: def.name }), { severity: "success" });
    } else {
      const errorText = failureText(res);
      setStates((prev) => ({ ...prev, [id]: { status: "error", errorText } }));
      showToast(t("integrations.toast.failed", { name: def.name, reason: errorText }), {
        severity: "error",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(620px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("integrations.title")}</DialogTitle>
          <DialogDescription>{t("integrations.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {INTEGRATIONS.map((def) => {
            const st: CardState = states[def.id] ?? { status: "idle" };
            return (
              <IntegrationCard
                key={def.id}
                def={def}
                enabled={enabled.includes(def.id)}
                status={st.status}
                errorText={st.errorText}
                onToggle={() => void handleToggle(def.id)}
                stale={staleIds.includes(def.id)}
                onUpdate={() => void handleUpdate(def.id)}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
