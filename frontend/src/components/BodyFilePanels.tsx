/** Olgun Özoktaş geliştirdi · API Lab */
// File-backed body editors: the multipart/form-data field table and
// the raw-binary single-file picker. Both are presenters — value in,
// onChange out. They call `pickFiles` (a lib helper around the native
// dialog bridge), never the store.
import { File, Paperclip, Trash2, Type, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { useT } from "../lib/i18n/useT";
import { basename, contentTypeForPath, pickFiles } from "../lib/fileBody";
import { emptyMultipartField, type MultipartField } from "../lib/types";

const inputCls =
  "bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded " +
  "px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)] " +
  "text-[var(--color-fg)] min-w-0";

// ── multipart/form-data field table ─────────────────────────────────

export type BodyMultipartProps = {
  parts: MultipartField[];
  onChange: (parts: MultipartField[]) => void;
};

export function BodyMultipart({ parts, onChange }: BodyMultipartProps) {
  const t = useT();
  const rows = parts.length > 0 ? parts : [emptyMultipartField()];

  const update = (i: number, patch: Partial<MultipartField>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, emptyMultipartField()]);

  const toggleKind = (i: number) => update(i, { kind: rows[i].kind === "file" ? "text" : "file" });

  const chooseFile = async (i: number) => {
    const picked = await pickFiles(false);
    if (picked.length > 0) {
      update(i, { filePath: picked[0], fileName: basename(picked[0]) });
    }
  };

  return (
    <>
      <div>
        {rows.map((r, i) => {
          const kindLabel =
            r.kind === "file" ? t("body.multipart.toggleText") : t("body.multipart.toggleFile");
          return (
            <div
              key={i}
              className="grid gap-1.5 mb-1 items-center"
              style={{ gridTemplateColumns: "24px 1fr 28px 1fr 28px" }}
            >
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => update(i, { enabled: e.target.checked })}
                className="accent-[var(--color-accent)]"
                aria-label={t("kv.enabled")}
              />
              <input
                type="text"
                placeholder={t("body.multipart.fieldName")}
                value={r.k}
                onChange={(e) => update(i, { k: e.target.value })}
                className={inputCls}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleKind(i)}
                aria-label={kindLabel}
                title={kindLabel}
              >
                {r.kind === "file" ? (
                  <Paperclip className="w-3.5 h-3.5" />
                ) : (
                  <Type className="w-3.5 h-3.5" />
                )}
              </Button>
              {r.kind === "file" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start overflow-hidden"
                  onClick={() => chooseFile(i)}
                  title={r.filePath || t("body.multipart.pickFile")}
                >
                  <File className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{r.fileName || t("body.multipart.pickFile")}</span>
                </Button>
              ) : (
                <input
                  type="text"
                  placeholder={t("body.multipart.textValue")}
                  value={r.v}
                  onChange={(e) => update(i, { v: e.target.value })}
                  className={inputCls}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                aria-label={t("kv.delete")}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>
      <Button variant="dashed" size="md" className="w-full mt-1" onClick={add}>
        {t("body.multipart.addField")}
      </Button>
    </>
  );
}

// ── raw-binary single-file picker ───────────────────────────────────

export type BodyBinaryProps = {
  filePath: string;
  fileName: string;
  onChange: (filePath: string, fileName: string) => void;
};

export function BodyBinary({ filePath, fileName, onChange }: BodyBinaryProps) {
  const t = useT();

  const choose = async () => {
    const picked = await pickFiles(false);
    if (picked.length > 0) onChange(picked[0], basename(picked[0]));
  };

  if (!filePath) {
    return (
      <Button variant="dashed" size="lg" className="w-full" onClick={choose}>
        <Upload className="w-4 h-4" />
        {t("body.binary.pickFile")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 border border-[var(--color-border)] rounded-md px-3 py-2.5">
      <File className="w-4 h-4 flex-shrink-0 text-[var(--color-fg-muted)]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{fileName}</p>
        <p className="text-[11px] font-mono text-[var(--color-fg-muted)]">
          {contentTypeForPath(filePath)}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={choose}>
        {t("body.binary.pickFile")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange("", "")}
        aria-label={t("body.binary.clear")}
        title={t("body.binary.clear")}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
