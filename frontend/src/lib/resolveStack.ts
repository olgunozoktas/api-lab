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
      if (!res.ok) return null;
      const json = (await res.json()) as RawSourceMap;
      return new SourceMapConsumer(json);
    } catch {
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

// Public entry. Returns the original stack string with each resolvable
// frame replaced by `<originalFile>:<line>:<col>  in  <fn>` and a
// trailing `(min: <minified-name>)` so the diagnostician can still see
// what the minifier output was.
export async function resolveStack(rawStack: string): Promise<string> {
  if (!rawStack) return rawStack;
  const lines = rawStack.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const parsed = parseFrame(line);
    if (!parsed) {
      out.push(line);
      continue;
    }
    const consumer = await getConsumer(parsed.url);
    if (!consumer) {
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
    const fnName = orig.name || parsed.fn || "<anonymous>";
    const min = parsed.fn ? `(min: ${parsed.fn})` : "";
    out.push(`  at ${fnName}  ${orig.source}:${orig.line}:${orig.column}  ${min}`.trim());
  }
  return out.join("\n");
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
): Promise<string> {
  try {
    return await Promise.race([
      resolveStack(rawStack),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("resolveStack timeout")), timeoutMs)
      ),
    ]);
  } catch {
    return rawStack;
  }
}
