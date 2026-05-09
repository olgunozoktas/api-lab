// Runtime source-map resolver. Takes an Error.stack (or React's
// componentStack) string with minified frames like
// `pi@zero://app/assets/index-xxx.js:8:27509`, fetches the matching
// `.js.map` sidecar Vite emits, and rewrites each frame to the original
// file/function/line. ALSO surfaces per-frame sourceContent so the
// ErrorBoundary can render an Astro-style code excerpt with the
// offending line highlighted.
//
// Library: `source-map-js` (Mozilla's parser, ~30 KB minified).

import { SourceMapConsumer, type RawSourceMap } from "source-map-js";

export type ResolvedFrame = {
  raw: string;
  fn: string | null;
  file: string | null;
  line: number | null;
  column: number | null;
  sourceContent: string | null;
};

const STACK_LINE_RE =
  /(?:^|@|\s)(?:at\s+)?(?:(\S+?)\s+\(|@)?((?:[a-z][a-z0-9+\-.]*):\/\/[^\s)]+):(\d+):(\d+)\)?/i;

const MAP_CACHE = new Map<string, Promise<SourceMapConsumer | null>>();

async function getConsumer(jsUrl: string): Promise<SourceMapConsumer | null> {
  const mapUrl = jsUrl + ".map";
  let cached = MAP_CACHE.get(mapUrl);
  if (cached) return cached;
  cached = (async () => {
    try {
      const res = await fetch(mapUrl);
      // Skip the !res.ok guard. WKURLSchemeHandler responses come back
      // with status=0 (no HTTP semantics on custom schemes), so res.ok
      // is always false even on success. Downstream res.json() and
      // SourceMapConsumer constructor throw on actual failures (HTML
      // fallback bodies, malformed JSON, network errors).
      const json = (await res.json()) as RawSourceMap;
      return new SourceMapConsumer(json);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[resolveStack] map fetch/parse failed (${mapUrl}):`, err);
      return null;
    }
  })();
  MAP_CACHE.set(mapUrl, cached);
  return cached;
}

function parseFrame(line: string): {
  raw: string;
  fn: string | null;
  url: string;
  line: number;
  column: number;
} | null {
  const m = line.match(STACK_LINE_RE);
  if (!m) return null;
  const fn = m[1] ?? null;
  const url = m[2];
  const lineNo = parseInt(m[3], 10);
  const colNo = parseInt(m[4], 10);
  if (!url || !lineNo) return null;
  return { raw: line, fn, url, line: lineNo, column: colNo };
}

export type ResolveResult = {
  resolved: string;
  frames: ResolvedFrame[];
  mappedCount: number;
  totalFrames: number;
  fetchFailures: string[];
};

export async function resolveStack(rawStack: string): Promise<ResolveResult> {
  if (!rawStack) {
    return { resolved: rawStack, frames: [], mappedCount: 0, totalFrames: 0, fetchFailures: [] };
  }
  const lines = rawStack.split("\n");
  const out: string[] = [];
  const frames: ResolvedFrame[] = [];
  let mappedCount = 0;
  let totalFrames = 0;
  const fetchFailures = new Set<string>();
  for (const line of lines) {
    const parsed = parseFrame(line);
    if (!parsed) {
      out.push(line);
      continue;
    }
    totalFrames += 1;
    const consumer = await getConsumer(parsed.url);
    if (!consumer) {
      fetchFailures.add(parsed.url + ".map");
      out.push(line);
      frames.push({
        raw: parsed.raw,
        fn: parsed.fn,
        file: null,
        line: null,
        column: null,
        sourceContent: null,
      });
      continue;
    }
    const orig = consumer.originalPositionFor({ line: parsed.line, column: parsed.column });
    if (!orig.source) {
      out.push(line);
      frames.push({
        raw: parsed.raw,
        fn: parsed.fn,
        file: null,
        line: null,
        column: null,
        sourceContent: null,
      });
      continue;
    }
    mappedCount += 1;
    const fnName = orig.name || parsed.fn || "<anonymous>";
    const min = parsed.fn ? `(min: ${parsed.fn})` : "";
    out.push(`  at ${fnName}  ${orig.source}:${orig.line}:${orig.column}  ${min}`.trim());
    frames.push({
      raw: parsed.raw,
      fn: fnName,
      file: orig.source,
      line: orig.line ?? null,
      column: orig.column ?? null,
      sourceContent: consumer.sourceContentFor(orig.source, true) ?? null,
    });
  }
  return {
    resolved: out.join("\n"),
    frames,
    mappedCount,
    totalFrames,
    fetchFailures: Array.from(fetchFailures),
  };
}

export async function resolveStackSafe(
  rawStack: string,
  timeoutMs: number = 30000
): Promise<ResolveResult> {
  try {
    return await Promise.race([
      resolveStack(rawStack),
      new Promise<ResolveResult>((_, reject) =>
        setTimeout(() => reject(new Error("resolveStack timeout")), timeoutMs)
      ),
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[resolveStack] safe wrapper caught:", err);
    return {
      resolved: rawStack,
      frames: [],
      mappedCount: 0,
      totalFrames: 0,
      fetchFailures: [],
    };
  }
}

// Pick the first frame that resolves to a file inside the project
// (not React internals or node_modules). The ErrorBoundary uses this
// to pin the likely-bug location AND show a source excerpt.
export function pickUserFrame(frames: ResolvedFrame[]): ResolvedFrame | null {
  for (const f of frames) {
    if (!f.file) continue;
    if (f.file.includes("/node_modules/")) continue;
    if (f.file.includes("react/cjs/") || f.file.includes("react-dom/cjs/")) continue;
    return f;
  }
  return null;
}

// Extract a window of lines from sourceContent centered on `line`,
// with `>` on the active line and `^` under the column.
export function buildSourceExcerpt(
  sourceContent: string,
  line: number,
  column: number | null,
  context: number = 3
): string {
  const allLines = sourceContent.split("\n");
  const start = Math.max(0, line - 1 - context);
  const end = Math.min(allLines.length, line + context);
  const widest = String(end).length;
  const out: string[] = [];
  for (let i = start; i < end; i += 1) {
    const lineNo = i + 1;
    const isActive = lineNo === line;
    const num = String(lineNo).padStart(widest, " ");
    out.push(`${isActive ? ">" : " "} ${num} | ${allLines[i] ?? ""}`);
    if (isActive && column != null && column >= 0) {
      out.push(`  ${" ".repeat(widest)} | ${" ".repeat(column)}^`);
    }
  }
  return out.join("\n");
}

// Map common React minified error codes → human hints.
const REACT_HINTS: Record<string, string> = {
  "185":
    "Maximum update depth exceeded — a component is updating state in a loop. Common causes: setState called unconditionally in render, useEffect with unstable deps (new object/array each render), or a state-derived dep that re-fires the same effect.",
  "310": "Hooks rule violation — Hooks called conditionally or outside of a function component.",
  "300":
    "Invalid hook call — Hooks called outside of a function component or before React mounted.",
  "152": "Suspense fallback exception — a child suspended without a fallback boundary above.",
  "418": "Text content mismatch — server-rendered text differs from client render.",
  "419": "Hydration mismatch — markup tree differs between SSR and client.",
};

export function findReactErrorHint(message: string): { code: string; hint: string } | null {
  const m = message.match(/Minified React error #(\d+)/);
  if (!m) return null;
  const code = m[1];
  const hint = REACT_HINTS[code] ?? `See react.dev/errors/${code} for details.`;
  return { code, hint };
}
