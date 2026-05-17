/** Olgun Özoktaş geliştirdi · API Lab */
//
// Side-by-side response diff engine. Pure — no React, no store.
//
// `prepareDiffBody` normalises a body for diffing: JSON is reparsed and
// re-serialised with sorted keys so a key-order change is NOT reported
// as a diff (only real value changes are) — the "json-diff" semantic.
// Non-JSON text is diffed as-is, line by line.
//
// `diffLines` is a Longest-Common-Subsequence line diff. No dependency:
// a ~40-line LCS is smaller than the supply-chain surface of
// diff-match-patch / microdiff, and matches the project's hand-rolled
// library posture (markdown.ts, hexDump.ts, syntaxHighlight.ts).

import { isProbablyJson } from "./utils";

// Per-side line cap. The LCS DP table is O(n·m); 1500² Int32 cells is
// ~9 MB transient — fine — and a diff longer than this is unreadable
// anyway. Past the cap the input is truncated and `truncated` is set.
export const MAX_DIFF_LINES = 1500;

export type DiffCell = { num: number; text: string };

export type DiffPair = {
  kind: "equal" | "add" | "remove";
  left: DiffCell | null;
  right: DiffCell | null;
};

export type DiffResult = {
  rows: DiffPair[];
  truncated: boolean;
};

// Recursively rebuild a JSON value with every object's keys sorted, so
// re-serialisation is order-independent.
function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortValue((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

// Normalise a body for diffing. JSON → pretty-printed with sorted keys
// (order-independent). Anything else → returned unchanged.
export function prepareDiffBody(body: string, contentType: string): string {
  const looksJson = contentType.toLowerCase().includes("json") || isProbablyJson(body);
  if (looksJson) {
    try {
      return JSON.stringify(sortValue(JSON.parse(body)), null, 2);
    } catch {
      /* not valid JSON after all — fall through to raw text */
    }
  }
  return body;
}

// Longest-common-subsequence line diff. Returns aligned row pairs:
// `equal` fills both columns, `remove` the left only, `add` the right
// only — exactly the shape a side-by-side renderer consumes.
export function diffLines(aText: string, bText: string): DiffResult {
  const aAll = aText.split("\n");
  const bAll = bText.split("\n");
  const truncated = aAll.length > MAX_DIFF_LINES || bAll.length > MAX_DIFF_LINES;
  const a = aAll.slice(0, MAX_DIFF_LINES);
  const b = bAll.slice(0, MAX_DIFF_LINES);
  const n = a.length;
  const m = b.length;

  // dp[i][j] = LCS length of a[i:] and b[j:]. Flat Int32Array.
  const w = m + 1;
  const dp = new Int32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        a[i] === b[j]
          ? dp[(i + 1) * w + (j + 1)] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + (j + 1)]);
    }
  }

  const rows: DiffPair[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({
        kind: "equal",
        left: { num: i + 1, text: a[i] },
        right: { num: j + 1, text: b[j] },
      });
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + (j + 1)]) {
      rows.push({ kind: "remove", left: { num: i + 1, text: a[i] }, right: null });
      i++;
    } else {
      rows.push({ kind: "add", left: null, right: { num: j + 1, text: b[j] } });
      j++;
    }
  }
  while (i < n) {
    rows.push({ kind: "remove", left: { num: i + 1, text: a[i] }, right: null });
    i++;
  }
  while (j < m) {
    rows.push({ kind: "add", left: null, right: { num: j + 1, text: b[j] } });
    j++;
  }
  return { rows, truncated };
}

// Added / removed line counts for a diff result — drives the modal's
// summary badge. `identical` is true when nothing changed.
export function diffStats(result: DiffResult): {
  added: number;
  removed: number;
  identical: boolean;
} {
  let added = 0;
  let removed = 0;
  for (const row of result.rows) {
    if (row.kind === "add") added++;
    else if (row.kind === "remove") removed++;
  }
  return { added, removed, identical: added === 0 && removed === 0 };
}
