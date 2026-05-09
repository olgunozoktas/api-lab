import { useStore } from "../store";
import { CollectionList } from "./CollectionList";
import { HistoryList } from "./HistoryList";
import { useT } from "../lib/i18n/useT";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";

export function Sidebar() {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const resetCurrent = useStore((s) => s.resetCurrent);
  const t = useT();

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
          <SectionHeader>{t("sidebar.section.saved")}</SectionHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CollectionList />
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <HistoryList />
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
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (confirm(t("sidebar.confirmClearHistory"))) clearHistory();
      }}
      className="text-[11px] h-auto py-0.5 px-1.5"
    >
      {t("sidebar.clearHistory")}
    </Button>
  );
}
