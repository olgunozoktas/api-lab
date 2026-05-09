import { useStore } from "../store";
import { CollectionList } from "./CollectionList";
import { HistoryList } from "./HistoryList";

export function Sidebar() {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const resetCurrent = useStore((s) => s.resetCurrent);

  return (
    <aside className="bg-[var(--color-bg-elev)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
      <div className="flex border-b border-[var(--color-border)] p-1 gap-0.5">
        {(["collections", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setUi({ sidebarTab: tab })}
            className={
              "flex-1 px-1 py-1.5 rounded-[5px] text-[11px] font-medium " +
              (ui.sidebarTab === tab
                ? "bg-[var(--color-bg-elev-2)] text-[var(--color-fg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
            }
          >
            {tab === "collections" ? "Koleksiyon" : "Geçmiş"}
          </button>
        ))}
      </div>
      {ui.sidebarTab === "collections" ? (
        <>
          <SectionHeader>Saved</SectionHeader>
          <CollectionList />
          <div className="px-2 pb-2">
            <button
              onClick={resetCurrent}
              className="w-full text-xs py-1.5 rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              + Yeni İstek
            </button>
          </div>
        </>
      ) : (
        <>
          <SectionHeader rightSlot={<ClearHistoryButton />}>Son istekler</SectionHeader>
          <HistoryList />
        </>
      )}
    </aside>
  );
}

function SectionHeader({ children, rightSlot }: { children: React.ReactNode; rightSlot?: React.ReactNode }) {
  return (
    <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
      <span>{children}</span>
      {rightSlot}
    </div>
  );
}

function ClearHistoryButton() {
  const clearHistory = useStore((s) => s.clearHistory);
  return (
    <button
      onClick={() => { if (confirm("Geçmiş silinsin mi?")) clearHistory(); }}
      className="text-[11px] px-1.5 py-0.5 rounded text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]"
    >
      Temizle
    </button>
  );
}
