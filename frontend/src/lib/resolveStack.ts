// Runtime source-map resolver. Takes an Error.stack string with minified
// frames like `pi@zero://app/assets/index-xxx.js:8:27509`, fetches the
// matching `.js.map` sidecar Vite emits, and rewrites each frame to the
// original file/function/line. Output goes into the ErrorBoundary's
// "Copy report" payload so a stack pasted into a chat or AI agent has
// real symbol names instead of minifier output.
//
// Library: `source-map-js` (Mozilla's parser, ~30 KB minified). We use
// it lazily — `import("source-map-js")` so the resolver code splits
// into its own chunk and doesn't bloat the cold-start path.

import { SourceMapConsumer, type RawSourceMap } from "source-map-js";

export type ResolvedFrame = {
  raw: string; // original line as it appeared in error.stack
  fn: string | null; // resolved function name, or fallback to minified
  file: string | null; // resolved source file
  line: number | null;
  column: number | null;
};

const STACK_LINE_RE =
  // Matches both Safari/WebKit (`fn@url:line:col`) and Chrome
  // (`    at fn (url:line:col)`). The url is anything starting with
  // a scheme + `://`. line + col are required.
  /(?:^|@|\s)(?:at\s+)?(?:(\S+?)\s+\(|@)?((?:[a-z][a-z0-9+\-.]*):\/\/[^\s)]+):(\d+):(\d+)\)?/i;

const MAP_CACHE = new Map<string, Promise<SourceMapConsumer | null>>();

async function getConsumer(jsUrl: string): Promise<SourceMapConsumer | null> {
  const mapUrl = jsUrl + ".map";
  let cached = MAP_CACHE.get(mapUrl);
  if (cached) return cached;
  cached = (async () => {
    try {
      const res = await fetch(mapUrl);
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[resolveStack] map fetch failed (${res.status}):`, mapUrl);
        return null;
      }
      const json = (await res.json()) as RawSourceMap;
      return new SourceMapConsumer(json);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[resolveStack] map fetch threw:", mapUrl, err);
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
  // Split error.stack lines on newline; each line goes through this.
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
  resolved: string; // either rewritten stack OR rawStack on full failure
  mappedCount: number; // # of frames that got original-position substitution
  totalFrames: number; // # of frames the parser recognized in the input
  fetchFailures: string[]; // map URLs that failed to fetch
};

// Public entry. Walks the stack frame-by-frame and rewrites each
// minified `fn@url:line:col` into the original `at fn  src:line:col`
// using the matching `.js.map` sidecar. Returns counts so callers can
// distinguish "resolution worked, mapping was identical" from
// "resolution never ran" — both used to look the same.
export async function resolveStack(rawStack: string): Promise<ResolveResult> {
  if (!rawStack) {
    return { resolved: rawStack, mappedCount: 0, totalFrames: 0, fetchFailures: [] };
  }
  const lines = rawStack.split("\n");
  const out: string[] = [];
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
      continue;
    }
    const orig = consumer.originalPositionFor({
      line: parsed.line,
      column: parsed.column,
    });
    if (!orig.source) {
      out.push(line);
      continue;
    }
    mappedCount += 1;
    const fnName = orig.name || parsed.fn || "<anonymous>";
    const min = parsed.fn ? `(min: ${parsed.fn})` : "";
    out.push(`  at ${fnName}  ${orig.source}:${orig.line}:${orig.column}  ${min}`.trim());
  }
  return {
    resolved: out.join("\n"),
    mappedCount,
    totalFrames,
    fetchFailures: Array.from(fetchFailures),
  };
}

// Best-effort: if the resolver is missing or fetch fails, return the
// original stack so the caller never has to handle "throws". Wraps
// resolveStack with a try/catch + timeout. Used by ErrorBoundary.
export async function resolveStackSafe(
  rawStack: string,
  // 30s ceiling — enough for a 4-5 MB sourcemap to fetch + parse on a
  // slow disk/connection. The earlier 4s default was tight enough that
  // on first launch (cold cache) the resolver lost the race against
  // the user clicking "Copy report" before resolution landed.
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
      mappedCount: 0,
      totalFrames: 0,
      fetchFailures: [],
    };
  }
}
