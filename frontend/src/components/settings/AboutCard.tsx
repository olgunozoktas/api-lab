/** Olgun Özoktaş geliştirdi · API Lab */
// "About" surface — version, what API Lab is, where to go for help.
// The Guides / Changelog buttons dispatch window events that TopBar
// listens for, so this stays prop-light and the modal can close itself
// before the next one opens. Extracted from SettingsModal.tsx to
// honor the 400-LOC cap.
import { useStore } from "../../store";
import { useT } from "../../lib/i18n/useT";
import { APP_VERSION, formatBuildDate } from "../../lib/changelog";
import { BookOpen, ClockArrowUp, ExternalLink } from "lucide-react";
import { StatTile } from "./primitives";

export function AboutCard({ onClose }: { onClose: () => void }) {
  const t = useT();
  // Quick "your data" stats. Folders and requests are split out of the
  // single CollectionItem tree by `kind`; examples are nested inside
  // each request's snapshot, so they're summed across all requests.
  const items = useStore((s) => s.collectionItems);
  const history = useStore((s) => s.history);
  const envs = useStore((s) => s.envs);
  const requestCount = items.filter((i) => i.kind === "request").length;
  const folderCount = items.length - requestCount;
  const exampleCount = items.reduce(
    (sum, i) => sum + (i.kind === "request" ? (i.request?.examples?.length ?? 0) : 0),
    0
  );
  const fireAndClose = (eventName: string) => () => {
    onClose();
    // Run on the next tick so the Dialog finishes its exit animation
    // before the receiving modal mounts — avoids the brief "two open
    // dialogs" flash when transitioning.
    setTimeout(() => window.dispatchEvent(new CustomEvent(eventName)), 0);
  };
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
        <span className="font-semibold text-sm">{t("settings.about.name")}</span>
        <span
          className="text-3xs font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]"
          aria-label={t("settings.about.versionAria", { version: APP_VERSION })}
        >
          v{APP_VERSION}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-fg-muted)]">
        {t("settings.about.tagline")}
      </p>
      <dl className="text-2xs grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.platform")}</dt>
        <dd className="font-mono">macOS</dd>
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.shell")}</dt>
        <dd className="font-mono">zero-native (Zig + WebKit)</dd>
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.frontend")}</dt>
        <dd className="font-mono">Vite + React 19 + Tailwind v4</dd>
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.storage")}</dt>
        <dd className="font-mono">{t("settings.about.storageLocal")}</dd>
        {formatBuildDate() && (
          <>
            <dt className="text-[var(--color-fg-muted)]">{t("settings.about.built")}</dt>
            <dd className="font-mono">{formatBuildDate()}</dd>
          </>
        )}
      </dl>
      <div>
        <p className="text-3xs uppercase tracking-wide font-semibold text-[var(--color-fg-muted)] mb-1.5">
          {t("settings.about.yourData")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <StatTile label={t("settings.about.stat.requests")} value={requestCount} />
          <StatTile label={t("settings.about.stat.folders")} value={folderCount} />
          <StatTile label={t("settings.about.stat.history")} value={history.length} />
          <StatTile label={t("settings.about.stat.environments")} value={envs.length} />
          <StatTile label={t("settings.about.stat.examples")} value={exampleCount} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <AboutLink
          onClick={fireAndClose("apilab:open-guides")}
          icon={<BookOpen className="w-3 h-3" aria-hidden />}
        >
          {t("settings.about.openGuides")}
        </AboutLink>
        <AboutLink
          onClick={fireAndClose("apilab:open-changelog")}
          icon={<ClockArrowUp className="w-3 h-3" aria-hidden />}
        >
          {t("settings.about.openChangelog")}
        </AboutLink>
        <a
          href="https://github.com/olgunozoktas/api-lab"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border)] text-2xs hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] text-[var(--color-fg-muted)]"
        >
          {t("settings.about.repo")}
          <ExternalLink className="w-2.5 h-2.5 opacity-60" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function AboutLink({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border)] text-2xs hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] text-[var(--color-fg-muted)]"
    >
      {icon}
      {children}
    </button>
  );
}
