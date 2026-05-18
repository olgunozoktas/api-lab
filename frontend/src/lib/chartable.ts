/** Olgun Özoktaş geliştirdi · API Lab */
// Pure analysis layer for the response Visualize view. Takes a raw
// JSON response body and decides whether it can be rendered as a
// table + chart, then extracts the rows / columns / series the view
// components consume. No React, no DOM — fully unit-testable.

export type VizRow = Record<string, unknown>;

export type VizColumn = {
  key: string;
  // True when every defined value in the column is a finite number.
  numeric: boolean;
};

// Why a body isn't visualizable — drives the empty-state copy.
export type VizReason = "invalid-json" | "not-array" | "empty" | "no-objects";

export type VizAnalysis =
  | {
      kind: "chartable";
      columns: VizColumn[];
      rows: VizRow[];
      // Keys of the columns that can feed a chart's value axis.
      numericColumns: string[];
      // Column used for the chart's category / x-axis. null → row index.
      labelColumn: string | null;
    }
  | { kind: "not-chartable"; reason: VizReason };

export type SeriesPoint = { label: string; value: number };

export type SortDir = "asc" | "desc";

// Synthetic key for the index column when the body is a bare numeric
// array — kept distinct from any real object key.
export const INDEX_KEY = "#";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isPlainObject(v: unknown): v is VizRow {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Decide whether an array of objects yields a chartable analysis.
function analyzeObjectRows(rows: VizRow[]): VizAnalysis {
  // Collect column keys in first-seen order across every row — later
  // rows may carry keys the first row lacked (sparse / heterogeneous
  // JSON), and the table should surface all of them.
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }

  const columns: VizColumn[] = keys.map((key) => {
    let sawValue = false;
    let allNumeric = true;
    for (const row of rows) {
      const v = row[key];
      if (v === undefined || v === null) continue;
      sawValue = true;
      if (!isFiniteNumber(v)) {
        allNumeric = false;
        break;
      }
    }
    return { key, numeric: sawValue && allNumeric };
  });

  const numericColumns = columns.filter((c) => c.numeric).map((c) => c.key);
  const labelColumn = columns.find((c) => !c.numeric)?.key ?? null;

  return { kind: "chartable", columns, rows, numericColumns, labelColumn };
}

// Wrap a bare numeric array (`[1, 2, 3]`) as single-series rows so the
// same table + chart machinery handles it.
function analyzeNumericArray(values: number[]): VizAnalysis {
  const rows: VizRow[] = values.map((value, i) => ({ [INDEX_KEY]: i, value }));
  return {
    kind: "chartable",
    columns: [
      { key: INDEX_KEY, numeric: true },
      { key: "value", numeric: true },
    ],
    rows,
    numericColumns: ["value"],
    labelColumn: INDEX_KEY,
  };
}

// Entry point: analyze a raw response body string.
export function analyzeResponse(body: string): VizAnalysis {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { kind: "not-chartable", reason: "invalid-json" };
  }

  if (!Array.isArray(parsed)) {
    return { kind: "not-chartable", reason: "not-array" };
  }
  if (parsed.length === 0) {
    return { kind: "not-chartable", reason: "empty" };
  }

  if (parsed.every(isFiniteNumber)) {
    return analyzeNumericArray(parsed as number[]);
  }
  if (parsed.every(isPlainObject)) {
    return analyzeObjectRows(parsed as VizRow[]);
  }
  // Array of primitives / arrays / mixed shapes — nothing to tabulate.
  return { kind: "not-chartable", reason: "no-objects" };
}

// Build a chart series from analyzed rows: one point per row, value
// pulled from `valueColumn`, label from `labelColumn` (or row index).
export function buildSeries(
  rows: VizRow[],
  valueColumn: string,
  labelColumn: string | null
): SeriesPoint[] {
  return rows.map((row, i) => {
    const raw = row[valueColumn];
    const value = isFiniteNumber(raw) ? raw : Number(raw);
    return {
      label: labelColumn !== null ? formatCell(row[labelColumn]) : String(i),
      value: Number.isFinite(value) ? value : 0,
    };
  });
}

// Stable sort of rows by a column. Numeric columns compare as numbers;
// everything else compares as locale-aware strings. Returns a new array.
export function sortRows(rows: VizRow[], column: string, dir: SortDir, numeric: boolean): VizRow[] {
  const factor = dir === "asc" ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const av = a.row[column];
      const bv = b.row[column];
      // Push null / undefined to the end regardless of direction.
      const aEmpty = av === undefined || av === null;
      const bEmpty = bv === undefined || bv === null;
      if (aEmpty && bEmpty) return a.i - b.i;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      let cmp: number;
      if (numeric) {
        cmp = Number(av) - Number(bv);
      } else {
        cmp = formatCell(av).localeCompare(formatCell(bv));
      }
      // Stable: fall back to original index when values tie.
      return cmp !== 0 ? cmp * factor : a.i - b.i;
    })
    .map((entry) => entry.row);
}

// Render any cell value to a compact string for the table.
export function formatCell(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
