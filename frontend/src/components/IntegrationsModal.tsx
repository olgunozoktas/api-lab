/** Olgun Özoktaş geliştirdi · API Lab */
import { useState } from "react";
import { INTEGRATIONS, findIntegration } from "../lib/integrations/registry";
import { fetchIntegrationSpec, type IntegrationFetchResult } from "../lib/integrations/fetch";
import { applyAuthToItems } from "../lib/integrations/auth";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { IntegrationCard, type IntegrationCardStatus } from "./IntegrationCard";

type CardState = { status: IntegrationCardStatus; errorText?: string };

export interface IntegrationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Integrations gallery — opt-in surface. Reached from the TopBar; not
// shown by default. Page-level container: owns the per-integration
// fetch lifecycle and wires the store. Cards stay presentational.
export function IntegrationsModal({ open, onOpenChange }: IntegrationsModalProps) {
  const t = useT();
  const enabled = useStore((s) => s.enabledIntegrations);
  const enableIntegration = useStore((s) => s.enableIntegration);
  const disableIntegration = useStore((s) => s.disableIntegration);
  const importItems = useStore((s) => s.importItems);
  const removeIntegrationCollection = useStore((s) => s.removeIntegrationCollection);
  const showToast = useStore((s) => s.showToast);
  const [states, setStates] = useState<Record<string, CardState>>({});

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
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
