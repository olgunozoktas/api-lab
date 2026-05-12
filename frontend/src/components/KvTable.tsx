/** Olgun Özoktaş geliştirdi · API Lab */
import type { KvRow } from "../lib/types";
import { useT } from "../lib/i18n/useT";
import type { TKey } from "../lib/i18n";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";

type Props = {
  rows: KvRow[];
  onChange: (rows: KvRow[]) => void;
  addLabelKey: TKey;
};

export function KvTable({ rows, onChange, addLabelKey }: Props) {
  const t = useT();
  const update = (i: number, patch: Partial<KvRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { enabled: true, k: "", v: "" }]);

  const inputCls =
    "bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded " +
    "px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)]";

  return (
    <>
      <div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid gap-1.5 mb-1 items-center"
            style={{ gridTemplateColumns: "24px 1fr 1fr 28px" }}
          >
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) => update(i, { enabled: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            <input
              type="text"
              placeholder="key"
              value={r.k}
              onChange={(e) => update(i, { k: e.target.value })}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="value"
              value={r.v}
              onChange={(e) => update(i, { v: e.target.value })}
              className={inputCls}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              aria-label={t("kv.delete")}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="dashed" size="md" className="w-full mt-1" onClick={add}>
        {t(addLabelKey)}
      </Button>
    </>
  );
}
