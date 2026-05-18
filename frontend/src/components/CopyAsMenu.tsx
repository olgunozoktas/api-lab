/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useRef, useState } from "react";
import { useStore, useActiveVars } from "../store";
import { useT } from "../lib/i18n/useT";
import { formatters, type CodegenLang, type CodegenInput } from "../lib/codegen";
import { buildHeadersList, buildUrl, buildBody, effectiveContentType } from "../lib/sendRequest";
import { Button } from "./ui/button";
import { cn } from "../lib/cn";
import { FileCode2, ChevronDown, Check } from "lucide-react";

// Presenter — pure props in / actions in.
export type CopyAsMenuProps = {
  buttonLabel: string;
  buttonTitle?: string;
  onSelect: (lang: CodegenLang, label: string) => void;
  className?: string;
};

export function CopyAsMenu({ buttonLabel, buttonTitle, onSelect, className }: CopyAsMenuProps) {
  const [open, setOpen] = useState(false);
  const [lastCopied, setLastCopied] = useState<CodegenLang | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: CodegenLang, label: string) => {
    onSelect(id, label);
    setLastCopied(id);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative inline-block", className)}>
      <Button
        variant="ghost"
        size="sm"
        title={buttonTitle}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <FileCode2 className="w-3 h-3" />
        {buttonLabel}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-lg py-1"
        >
          {formatters.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              type="button"
              onClick={() => pick(f.id, f.label)}
              className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] flex items-center justify-between gap-3"
            >
              <span>{f.label}</span>
              {lastCopied === f.id && (
                <Check className="w-3 h-3 text-[var(--color-success)]" aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Container — wires the store + clipboard.
export function CopyAsMenuContainer() {
  const current = useStore((s) => s.current);
  const isGraphql = useStore((s) => s.ui.composerTab === "graphql");
  const showToast = useStore((s) => s.showToast);
  const vars = useActiveVars();
  const t = useT();

  const buildInput = (): CodegenInput => {
    const url = buildUrl(current, vars);
    const method = isGraphql ? "POST" : current.method;
    const headers = buildHeadersList(current, vars);
    effectiveContentType(current, isGraphql, headers);
    const body =
      method === "GET" || method === "HEAD" ? null : (buildBody(current, isGraphql, vars) ?? null);
    const headersArr: { name: string; value: string }[] = [];
    headers.forEach((v, k) => headersArr.push({ name: k, value: v }));
    return { method, url, headers: headersArr, body };
  };

  const onSelect = (lang: CodegenLang, label: string) => {
    const input = buildInput();
    const formatter = formatters.find((f) => f.id === lang);
    if (!formatter) return;
    const code = formatter.format(input);
    navigator.clipboard
      .writeText(code)
      .then(() => showToast(t("response.codeCopied", { lang: label }), { severity: "success" }));
  };

  return (
    <CopyAsMenu
      buttonLabel={t("response.copyAs")}
      buttonTitle={t("response.copyAs.title")}
      onSelect={onSelect}
    />
  );
}
