import { useStore } from "../store";
import { methodClass } from "../lib/utils";

export function CollectionList() {
  const collections = useStore((s) => s.collections);
  const currentId = useStore((s) => s.current.id);
  const loadCollection = useStore((s) => s.loadCollection);
  const deleteCollection = useStore((s) => s.deleteCollection);

  if (collections.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-3">
          Henüz kayıtlı istek yok
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-1.5 pb-3">
      {collections.map((c) => {
        const isActive = c.id === currentId;
        const m = c.request?.method ?? "GET";
        return (
          <div
            key={c.id}
            onClick={() => loadCollection(c)}
            className={
              "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs " +
              (isActive
                ? "bg-blue-500/15"
                : "hover:bg-[var(--color-bg-elev-2)]")
            }
          >
            <span className={"font-mono font-bold w-9 flex-shrink-0 text-[10px] " + methodClass(m)}>
              {m}
            </span>
            <span className="flex-1 truncate">{c.name || "(adsız)"}</span>
            <button
              aria-label="Sil"
              onClick={(e) => { e.stopPropagation(); if (confirm("Silinsin mi?")) deleteCollection(c.id); }}
              className="opacity-0 group-hover:opacity-100 px-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-danger)] hover:text-white rounded"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
