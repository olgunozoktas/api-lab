import { useMemo, useState } from "react";
import { useStore } from "../store";
import { methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { useConfirm } from "../lib/dialogs";
import { cn } from "../lib/cn";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import type { CollectionItem } from "../lib/types";

// CollectionList — tree-shaped sidebar list with folders + requests.
// Folders expand/collapse via the chevron; clicking a request loads it
// into the active tab. Right-side X (hover) deletes the item (recursive
// for folders, with confirm). HTML5 native drag-and-drop supports moving
// items into folders; dropping on the empty area moves to the root.

export function CollectionList() {
  const items = useStore((s) => s.collectionItems);
  const expanded = useStore((s) => s.collectionsExpanded);
  const t = useT();

  // Build the per-parent index once per render so the tree walker can
  // do O(1) lookups without re-filtering at every level.
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, CollectionItem[]>();
    for (const it of items) {
      const arr = map.get(it.parentId) ?? [];
      arr.push(it);
      map.set(it.parentId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order);
    return map;
  }, [items]);

  const roots = childrenOf.get(null) ?? [];

  if (items.length === 0) {
    return (
      <div className="px-1.5 pb-3">
        <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-3">
          {t("sidebar.empty.collections")}
        </div>
      </div>
    );
  }

  return (
    <div className="px-1.5 pb-3">
      {roots.map((it) => (
        <TreeNode key={it.id} item={it} depth={0} childrenOf={childrenOf} expanded={expanded} />
      ))}
      <RootDropZone />
    </div>
  );
}

type TreeNodeProps = {
  item: CollectionItem;
  depth: number;
  childrenOf: Map<string | null, CollectionItem[]>;
  expanded: Record<string, boolean>;
};

function TreeNode({
  item,
  depth,
  childrenOf,
  expanded,
  ancestors,
}: TreeNodeProps & { ancestors?: ReadonlySet<string> }) {
  // Cycle guard. If a corrupted store somehow contains a self-referential
  // parentId chain (item.id === item.parentId, or A→B→A), refuse to recurse.
  // Without this, the tree walker would stack-overflow before any UI lands —
  // which is what surfaced the white-screen-of-death on 2026-05-09. Render
  // a tiny inline error instead so the user sees what happened and can
  // delete the offender.
  if (ancestors?.has(item.id)) {
    return (
      <div
        className="text-[10px] text-[var(--color-danger)] px-2 py-1"
        style={{ paddingLeft: 8 + depth * 12 }}
        title={`parentId chain loops on ${item.id}`}
      >
        ⚠ cycle detected — {item.name || item.id}
      </div>
    );
  }
  // Defensive cap. 32 levels is well past any sane folder depth.
  if (depth > 32) {
    return (
      <div
        className="text-[10px] text-[var(--color-warning)] px-2 py-1"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        ⚠ folder depth &gt; 32 — render aborted
      </div>
    );
  }

  const nextAncestors = new Set(ancestors ?? []);
  nextAncestors.add(item.id);

  if (item.kind === "folder") {
    const kids = childrenOf.get(item.id) ?? [];
    const open = !!expanded[item.id];
    return (
      <>
        <FolderRow item={item} depth={depth} open={open} childCount={kids.length} />
        {open &&
          kids.map((k) => (
            <TreeNode
              key={k.id}
              item={k}
              depth={depth + 1}
              childrenOf={childrenOf}
              expanded={expanded}
              ancestors={nextAncestors}
            />
          ))}
      </>
    );
  }
  return <RequestRow item={item} depth={depth} />;
}

function FolderRow({
  item,
  depth,
  open,
  childCount,
}: {
  item: CollectionItem;
  depth: number;
  open: boolean;
  childCount: number;
}) {
  const t = useT();
  const confirm = useConfirm();
  const toggleFolder = useStore((s) => s.toggleFolder);
  const deleteCollectionItem = useStore((s) => s.deleteCollectionItem);
  const renameCollectionItem = useStore((s) => s.renameCollectionItem);
  const moveCollectionItem = useStore((s) => s.moveCollectionItem);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-xs",
        "hover:bg-[var(--color-bg-elev-2)]",
        dragOver && "bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]"
      )}
      style={{ paddingLeft: 8 + depth * 12 }}
      onClick={() => toggleFolder(item.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setRenaming(true);
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-collection-id", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-collection-id")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("application/x-collection-id");
        if (id && id !== item.id) moveCollectionItem(id, item.id);
      }}
    >
      <ChevronRight
        className={cn(
          "w-3 h-3 transition-transform shrink-0 text-[var(--color-fg-muted)]",
          open && "rotate-90"
        )}
        aria-hidden
      />
      {open ? (
        <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[var(--color-fg-muted)]" aria-hidden />
      ) : (
        <Folder className="w-3.5 h-3.5 shrink-0 text-[var(--color-fg-muted)]" aria-hidden />
      )}
      {renaming ? (
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            renameCollectionItem(item.id, draftName);
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              renameCollectionItem(item.id, draftName);
              setRenaming(false);
            } else if (e.key === "Escape") {
              setDraftName(item.name);
              setRenaming(false);
            }
          }}
          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 text-xs"
        />
      ) : (
        <span className="flex-1 truncate font-medium">{item.name}</span>
      )}
      <span className="text-[10px] text-[var(--color-fg-muted)]">{childCount}</span>
      <button
        aria-label={t("kv.delete")}
        onClick={async (e) => {
          e.stopPropagation();
          const ok = await confirm({
            title: t("collections.confirmDeleteFolder", { name: item.name }),
            confirmLabel: t("kv.delete"),
            cancelLabel: t("dialog.cancel"),
            danger: true,
          });
          if (ok) deleteCollectionItem(item.id);
        }}
        className="opacity-0 group-hover:opacity-100 px-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-danger)] hover:text-white rounded"
      >
        ✕
      </button>
    </div>
  );
}

function RequestRow({ item, depth }: { item: CollectionItem; depth: number }) {
  const t = useT();
  const confirm = useConfirm();
  const currentId = useStore((s) => s.current.id);
  const loadCollection = useStore((s) => s.loadCollection);
  const deleteCollectionItem = useStore((s) => s.deleteCollectionItem);
  const renameCollectionItem = useStore((s) => s.renameCollectionItem);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const isActive = item.id === currentId;
  const m = item.request?.method ?? "GET";

  return (
    <div
      onClick={() => loadCollection(item)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setRenaming(true);
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-collection-id", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group flex items-center gap-2 py-1.5 rounded-md cursor-pointer text-xs",
        isActive ? "bg-[var(--color-accent)]/15" : "hover:bg-[var(--color-bg-elev-2)]"
      )}
      style={{ paddingLeft: 8 + depth * 12, paddingRight: 8 }}
    >
      <span className={"font-mono font-bold w-9 flex-shrink-0 text-[10px] " + methodClass(m)}>
        {m}
      </span>
      {renaming ? (
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            renameCollectionItem(item.id, draftName);
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              renameCollectionItem(item.id, draftName);
              setRenaming(false);
            } else if (e.key === "Escape") {
              setDraftName(item.name);
              setRenaming(false);
            }
          }}
          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 text-xs"
        />
      ) : (
        <span className="flex-1 truncate">{item.name || "—"}</span>
      )}
      <button
        aria-label={t("kv.delete")}
        onClick={async (e) => {
          e.stopPropagation();
          const ok = await confirm({
            title: t("kv.confirmDelete"),
            confirmLabel: t("kv.delete"),
            cancelLabel: t("dialog.cancel"),
            danger: true,
          });
          if (ok) deleteCollectionItem(item.id);
        }}
        className="opacity-0 group-hover:opacity-100 px-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-danger)] hover:text-white rounded"
      >
        ✕
      </button>
    </div>
  );
}

// Drop zone at the bottom of the tree — drops here move the item to root.
function RootDropZone() {
  const moveCollectionItem = useStore((s) => s.moveCollectionItem);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-collection-id")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("application/x-collection-id");
        if (id) moveCollectionItem(id, null);
      }}
      className={cn(
        "min-h-[24px] mt-1 rounded-md border border-dashed",
        dragOver ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : "border-transparent"
      )}
    />
  );
}
