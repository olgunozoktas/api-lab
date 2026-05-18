/** Olgun Özoktaş geliştirdi · API Lab */
// Collapsible tree view for XML response bodies. Parses with the
// platform `DOMParser`, then renders a recursive element tree —
// attributes dimmed, leaf text inline, branches collapsible.

import { useMemo, useState } from "react";
import { useT } from "../lib/i18n/useT";

export type XmlTreeViewProps = { body: string };

type XmlElem = {
  tag: string;
  attrs: [string, string][];
  children: XmlElem[];
  // Trimmed text content — only populated for leaf elements (no
  // element children); mixed content keeps just the element children.
  text: string;
};

function domToElem(el: Element): XmlElem {
  const attrs: [string, string][] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    attrs.push([el.attributes[i].name, el.attributes[i].value]);
  }
  const children: XmlElem[] = [];
  for (let i = 0; i < el.children.length; i++) {
    children.push(domToElem(el.children[i]));
  }
  const text = children.length === 0 ? (el.textContent ?? "").trim() : "";
  return { tag: el.tagName, attrs, children, text };
}

function ElemRow({ elem, depth }: { elem: XmlElem; depth: number }) {
  // Deep trees start collapsed past 4 levels so a big document isn't
  // a wall of text on open.
  const [open, setOpen] = useState(depth < 4);
  const hasKids = elem.children.length > 0;
  return (
    <div>
      <div
        className="flex items-start gap-1 font-mono text-2xs py-0.5 hover:bg-[var(--color-bg-elev-2)]"
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 w-3 text-[var(--color-fg-muted)]"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="shrink-0 w-3" />
        )}
        <span className="min-w-0 break-words">
          <span className="text-[var(--color-accent)]">{elem.tag}</span>
          {elem.attrs.map(([k, v]) => (
            <span key={k} className="text-[var(--color-fg-muted)]">
              {" "}
              {k}=<span className="text-[var(--color-success)]">&quot;{v}&quot;</span>
            </span>
          ))}
          {elem.text ? <span className="text-[var(--color-fg)]"> {elem.text}</span> : null}
        </span>
      </div>
      {hasKids && open
        ? elem.children.map((c, i) => <ElemRow key={`${c.tag}-${i}`} elem={c} depth={depth + 1} />)
        : null}
    </div>
  );
}

export function XmlTreeView({ body }: XmlTreeViewProps) {
  const t = useT();
  const root = useMemo<XmlElem | null>(() => {
    try {
      const doc = new DOMParser().parseFromString(body, "application/xml");
      // A `<parsererror>` element means the document was malformed.
      if (doc.querySelector("parsererror")) return null;
      return doc.documentElement ? domToElem(doc.documentElement) : null;
    } catch {
      return null;
    }
  }, [body]);

  if (!root) {
    return (
      <div className="flex-1 overflow-auto p-3 text-xs text-[var(--color-danger)]">
        {t("response.xml.invalid")}
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-auto py-1 select-text">
      <ElemRow elem={root} depth={0} />
    </div>
  );
}
