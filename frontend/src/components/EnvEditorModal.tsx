import { useState } from "react";
import { useStore } from "../store";
import { uid } from "../lib/utils";
import type { Environment } from "../lib/types";

type Props = { onClose: () => void };

export function EnvEditorModal({ onClose }: Props) {
  const initialEnvs = useStore((s) => s.envs);
  const setEnvs = useStore((s) => s.setEnvs);
  const showToast = useStore((s) => s.showToast);
  const [envs, setLocal] = useState<Environment[]>(() => JSON.parse(JSON.stringify(initialEnvs)));

  const update = (id: string, patch: Partial<Environment>) => {
    setLocal((ls) => ls.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };
  const remove = (id: string) => {
    setLocal((ls) => (ls.length > 1 ? ls.filter((e) => e.id !== id) : ls));
    if (envs.length <= 1) showToast("En az 1 environment olmalı");
  };
  const add = () => setLocal((ls) => [...ls, { id: uid(), name: "yeni", vars: {} }]);
  const save = () => { setEnvs(envs); showToast("Environments kaydedildi"); onClose(); };

  return (
    <div
      role="dialog"
      aria-modal
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
    >
      <div className="bg-[var(--color-bg-elev)] rounded-xl p-5 min-w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl">
        <h2 className="text-base font-semibold mb-3.5">Environments</h2>
        {envs.map((e) => <EnvRow key={e.id} env={e} onUpdate={update} onRemove={remove} />)}
        <button
          onClick={add}
          className="w-full text-xs py-1.5 mt-1 rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          + Environment ekle
        </button>
        <div className="flex justify-end gap-2 mt-3.5">
          <button
            onClick={save}
            className="bg-[var(--color-accent)] text-white border-0 rounded-md px-4 py-1.5 font-medium text-xs"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

type RowProps = {
  env: Environment;
  onUpdate: (id: string, patch: Partial<Environment>) => void;
  onRemove: (id: string) => void;
};

function EnvRow({ env, onUpdate, onRemove }: RowProps) {
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
          onChange={(e) => onUpdate(env.id, { name: e.target.value })}
          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={() => onRemove(env.id)}
          className="bg-[var(--color-bg-elev-2)] text-[var(--color-fg)] border-0 rounded px-2.5 py-1 text-xs"
        >
          Sil
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder="key=value\nbase_url=https://api.example.com\ntoken=abc123"
        spellCheck={false}
        className="w-full min-h-[90px] resize-y bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs leading-6 outline-none focus:border-[var(--color-accent)]"
      />
    </div>
  );
}
