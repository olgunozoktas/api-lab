// FolderRow + RequestRow — the leaf renderers used by CollectionList's
// TreeNode walker. Split out of CollectionList.tsx to stay under the
// 400-LOC cap (CLAUDE.md hard rule). Each row carries its own context
// menu (right-click) with rename / delete / sub-folder / open-in-new-tab.

import { useState } from "react";
import { useStore } from "../store";
import { methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { useConfirm } from "../lib/dialogs";
import { cn } from "../lib/cn";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";
import type { CollectionItem } from "../lib/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

export function FolderRow({
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
  const addFolder = useStore((s) => s.addFolder);
  const expanded = useStore((s) => s.collectionsExpanded);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [dragOver, setDragOver] = useState(false);

  const onConfirmDelete = async () => {
    const ok = await confirm({
      title: t("collections.confirmDeleteFolder", { name: item.name }),
      confirmLabel: t("kv.delete"),
      cancelLabel: t("dialog.cancel"),
      danger: true,
    });
    if (ok) deleteCollectionItem(item.id);
  };

  const onAddSubFolder = () => {
    addFolder(item.id, t("collections.newFolderDefault"));
    if (!expanded[item.id]) toggleFolder(item.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-xs",
            "hover:bg-[var(--color-bg-elev-2)]",
            dragOver && "bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]"
          )}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={(e) => {
            // Skip toggle when this click is a context-menu trigger
            // (macOS Control+click synthesizes a click; some trackpads
            // emit click before contextmenu). Without this, the first
            // right-click expanded/collapsed the folder before the menu
            // opened — second right-click was needed to actually see it.
            if (e.ctrlKey || e.button !== 0) return;
            toggleFolder(item.id);
          }}
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
              await onConfirmDelete();
            }}
            className="opacity-0 group-hover:opacity-100 px-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-danger)] hover:text-white rounded"
          >
            ✕
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onAddSubFolder}>
          <FolderPlus className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.newSubFolder")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setRenaming(true)}>
          <Pencil className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.rename")}
        </ContextMenuItem>
        <ContextMenuItem danger onSelect={onConfirmDelete}>
          <Trash2 className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function RequestRow({ item, depth }: { item: CollectionItem; depth: number }) {
  const t = useT();
  const confirm = useConfirm();
  const currentId = useStore((s) => s.current.id);
  const loadCollection = useStore((s) => s.loadCollection);
  const loadCollectionInNewTab = useStore((s) => s.loadCollectionInNewTab);
  const deleteCollectionItem = useStore((s) => s.deleteCollectionItem);
  const renameCollectionItem = useStore((s) => s.renameCollectionItem);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const isActive = item.id === currentId;
  const m = item.request?.method ?? "GET";

  const onConfirmDelete = async () => {
    const ok = await confirm({
      title: t("kv.confirmDelete"),
      confirmLabel: t("kv.delete"),
      cancelLabel: t("dialog.cancel"),
      danger: true,
    });
    if (ok) deleteCollectionItem(item.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={(e) => {
            // Skip load on macOS Control+click (context menu modifier).
            if (e.ctrlKey || e.button !== 0) return;
            loadCollection(item);
          }}
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
              await onConfirmDelete();
            }}
            className="opacity-0 group-hover:opacity-100 px-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-danger)] hover:text-white rounded"
          >
            ✕
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => loadCollection(item)}>
          <Eye className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.open")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => loadCollectionInNewTab(item)}>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.openInNewTab")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setRenaming(true)}>
          <Pencil className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.rename")}
        </ContextMenuItem>
        <ContextMenuItem danger onSelect={onConfirmDelete}>
          <Trash2 className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
