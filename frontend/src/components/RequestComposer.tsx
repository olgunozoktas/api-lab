/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { UrlBarContainer } from "./UrlBar";
import { KbdHint } from "./ui/kbd-hint";
import { KvTable } from "./KvTable";
import { AuthPanelContainer } from "./AuthPanel";
import { BodyPanelContainer } from "./BodyPanel";
import { GraphqlPanelContainer } from "./GraphqlPanel";
import { ScriptsPanelContainer } from "./ScriptsPanel";
import { useT } from "../lib/i18n/useT";
import { displayTabName, isDefaultTabName } from "../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import type { AuthType, BodyMode, ComposerTab, KvRow } from "../lib/types";
import type { TKey } from "../lib/i18n";

const TABS: { id: ComposerTab; key: TKey }[] = [
  { id: "params", key: "composer.tab.params" },
  { id: "headers", key: "composer.tab.headers" },
  { id: "auth", key: "composer.tab.auth" },
  { id: "body", key: "composer.tab.body" },
  { id: "graphql", key: "composer.tab.graphql" },
  { id: "scripts", key: "composer.tab.scripts" },
];

// Presenter — most state via internal containers since there are many panels;
// the few top-level fields stay on the props surface for testability.
export type RequestComposerProps = {
  busy: boolean;
  onSend: () => void;
  onCancel?: () => void;
  name: string;
  // `method` + `url` only feed the name-input placeholder — they hint
  // at what `displayTabName` would derive when the user hits ⌘+S on
  // a still-default-named tab. Pure visual; the live values come
  // from store reads in the container.
  method: string;
  url: string;
  params: KvRow[];
  headers: KvRow[];
  // Lightweight indicators so each tab carries an at-a-glance sign of
  // "this tab has content" — feeds the Badge slots in the TabsTrigger.
  authType: AuthType;
  bodyMode: BodyMode;
  hasGraphqlQuery: boolean;
  scriptCount: number;
  composerTab: ComposerTab;
  onNameChange: (n: string) => void;
  onParamsChange: (rows: KvRow[]) => void;
  onHeadersChange: (rows: KvRow[]) => void;
  onTabChange: (t: ComposerTab) => void;
  onSave: () => void;
};

export function RequestComposer({
  busy,
  onSend,
  onCancel,
  name,
  method,
  url,
  params,
  headers,
  authType,
  bodyMode,
  hasGraphqlQuery,
  scriptCount,
  composerTab,
  onNameChange,
  onParamsChange,
  onHeadersChange,
  onTabChange,
  onSave,
}: RequestComposerProps) {
  const t = useT();
  const pCount = params.filter((r) => r.enabled && r.k).length;
  const hCount = headers.filter((r) => r.enabled && r.k).length;
  const authBadge = authType !== "none" ? t(`composer.tabBadge.auth.${authType}` as TKey) : null;
  const bodyBadge = bodyMode !== "none" ? t(`composer.tabBadge.body.${bodyMode}` as TKey) : null;
  // Render the input as empty + show derived `METHOD shortUrl` (or
  // the request-name placeholder) when the tab is still using a
  // default name. The store can hold "Yeni istek" — but presenting
  // that as the input value would lock the suggestion behind a
  // select-all-delete. Empty value + placeholder lets the user
  // type straight over the suggestion.
  const isDefault = isDefaultTabName(name);
  const derivedNamePreview = displayTabName({ name: "", method, url });
  const displayValue = isDefault ? "" : name;
  const namePlaceholder = derivedNamePreview || t("composer.requestName");

  return (
    <section className="bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <input
          value={displayValue}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          title={
            derivedNamePreview
              ? t("composer.requestName.derivedTitle", { name: derivedNamePreview })
              : undefined
          }
          className="flex-1 bg-transparent border-0 outline-none text-sm font-medium"
        />
        <Button variant="secondary" size="sm" onClick={onSave} title={t("composer.save.title")}>
          {t("composer.save")}
          <KbdHint>⌘ S</KbdHint>
        </Button>
      </div>

      <UrlBarContainer busy={busy} onSend={onSend} onCancel={onCancel} />

      <Tabs
        value={composerTab}
        onValueChange={(v) => onTabChange(v as ComposerTab)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {t(tab.key)}
              {tab.id === "params" && pCount > 0 && <Badge>{pCount}</Badge>}
              {tab.id === "headers" && hCount > 0 && <Badge>{hCount}</Badge>}
              {tab.id === "auth" && authBadge && <Badge>{authBadge}</Badge>}
              {tab.id === "body" && bodyBadge && <Badge>{bodyBadge}</Badge>}
              {tab.id === "graphql" && hasGraphqlQuery && <Badge>•</Badge>}
              {tab.id === "scripts" && scriptCount > 0 && <Badge>{scriptCount}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="params" className="p-3 bg-[var(--color-bg)]">
          <Hint i18nKey="params.hint" />
          <KvTable rows={params} onChange={onParamsChange} addLabelKey="kv.addParam" />
        </TabsContent>
        <TabsContent value="headers" className="p-3 bg-[var(--color-bg)]">
          <Hint i18nKey="headers.hint" />
          <KvTable rows={headers} onChange={onHeadersChange} addLabelKey="kv.addHeader" />
        </TabsContent>
        <TabsContent value="auth" className="p-3 bg-[var(--color-bg)]">
          <AuthPanelContainer />
        </TabsContent>
        <TabsContent value="body" className="p-3 bg-[var(--color-bg)]">
          <BodyPanelContainer />
        </TabsContent>
        <TabsContent value="graphql" className="p-3 bg-[var(--color-bg)]">
          <GraphqlPanelContainer />
        </TabsContent>
        <TabsContent value="scripts" className="p-3 bg-[var(--color-bg)]">
          <ScriptsPanelContainer />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[var(--color-accent)] text-white text-4xs uppercase tracking-wide px-1.5 py-0.5 rounded-full ml-1">
      {children}
    </span>
  );
}

// Inline note rendered above a panel — mirrors the AuthTypeHint /
// BodyModeHint look so every composer tab feels consistent. Keeps
// short prose tied to whatever the user is about to edit, without
// pushing them out to the Guide hub for context.
function Hint({ i18nKey }: { i18nKey: import("../lib/i18n").TKey }) {
  const t = useT();
  return (
    <div
      role="note"
      className="mb-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-2xs leading-relaxed text-[var(--color-fg-muted)]"
    >
      {t(i18nKey)}
    </div>
  );
}

// Container — wires the store. App-level concerns (busy, onSend) are passed in.
export type RequestComposerContainerProps = {
  busy: boolean;
  onSend: () => void;
  onCancel?: () => void;
};

export function RequestComposerContainer({
  busy,
  onSend,
  onCancel,
}: RequestComposerContainerProps) {
  const name = useStore((s) => s.current.name);
  const method = useStore((s) => s.current.method);
  const url = useStore((s) => s.current.url);
  const params = useStore((s) => s.current.params);
  const headers = useStore((s) => s.current.headers);
  const authType = useStore((s) => s.current.auth.type);
  const bodyMode = useStore((s) => s.current.body.mode);
  const gqlQuery = useStore((s) => s.current.gql.query);
  const preScript = useStore((s) => s.current.preScript);
  const postScript = useStore((s) => s.current.postScript);
  const composerTab = useStore((s) => s.ui.composerTab);
  const setCurrent = useStore((s) => s.setCurrent);
  const setUi = useStore((s) => s.setUi);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const scriptCount = (preScript?.trim() ? 1 : 0) + (postScript?.trim() ? 1 : 0);

  return (
    <RequestComposer
      busy={busy}
      onSend={onSend}
      onCancel={onCancel}
      name={name}
      method={method}
      url={url}
      params={params}
      headers={headers}
      authType={authType}
      bodyMode={bodyMode}
      hasGraphqlQuery={gqlQuery.trim().length > 0}
      scriptCount={scriptCount}
      composerTab={composerTab}
      onNameChange={(name) => setCurrent({ name })}
      onParamsChange={(params) => setCurrent({ params })}
      onHeadersChange={(headers) => setCurrent({ headers })}
      onTabChange={(composerTab) => setUi({ composerTab })}
      onSave={saveCurrent}
    />
  );
}
