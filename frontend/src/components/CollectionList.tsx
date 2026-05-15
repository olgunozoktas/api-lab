/** Olgun Özoktaş geliştirdi · API Lab */
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { cn } from "../lib/cn";
import type { CollectionItem } from "../lib/types";
import { FolderRow, RequestRow } from "./CollectionRows";
import { SamplesRestoreCta } from "./SamplesList";

// CollectionList — tree-shaped sidebar list with folders + requests.
// Folders expand/collapse via the chevron; clicking a request loads it
// into the active tab. Right-click any row → context menu with rename /
// delete / sub-folder / open-in-new-tab. HTML5 native drag-and-drop
// supports moving items into folders; dropping on the empty area below
// moves to the root.

export function CollectionList({ query = "" }: { query?: string }) {
  const items = useStore((s) => s.collectionItems);
  const expanded = useStore((s) => s.collectionsExpanded);
  const t = useT();
  const trimmedQuery = query.trim();
  const filtering = trimmedQuery.length > 0;

  // When filtering, build the visible-id set: every item whose name matches
  // PLUS every ancestor folder of a match (so the tree stays coherent —
  // a request match without its parent would orphan visually). Also force
  // every visible folder open during the filter so users see hits.
  const { childrenOf, forcedOpen, hasMatches } = useMemo(() => {
    const byParent = new Map<string | null, CollectionItem[]>();
    const byId = new Map<string, CollectionItem>();
    for (const it of items) {
      byId.set(it.id, it);
      const arr = byParent.get(it.parentId) ?? [];
      arr.push(it);
      byParent.set(it.parentId, arr);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.order - b.order);

    if (!filtering) {
      return {
        childrenOf: byParent,
        forcedOpen: null as Record<string, boolean> | null,
        hasMatches: items.length > 0,
      };
    }

    const q = trimmedQuery.toLowerCase();
    const visible = new Set<string>();
    for (const it of items) {
      if ((it.name ?? "").toLowerCase().includes(q)) {
        visible.add(it.id);
        // walk up ancestors so the tree path renders
        let p = it.parentId;
        while (p) {
          if (visible.has(p)) break;
          visible.add(p);
          p = byId.get(p)?.parentId ?? null;
        }
      }
    }

    const filteredByParent = new Map<string | null, CollectionItem[]>();
    for (const it of items) {
      if (!visible.has(it.id)) continue;
      const arr = filteredByParent.get(it.parentId) ?? [];
      arr.push(it);
      filteredByParent.set(it.parentId, arr);
    }
    for (const arr of filteredByParent.values()) arr.sort((a, b) => a.order - b.order);

    const open: Record<string, boolean> = {};
    for (const id of visible) {
      const it = byId.get(id);
      if (it?.kind === "folder") open[id] = true;
    }

    return { childrenOf: filteredByParent, forcedOpen: open, hasMatches: visible.size > 0 };
  }, [items, filtering, trimmedQuery]);

  const effectiveExpanded = forcedOpen ?? expanded;
  const roots = childrenOf.get(null) ?? [];

  if (items.length === 0) {
    return (
      <div className="px-3 py-4 text-[11px] text-[var(--color-fg-muted)] leading-relaxed space-y-3">
        <p className="text-[var(--color-fg)] font-medium text-xs">
          {t("sidebar.empty.collections")}
        </p>
        <p>{t("sidebar.empty.collections.intro")}</p>
        <ul className="space-y-1.5 list-disc pl-4">
          <li>{t("sidebar.empty.collections.tip1")}</li>
          <li>{t("sidebar.empty.collections.tip2")}</li>
          <li>{t("sidebar.empty.collections.tip3")}</li>
        </ul>
        <SamplesRestoreCta />
      </div>
    );
  }

  if (filtering && !hasMatches) {
    return (
      <div className="px-1.5 pb-3">
        <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-3">
          {t("collections.search.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="px-1.5 pb-3">
      {roots.map((it) => (
        <TreeNode
          key={it.id}
          item={it}
          depth={0}
          childrenOf={childrenOf}
          expanded={effectiveExpanded}
        />
      ))}
      {!filtering && <RootDropZone />}
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
