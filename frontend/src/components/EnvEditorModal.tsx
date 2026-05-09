import { useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { uid } from "../lib/utils";
import type { Environment } from "../lib/types";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export function EnvEditorModal({ open, onOpenChange }: Props) {
  const initialEnvs = useStore((s) => s.envs);
  const setEnvs = useStore((s) => s.setEnvs);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const [envs, setLocal] = useState<Environment[]>(() => JSON.parse(JSON.stringify(initialEnvs)));

  const update = (id: string, patch: Partial<Environment>) => {
    setLocal((ls) => ls.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };
  const remove = (id: string) => {
    if (envs.length <= 1) { showToast(t("env.minRequired")); return; }
    setLocal((ls) => ls.filter((e) => e.id !== id));
  };
  const add = () => setLocal((ls) => [...ls, { id: uid(), name: "new", vars: {} }]);
  const save = () => { setEnvs(envs); showToast(t("env.saved")); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("env.modal.title")}</DialogTitle>
        </DialogHeader>
        {envs.map((e) => <EnvRow key={e.id} env={e} onUpdate={update} onRemove={remove} />)}
        <Button variant="dashed" size="md" className="w-full" onClick={add}>
          {t("kv.addEnv")}
        </Button>
        <DialogFooter>
          <Button variant="primary" onClick={save}>{t("composer.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type RowProps = {
  env: Environment;
  onUpdate: (id: string, patch: Partial<Environment>) => void;
  onRemove: (id: string) => void;
};

function EnvRow({ env, onUpdate, onRemove }: RowProps) {
  const t = useT();
  const text = Object.entries(env.vars).map(([k, v]) => `${k}=${v}`).join("\n");

  const onText = (val: string) => {
    const next: Record<string, string> = {};
    val.split("\n").forEach((line) => {
      const eq = line.indexOf("=");
      if (eq > 0) {
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1);
        if (k) next[k] = v;
      }
    });
    onUpdate(env.id, { vars: next });
  };

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-2.5 mb-2.5">
      <div className="flex gap-2 items-center mb-1.5">
        <input
          type="text"
          value={env.name}
          placeholder={t("env.namePlaceholder")}
          onChange={(e) => onUpdate(env.id, { name: e.target.value })}
          className={
            "flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded " +
            "px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
          }
        />
        <Button variant="ghost" size="icon" onClick={() => onRemove(env.id)} aria-label={t("env.deleteEnv")}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={t("env.placeholderText")}
        spellCheck={false}
        className={
          "w-full min-h-[90px] resize-y bg-[var(--color-bg)] border border-[var(--color-border)] " +
          "rounded px-2 py-1 font-mono text-xs leading-6 outline-none " +
          "focus:border-[var(--color-accent)]"
        }
      />
    </div>
  );
}
