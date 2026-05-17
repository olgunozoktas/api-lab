/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CodeEditor } from "./ui/code-editor";
import { useT } from "../lib/i18n/useT";
import { parseCustomRuleset } from "../lib/spectralLint";

export type SpecRulesetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleset: string;
  onSave: (ruleset: string) => void;
};

// In-app custom-ruleset editor. The YAML layers a `rules` override map
// on the built-in `oas` ruleset — turn a rule off or re-grade its
// severity. Validated live with `parseCustomRuleset`; saved onto the
// spec tab so every subsequent lint pass picks it up.
export function SpecRulesetModal({ open, onOpenChange, ruleset, onSave }: SpecRulesetModalProps) {
  const t = useT();
  const [draft, setDraft] = useState(ruleset);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(ruleset);
      setError(null);
    }
  }, [open, ruleset]);

  const onChange = (text: string) => {
    setDraft(text);
    try {
      parseCustomRuleset(text);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const save = () => {
    if (error) return;
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[90vw] h-[72vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base">{t("spec.lint.ruleset.title")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 shrink-0 text-[11px] text-[var(--color-fg-muted)] leading-relaxed border-b border-[var(--color-border)]">
          {t("spec.lint.ruleset.hint")}
        </div>

        <div className="flex-1 min-h-0 p-3">
          <CodeEditor
            value={draft}
            onChange={onChange}
            language="yaml"
            placeholder={"rules:\n  operation-description: off\n  oas3-api-servers: warn"}
            className="h-full"
          />
        </div>

        <div className="px-5 py-3 shrink-0 border-t border-[var(--color-border)] flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={!!error}>
            {t("spec.lint.ruleset.save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          {error && (
            <span className="text-[11px] text-[var(--color-danger)] truncate">{error}</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
