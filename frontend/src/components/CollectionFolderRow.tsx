/** Olgun Özoktaş geliştirdi · API Lab */
// FolderRow — the folder leaf renderer used by CollectionList's
// TreeNode walker. Split out of CollectionRows.tsx (which had hit the
// 400-LOC cap once the "Run collection" entry landed). Carries its own
// right-click context menu: add request / sub-folder, run, rename,
// delete; supports drag-and-drop reparenting.

import { useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { useConfirm } from "../lib/dialogs";
import { cn } from "../lib/cn";
import {
  ChevronRight,
  Cable,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Network,
  Pencil,
  Play,
  Plug,
  Radio,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { CollectionItem } from "../lib/types";
import type { NewRequestKind } from "../store/collections";
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
  const addRequest = useStore((s) => s.addRequest);
  const loadCollection = useStore((s) => s.loadCollection);
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

  const onAddRequest = (kind: NewRequestKind = "http") => {
    const created = addRequest(item.id, t("collections.newRequestDefault"), kind);
    // Switch the active composer to the freshly-created request so
    // the user can start editing immediately.
    loadCollection(created);
    if (!expanded[item.id]) toggleFolder(item.id);
  };

  // Open the collection runner for this folder (App.tsx hosts the modal).
  const onRunCollection = () =>
    window.dispatchEvent(
      new CustomEvent("apilab:run-collection", { detail: { folderId: item.id } })
    );

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
          {item.integrationId && !renaming && (
            <Plug
              className="w-3 h-3 shrink-0 text-[var(--color-accent)]"
              aria-label={t("integrations.badge")}
            >
              <title>{t("integrations.badge")}</title>
            </Plug>
          )}
          <span className="text-3xs text-[var(--color-fg-muted)]">{childCount}</span>
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
        <ContextMenuItem onSelect={() => onAddRequest("http")}>
          <FilePlus className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.newRequest")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onAddRequest("graphql")}>
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.newGraphql")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onAddRequest("ws")}>
          <Cable className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.newWs")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onAddRequest("sse")}>
          <Radio className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.newSse")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onAddRequest("grpc")}>
          <Network className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.newGrpc")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onAddSubFolder}>
          <FolderPlus className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.newSubFolder")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onRunCollection}>
          <Play className="w-3.5 h-3.5" aria-hidden />
          {t("collections.context.runCollection")}
        </ContextMenuItem>
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
