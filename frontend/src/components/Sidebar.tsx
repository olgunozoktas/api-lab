import { useRef, useState } from "react";
import { useStore } from "../store";
import { CollectionList } from "./CollectionList";
import { HistoryList } from "./HistoryList";
import { useT } from "../lib/i18n/useT";
import { useConfirm } from "../lib/dialogs";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { SearchInput } from "./ui/search-input";
import { parsePostmanV2 } from "../lib/importers/postmanV2";

export function Sidebar() {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const resetCurrent = useStore((s) => s.resetCurrent);
  const t = useT();
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
          <SectionHeader
            rightSlot={
              <div className="flex gap-1">
                <ImportPostmanButton />
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
            <Button variant="dashed" size="md" className="w-full" onClick={resetCurrent}>
              {t("sidebar.newRequest")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <SectionHeader rightSlot={<ClearHistoryButton />}>
            {t("sidebar.section.recent")}
          </SectionHeader>
          <SearchInput
            query={historyQuery}
            onChange={setHistoryQuery}
            placeholderKey="history.search.placeholder"
          />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <HistoryList query={historyQuery} />
          </div>
        </>
      )}
    </aside>
  );
}

function SectionHeader({
  children,
  rightSlot,
}: {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
      <span>{children}</span>
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
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = parsePostmanV2(text);
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
        // Surface the first warning as a follow-up toast — the rest
        // are visible in console for power users.
        showToast(t("import.warnings", { count: String(result.warnings.length) }));
        // eslint-disable-next-line no-console
        console.warn("Postman import warnings:", result.warnings);
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
        accept=".json,application/json"
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
