/** Olgun Özoktaş geliştirdi · API Lab */
// RequestRow — the request leaf renderer used by CollectionList's
// TreeNode walker. Split out of CollectionRows.tsx (which had hit the
// 400-LOC cap). Carries its own right-click context menu: open /
// open-in-new-tab, copy URL / cURL, rename, delete.

import { useState } from "react";
import { useActiveVars, useStore } from "../store";
import { displayTabName, methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { useConfirm } from "../lib/dialogs";
import { cn } from "../lib/cn";
import { buildBody, buildHeadersList, buildUrl, effectiveContentType } from "../lib/sendRequest";
import { toCurl } from "../lib/codegen/curl";
import { Copy, Eye, ExternalLink, Pencil, Terminal, Trash2 } from "lucide-react";
import type { CollectionItem, CurrentRequest } from "../lib/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

export function RequestRow({ item, depth }: { item: CollectionItem; depth: number }) {
  const t = useT();
  const confirm = useConfirm();
  const currentId = useStore((s) => s.current.id);
  const loadCollection = useStore((s) => s.loadCollection);
  const loadCollectionInNewTab = useStore((s) => s.loadCollectionInNewTab);
  const deleteCollectionItem = useStore((s) => s.deleteCollectionItem);
  const renameCollectionItem = useStore((s) => s.renameCollectionItem);
  const showToast = useStore((s) => s.showToast);
  const vars = useActiveVars();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const isActive = item.id === currentId;
  const m = item.request?.method ?? "GET";

  const onCopyUrl = () => {
    const url = item.request?.url ?? "";
    navigator.clipboard
      .writeText(url)
      .then(() => showToast(t("history.context.urlCopied"), { severity: "success" }));
  };

  // Same builder pipeline CopyAsMenu / HistoryList.onCopyCurl use:
  // env-substituted URL, auth folded into headers, body skipped for
  // GET/HEAD, content-type set. RequestSnapshot is widened with the
  // two CurrentRequest fields buildUrl doesn't read.
  const onCopyCurl = () => {
    if (!item.request) return;
    const req = { ...item.request, id: null, name: "" } as CurrentRequest;
    const isGraphql = !!item.request.isGraphql;
    const url = buildUrl(req, vars);
    const method = isGraphql ? "POST" : item.request.method;
    const headers = buildHeadersList(req, vars);
    effectiveContentType(req, isGraphql, headers);
    const body =
      method === "GET" || method === "HEAD" ? null : (buildBody(req, isGraphql, vars) ?? null);
    const headersArr: { name: string; value: string }[] = [];
    headers.forEach((v, k) => headersArr.push({ name: k, value: v }));
    const code = toCurl({ method, url, headers: headersArr, body });
    navigator.clipboard
      .writeText(code)
      .then(() => showToast(t("history.context.curlCopied"), { severity: "success" }));
  };

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
            // Pre-fill the rename input with the displayed label so a
            // user editing a still-default item starts from the
            // auto-derived `METHOD shortUrl` they actually see, not
            // from "New request".
            setDraftName(
              displayTabName({ name: item.name, method: m, url: item.request?.url ?? "" })
            );
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
          <span className={"font-mono font-bold w-12 flex-shrink-0 text-3xs " + methodClass(m)}>
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
            <span
              className="flex-1 truncate"
              title={
                item.description ||
                item.name ||
                displayTabName({ name: "", method: m, url: item.request?.url ?? "" })
              }
            >
              {/* Mirrors the tab strip pattern: if the user hasn't
                  renamed yet (placeholder name) and a URL is set,
                  show a derived `METHOD shortUrl` label so a folder
                  with several "New request" siblings stays readable.
                  The stored name is unchanged — rename via double-
                  click wins as soon as the user opts in. */}
              {displayTabName({
                name: item.name,
                method: m,
                url: item.request?.url ?? "",
              }) || "—"}
            </span>
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
        <ContextMenuItem onSelect={onCopyUrl}>
          <Copy className="w-3.5 h-3.5" aria-hidden />
          {t("history.context.copyUrl")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onCopyCurl}>
          <Terminal className="w-3.5 h-3.5" aria-hidden />
          {t("history.context.copyCurl")}
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
