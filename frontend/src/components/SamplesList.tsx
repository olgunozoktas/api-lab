/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { SAMPLES, type Sample } from "../lib/samples";
import { Globe2, Workflow, Radio, Activity, Network, EyeOff } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";

// Maps a Sample kind to a small lucide icon. Kept inline as a pure
// data table — no JSX side-effects. Adding a new SampleKind requires
// adding a row here too, which is intentional (forces a deliberate
// visual choice for any new protocol).
const KIND_ICON = {
  http: Globe2,
  graphql: Workflow,
  ws: Radio,
  sse: Activity,
  grpc: Network,
} as const;

const KIND_LABEL = {
  http: "HTTP",
  graphql: "GQL",
  ws: "WS",
  sse: "SSE",
  grpc: "gRPC",
} as const;

// Presenter — receives the list to render + click + hide callbacks.
// No store coupling so the leaf is testable + Storybook-friendly.
export type SamplesListProps = {
  samples: readonly Sample[];
  onLoad: (sample: Sample) => void;
  /** Optional per-row hide handler. When omitted, no right-click "Hide"
      affordance is rendered — keeps the leaf usable in surfaces (like
      Settings → Sample Requests) that manage visibility differently. */
  onHide?: (id: string) => void;
  hideLabel?: string;
  className?: string;
};

export function SamplesList({
  samples,
  onLoad,
  onHide,
  hideLabel = "Hide",
  className,
}: SamplesListProps) {
  const t = useT();
  if (samples.length === 0) return null;
  return (
    <section className={className} aria-label={t("samples.section.title")}>
      <h3
        className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-fg-muted)]"
        title={t("samples.section.publicHint")}
      >
        {t("samples.section.title")}
      </h3>
      <ul className="px-1.5 pb-2 space-y-px">
        {samples.map((s) => {
          const Icon = KIND_ICON[s.kind];
          const row = (
            <button
              type="button"
              onClick={() => onLoad(s)}
              title={t(s.descriptionKey)}
              className={
                "w-full flex items-center gap-2 px-2 py-1 rounded text-left " +
                "hover:bg-[var(--color-bg-elev)] focus-visible:outline-none " +
                "focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] " +
                "text-[var(--color-fg-muted)] italic"
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span
                className="text-[10px] font-mono font-semibold not-italic px-1 py-0.5 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)] shrink-0"
                aria-hidden
              >
                {KIND_LABEL[s.kind]}
              </span>
              <span className="truncate flex-1 text-xs">{t(s.nameKey)}</span>
            </button>
          );
          if (!onHide) return <li key={s.id}>{row}</li>;
          return (
            <li key={s.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => onHide(s.id)}>
                    <EyeOff className="w-3.5 h-3.5" aria-hidden />
                    {hideLabel}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Container — wires the store. Filters hidden samples; returns null
// entirely if the user has hidden the whole section. Always-reach
// surfaces (⌘P, Settings → Sample Requests) bypass this filter and
// read SAMPLES directly — landing in slice 4/4.
export function SamplesListContainer({ className }: { className?: string }) {
  const t = useT();
  const loadSample = useStore((s) => s.loadSample);
  const hideSample = useStore((s) => s.hideSample);
  const hiddenIds = useStore((s) => s.hiddenSampleIds);
  const sectionHidden = useStore((s) => s.samplesSectionHidden);
  if (sectionHidden) return null;
  const visible = SAMPLES.filter((s) => !hiddenIds.includes(s.id));
  if (visible.length === 0) return null;
  return (
    <SamplesList
      samples={visible}
      onLoad={loadSample}
      onHide={hideSample}
      hideLabel={t("samples.hide")}
      className={className}
    />
  );
}
