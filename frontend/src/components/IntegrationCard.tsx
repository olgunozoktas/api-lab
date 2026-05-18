/** Olgun Özoktaş geliştirdi · API Lab */
import type { IntegrationDef } from "../lib/integrations/registry";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { useT } from "../lib/i18n/useT";

export type IntegrationCardStatus = "idle" | "fetching" | "error";

interface IntegrationCardProps {
  def: IntegrationDef;
  enabled: boolean;
  status: IntegrationCardStatus;
  errorText?: string;
  onToggle: () => void;
}

// Presentational gallery card — one integration. Store-agnostic: the
// container (`IntegrationsModal`) owns enable/disable + fetch state.
export function IntegrationCard({
  def,
  enabled,
  status,
  errorText,
  onToggle,
}: IntegrationCardProps) {
  const t = useT();
  const fetching = status === "fetching";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{def.name}</span>
            <Badge tone="neutral" size="sm">
              {def.category}
            </Badge>
            {enabled && (
              <Badge tone="success" size="sm">
                {t("integrations.enabled")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-2xs text-[var(--color-fg-muted)]">{def.description}</p>
        </div>
        <Button
          variant={enabled ? "outline" : "primary"}
          size="sm"
          onClick={onToggle}
          disabled={fetching}
          className="shrink-0"
        >
          {fetching && <Spinner />}
          {fetching
            ? t("integrations.fetching")
            : enabled
              ? t("integrations.disable")
              : t("integrations.enable")}
        </Button>
      </div>
      {status === "error" && errorText && (
        <p className="text-2xs text-[var(--color-danger)]">{errorText}</p>
      )}
    </div>
  );
}
