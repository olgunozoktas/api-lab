/** Olgun Özoktaş geliştirdi · API Lab */
import { useRef, useState } from "react";
import { useStore } from "../store";
import { CollectionList } from "./CollectionList";
import { HistoryList } from "./HistoryList";
import { SamplesListContainer } from "./SamplesList";
import { useT } from "../lib/i18n/useT";
import { useConfirm } from "../lib/dialogs";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { KbdHint } from "./ui/kbd-hint";
import { SearchInput } from "./ui/search-input";
import { parsePostmanV2 } from "../lib/importers/postmanV2";
import { isInsomniaExport, parseInsomniaV4 } from "../lib/importers/insomnia";
import { isHarFile, parseHar } from "../lib/importers/har";
import { isBrunoFile, parseBruno } from "../lib/importers/bruno";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Cable, FilePlus, Network, Radio, Sparkles } from "lucide-react";
import type { NewRequestKind } from "../store/collections";

export function Sidebar() {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const resetCurrent = useStore((s) => s.resetCurrent);
  const t = useT();
  // Section-header counts — requests only (folders are container nodes
  // in the same `collectionItems` tree, but we count them separately
  // since "12 saved" reading as "12 requests" is the user's expectation).
  const collectionItems = useStore((s) => s.collectionItems);
  const requestCount = collectionItems.filter((i) => i.kind === "request").length;
  const historyCount = useStore((s) => s.history.length);
  // Per-tab search state. Switching tabs preserves each tab's filter
  // — feels nicer than wiping when the user toggles back and forth.
  const [collectionsQuery, setCollectionsQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");

  return (
    <aside className="bg-[var(--color-bg-elev)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
      <Tabs
        value={ui.sidebarTab}
        onValueChange={(v) => setUi({ sidebarTab: v as "collections" | "history" })}
        className="shrink-0"
      >
        <TabsList className="px-1 py-1 gap-0.5">
          <TabsTrigger
            value="collections"
            className="flex-1 px-1 py-1 border-b-0 rounded-md text-[11px] data-[state=active]:bg-[var(--color-bg-elev-2)]"
          >
            {t("sidebar.tab.collections")}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 px-1 py-1 border-b-0 rounded-md text-[11px] data-[state=active]:bg-[var(--color-bg-elev-2)]"
          >
            {t("sidebar.tab.history")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {ui.sidebarTab === "collections" ? (
        <>
          {/* Built-in samples — sits above the user's collections so
              a first-launch user can click HTTP / GraphQL / WS / SSE
              / gRPC and see the app actually work, instead of staring
              at an empty composer. Hide/show controls land in
              v0.2.33 (slice 3 of #26). */}
          <SamplesListContainer />
          <SectionHeader
            count={requestCount}
            rightSlot={
              <div className="flex gap-1">
                <ImportPostmanButton />
                <OpenSpecButton />
                <NewFolderButton />
              </div>
            }
          >
            {t("sidebar.section.saved")}
          </SectionHeader>
          <SearchInput query={collectionsQuery} onChange={setCollectionsQuery} />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CollectionList query={collectionsQuery} />
          </div>
          <div className="px-2 pb-2 shrink-0">
            {/* Left-click → HTTP default (matches the previous behaviour
                + the ⌘+N shortcut). Right-click → protocol picker for
                WS / SSE / gRPC / GraphQL, mirroring the folder context
                menu so users get a consistent way to spin up a non-HTTP
                request. */}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button
                  variant="dashed"
                  size="md"
                  className="w-full"
                  onClick={() => resetCurrent("http")}
                  title={t("sidebar.newRequest.title") + "  ⌘N"}
                >
                  {t("sidebar.newRequest")}
                  <KbdHint>⌘ N</KbdHint>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => resetCurrent("http")}>
                  <FilePlus className="w-3.5 h-3.5" aria-hidden />
                  {t("collections.context.newRequest")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => resetCurrent("graphql" as NewRequestKind)}>
                  <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  {t("collections.context.newGraphql")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => resetCurrent("ws" as NewRequestKind)}>
                  <Cable className="w-3.5 h-3.5" aria-hidden />
                  {t("collections.context.newWs")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => resetCurrent("sse" as NewRequestKind)}>
                  <Radio className="w-3.5 h-3.5" aria-hidden />
                  {t("collections.context.newSse")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => resetCurrent("grpc" as NewRequestKind)}>
                  <Network className="w-3.5 h-3.5" aria-hidden />
                  {t("collections.context.newGrpc")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </>
      ) : (
        <>
          <SectionHeader count={historyCount} rightSlot={<ClearHistoryButton />}>
            {t("sidebar.section.recent")}
          </SectionHeader>
          <SearchInput
            query={historyQuery}
            onChange={setHistoryQuery}
            placeholderKey="history.search.placeholder"
          />
          <div className="flex-1 min-h-0 flex flex-col">
            <HistoryList query={historyQuery} />
          </div>
        </>
      )}
    </aside>
  );
}

function SectionHeader({
  children,
  count,
  rightSlot,
}: {
  children: React.ReactNode;
  // Optional item count shown as a small tabular-nums pill after the
  // title — keeps the eye anchored on "do I have anything here?"
  // without scrolling the list.
  count?: number;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
      <span className="flex items-center gap-1.5">
        <span>{children}</span>
        {typeof count === "number" && (
          <span className="text-[10px] font-mono normal-case tracking-normal tabular-nums px-1 py-0 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]">
            {count}
          </span>
        )}
      </span>
      {rightSlot}
    </div>
  );
}

function ClearHistoryButton() {
  const clearHistory = useStore((s) => s.clearHistory);
  const confirm = useConfirm();
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        const ok = await confirm({
          title: t("sidebar.confirmClearHistory"),
          confirmLabel: t("sidebar.clearHistory"),
          cancelLabel: t("dialog.cancel"),
          danger: true,
        });
        if (ok) clearHistory();
      }}
      className="text-[11px] h-auto py-0.5 px-1.5"
    >
      {t("sidebar.clearHistory")}
    </Button>
  );
}

function ImportPostmanButton() {
  const importItems = useStore((s) => s.importItems);
  const importHistory = useStore((s) => s.importHistory);
  const setUi = useStore((s) => s.setUi);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      // Bruno `.bru` files are plain text, not JSON — sniff + route
      // them before the JSON-shape dispatch below.
      if (isBrunoFile(text)) {
        const r = parseBruno(text);
        if (r.items.length === 0) {
          showToast(t("import.empty"));
          return;
        }
        importItems(r.items, r.envVars, r.collectionName);
        showToast(
          t("import.success", {
            name: r.collectionName,
            folders: String(r.folderCount),
            requests: String(r.requestCount),
          })
        );
        if (r.warnings.length > 0) {
          showToast(t("import.warnings", { count: String(r.warnings.length) }));
          // eslint-disable-next-line no-console
          console.warn("Bruno import warnings:", r.warnings);
        }
        return;
      }
      // OpenAPI 3.x — JSON or YAML. Detected before the JSON-only
      // branches since a YAML spec won't survive a JSON.parse. The
      // importer (and its ~100 KB yaml parser) is dynamically imported
      // so it stays out of the main bundle.
      const oas = await import("../lib/importers/openapi");
      let specDoc: unknown = null;
      try {
        specDoc = oas.parseSpecText(text);
      } catch {
        // Not a parseable spec — fall through to the JSON dispatch.
      }
      if (oas.isOpenApiSpec(specDoc)) {
        const r = oas.parseOpenApi(text);
        if (r.items.length === 0) {
          showToast(t("import.empty"));
          return;
        }
        importItems(r.items, r.envVars, r.collectionName);
        showToast(
          t("import.success", {
            name: r.collectionName,
            folders: String(r.folderCount),
            requests: String(r.requestCount),
          })
        );
        if (r.warnings.length > 0) {
          showToast(t("import.warnings", { count: String(r.warnings.length) }));
          // eslint-disable-next-line no-console
          console.warn("OpenAPI import warnings:", r.warnings);
        }
        return;
      }
      // Format detection: peek the JSON shape and route to the right
      // parser. Postman v2 / Insomnia v4 / HAR all share .json, so
      // filename-based dispatch isn't enough.
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Leave parsed null — parsePostmanV2 will re-throw with its
        // own JSON-error message; preserves the existing UX.
      }
      if (isHarFile(parsed)) {
        const r = parseHar(text);
        if (r.items.length === 0) {
          showToast(t("import.empty"));
          return;
        }
        importHistory(r.items);
        // HAR populates History, so flip the sidebar tab so the user
        // sees their imported entries immediately.
        setUi({ sidebarTab: "history" });
        const summary = t("import.har.success", {
          creator: r.collectionName,
          count: String(r.requestCount),
        });
        showToast(summary);
        if (r.warnings.length > 0) {
          showToast(t("import.warnings", { count: String(r.warnings.length) }));
          // eslint-disable-next-line no-console
          console.warn("HAR import warnings:", r.warnings);
        }
        return;
      }
      const useInsomnia = isInsomniaExport(parsed);
      const result = useInsomnia ? parseInsomniaV4(text) : parsePostmanV2(text);
      const sourceLabel = useInsomnia ? "Insomnia" : "Postman";
      if (result.items.length === 0) {
        showToast(t("import.empty"));
        return;
      }
      importItems(result.items, result.envVars, result.collectionName);
      const summary = t("import.success", {
        name: result.collectionName,
        folders: String(result.folderCount),
        requests: String(result.requestCount),
      });
      showToast(summary);
      if (result.warnings.length > 0) {
        showToast(t("import.warnings", { count: String(result.warnings.length) }));
        // eslint-disable-next-line no-console
        console.warn(`${sourceLabel} import warnings:`, result.warnings);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(t("import.failed", { error: msg }));
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.bru,.yaml,.yml,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          // Reset so re-importing the same file re-fires onChange.
          e.target.value = "";
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="text-[11px] h-auto py-0.5 px-1.5"
        title={t("import.title")}
      >
        {t("import.button")}
      </Button>
    </>
  );
}

function OpenSpecButton() {
  const openSpecTab = useStore((s) => s.openSpecTab);
  const t = useT();
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".yaml,.yml,.json,application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            const text = await f.text();
            openSpecTab(text, f.name);
          }
          // Reset so re-opening the same file re-fires onChange.
          e.target.value = "";
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="text-[11px] h-auto py-0.5 px-1.5"
        title={t("spec.button.title")}
      >
        {t("spec.button")}
      </Button>
    </>
  );
}

function NewFolderButton() {
  const addFolder = useStore((s) => s.addFolder);
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        // WKWebView's default delegate ignores window.prompt() (no panel
        // implementation in zero-native), so the previous prompt-based
        // flow silently no-op'd. Add the folder with the default name
        // synchronously; the user can immediately rename via the inline
        // double-click handler in CollectionList's FolderRow.
        addFolder(null, t("collections.newFolderDefault"));
      }}
      className="text-[11px] h-auto py-0.5 px-1.5"
      title={t("collections.newFolderPrompt")}
    >
      {t("collections.newFolder")}
    </Button>
  );
}
