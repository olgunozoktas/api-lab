/** Olgun Özoktaş geliştirdi · API Lab */
// Export helpers for the response Visualize view — CSV for the table,
// standalone SVG for the chart. `rowsToCsv` is pure (DOM-free, unit-
// tested in __tests__/vizExport.test.ts); `serializeSvg` needs the
// live DOM because it inlines computed colours so the saved file
// renders the same outside the app's CSS-variable theme.
import { formatCell, type VizColumn, type VizRow } from "./chartable";

// RFC-4180 cell escaping: a field is quoted only when it contains a
// comma, double-quote, CR, or LF, and embedded quotes are doubled.
// Quoting unconditionally would also be valid, but quoting on demand
// keeps a hand-inspected CSV readable.
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Serialize analyzed Visualize rows to a CSV string. Column order
// follows `columns`; row order follows `rows` exactly as passed — the
// caller hands in the already-sorted rows so the export matches what
// the table currently shows. CRLF line endings per RFC 4180 (the
// ending Excel expects).
export function rowsToCsv(columns: VizColumn[], rows: VizRow[]): string {
  const header = columns.map((c) => csvCell(c.key)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvCell(formatCell(row[c.key]))).join(","));
  return [header, ...lines].join("\r\n");
}

// Serialize a live <svg> element to a standalone SVG document string.
// The chart paints with `var(--color-*)` presentation attributes and
// Tailwind `fill-[…]` utility classes — both resolve only inside the
// running app's stylesheet. We deep-clone the node, then copy each
// element's *computed* fill / stroke / font-size into plain
// presentation attributes so the saved file renders identically when
// opened on its own (in a browser, a doc, an image viewer).
export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // A deep clone preserves element order, so the two NodeLists line
  // up index-for-index — that's how a live node maps to its copy.
  const liveEls = svg.querySelectorAll("*");
  const cloneEls = clone.querySelectorAll("*");
  for (let i = 0; i < liveEls.length; i++) {
    const cs = getComputedStyle(liveEls[i]);
    const el = cloneEls[i] as SVGElement;
    if (cs.fill && cs.fill !== "none") el.setAttribute("fill", cs.fill);
    if (cs.stroke && cs.stroke !== "none") el.setAttribute("stroke", cs.stroke);
    if (cs.fontSize) el.setAttribute("font-size", cs.fontSize);
    // Tailwind classes are dead weight in a standalone file — the
    // colour they carried is now inlined above.
    el.removeAttribute("class");
  }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const xml = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}
