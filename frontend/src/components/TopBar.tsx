import { useStore } from "../store";
import { useState } from "react";
import { EnvEditorModal } from "./EnvEditorModal";

export function TopBar() {
  const envs = useStore((s) => s.envs);
  const activeEnv = useStore((s) => s.activeEnv);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const showToast = useStore((s) => s.showToast);
  const [editing, setEditing] = useState(false);

  const cycleTheme = () => {
    const order = ["auto", "light", "dark"] as const;
    const next = order[(order.indexOf(ui.theme) + 1) % 3];
    setUi({ theme: next });
    document.documentElement.style.colorScheme = next === "auto" ? "light dark" : next;
    showToast("Theme: " + next);
  };

  return (
    <>
      <header className="h-11 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center px-3 gap-3 flex-shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
          API Lab
        </div>
        <div className="flex-1" />
        <select
          value={activeEnv}
          onChange={(e) => setActiveEnv(e.target.value)}
          className="bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] rounded-md px-2.5 py-1 text-xs"
        >
          {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button
          className="text-xs px-2.5 py-1 rounded-md text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]"
          onClick={() => setEditing(true)}
        >
          Env...
        </button>
        <button
          className="text-xs px-2.5 py-1 rounded-md text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]"
          onClick={cycleTheme}
        >
          Theme
        </button>
      </header>
      {editing && <EnvEditorModal onClose={() => setEditing(false)} />}
    </>
  );
}
