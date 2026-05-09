import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Variable } from "lucide-react";

// Reads the current text selection from the document. Trims whitespace,
// caps the value at 4 KB so a stray ⌘+A in the response viewer doesn't
// blow up the dialog. Returns "" when nothing usable is selected.
export function readSelectionText(maxBytes = 4096): string {
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  if (!sel || sel.isCollapsed) return "";
  const text = sel.toString().trim();
  if (text.length === 0 || text.length > maxBytes) return "";
  return text;
}

// Naive name suggester from the selection text. JWT-shaped → "token";
// uuid-shaped → "id"; pure number → "id"; trailing-key style ("foo": "bar"
// → "foo"); otherwise empty (let the user type a name). Pure / unit-tested.
export function suggestVariableName(value: string): string {
  const v = value.trim();
  if (v.length === 0) return "";
  // JWT: three base64url parts separated by dots, starts with eyJ (which
  // is the base64 of `{"`)
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v)) return "token";
  // UUID v4-ish
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return "id";
  // Pure number
  if (/^-?\d+(\.\d+)?$/.test(v)) return "id";
  return "";
}

// Capture the entry-point: when the user right-clicks inside the wrapped
// children with a non-empty text selection, the "Save as variable..."
// menu item becomes enabled. Click → captures the current selection
// snapshot (selection clears when ContextMenu opens), opens the dialog.
//
// Wraps the response viewer body in ResponseBody.tsx — wherever JSON or
// raw text is shown, this enables the right-click affordance.
export function SaveAsVariableMenu({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState("");
  // Refresh the disabled-state on every contextmenu open so the menu
  // item reflects whether there's currently a selection. Stored in
  // local state because Radix opens the menu BEFORE rendering items.
  const [hasSel, setHasSel] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          asChild
          // Capture the selection right before Radix opens the menu;
          // by the time onSelect on the item fires, the contextmenu
          // event has already cleared the selection on some platforms.
          onContextMenu={() => {
            const text = readSelectionText();
            setPendingValue(text);
            setHasSel(text.length > 0);
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={!hasSel}
            onSelect={() => {
              if (pendingValue.length > 0) setOpen(true);
            }}
          >
            <Variable className="w-3.5 h-3.5" aria-hidden />
            {t("chain.saveAs")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <SaveAsVariableDialog open={open} onOpenChange={setOpen} initialValue={pendingValue} />
    </>
  );
}

function SaveAsVariableDialog({
  open,
  onOpenChange,
  initialValue,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  initialValue: string;
}) {
  const t = useT();
  const envs = useStore((s) => s.envs);
  const activeEnv = useStore((s) => s.activeEnv);
  const setEnvs = useStore((s) => s.setEnvs);
  const showToast = useStore((s) => s.showToast);

  const [name, setName] = useState("");
  const [targetEnvId, setTargetEnvId] = useState("");

  // Re-prime fields whenever the dialog opens — initialValue and the
  // selection-driven name suggestion change per right-click. Effect-driven
  // (NOT render-phase setState) so React's reconciler never sees mid-render
  // mutations of state that depend on store reads (envs, activeEnv) — that
  // pattern triggered React #185 on first dialog open.
  useEffect(() => {
    if (!open) return;
    if (envs.length > 0) {
      setTargetEnvId((curr) => curr || activeEnv || envs[0].id);
    }
    const suggested = suggestVariableName(initialValue);
    if (suggested) {
      setName((curr) => curr || suggested);
    }
    // The dependency list intentionally excludes envs / activeEnv:
    // we only want to re-prime when the dialog OPENS or the user
    // right-clicks a NEW selection. Subsequent env mutations during
    // an open dialog shouldn't reset the user's typed name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue]);

  const reset = () => {
    setName("");
    setTargetEnvId("");
  };

  const onSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !targetEnvId) return;
    const next = envs.map((e) =>
      e.id === targetEnvId ? { ...e, vars: { ...e.vars, [trimmedName]: initialValue } } : e
    );
    setEnvs(next);
    const envName = envs.find((e) => e.id === targetEnvId)?.name ?? "?";
    showToast(t("chain.savedToast", { name: trimmedName, env: envName }));
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chain.dialog.title")}</DialogTitle>
          <DialogDescription>{t("chain.dialog.hint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-xs space-y-1">
            <span className="text-[var(--color-fg-muted)]">{t("chain.value.label")}</span>
            <pre
              className="m-0 px-2 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded font-mono text-[11px] whitespace-pre-wrap break-all max-h-32 overflow-y-auto"
              aria-readonly
            >
              {initialValue}
            </pre>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-[var(--color-fg-muted)]">{t("chain.varName.label")}</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("chain.varName.placeholder")}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
              }}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-[var(--color-fg-muted)]">{t("chain.env.label")}</span>
            {envs.length === 0 ? (
              <p className="text-[var(--color-warning)] text-[11px]">{t("chain.env.empty")}</p>
            ) : (
              <Select value={targetEnvId} onValueChange={setTargetEnvId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {envs.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onSave}
            disabled={name.trim().length === 0 || !targetEnvId || envs.length === 0}
          >
            {t("chain.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
