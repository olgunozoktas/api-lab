/** Olgun Özoktaş geliştirdi · API Lab */
// cURL command parser — converts a `curl ...` shell line into a partial
// CurrentRequest the URL bar can drop into the active tab. Pure function,
// no DOM, no React. Covers the common shapes copied from API docs:
//
//   curl URL
//   curl -X POST URL -H 'Content-Type: application/json' -d '{...}'
//   curl --request PUT --header "X-Foo: bar" --data-raw "payload"
//   curl -u alice:secret URL                       → Basic auth
//   curl URL \
//     -H 'A: 1' \
//     -H 'B: 2' \
//     -d '{}'
//
// Skipped intentionally: -F multipart, --cacert / -k SSL options,
// -b / -c cookies. The parser ignores unknown flags rather than failing
// — partial imports beat refusal.

import type { Auth, KvRow } from "./types";

export type ParsedCurl = {
  method: string;
  url: string;
  headers: KvRow[];
  body: string;
  auth: Auth | null;
  unknownFlags: string[];
};

export function looksLikeCurl(text: string): boolean {
  return /^\s*curl\s+/i.test(text);
}

// Shell-aware tokenizer: splits on whitespace but respects single quotes,
// double quotes, and backslash continuations. Doesn't try to be a full
// POSIX shell — handles the patterns curl examples actually use.
export function tokenizeShell(input: string): string[] {
  const out: string[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    // Skip whitespace + multi-line continuations (\<newline>)
    while (
      i < n &&
      (input[i] === " " || input[i] === "\t" || input[i] === "\n" || input[i] === "\r")
    ) {
      i++;
    }
    if (i < n && input[i] === "\\" && (input[i + 1] === "\n" || input[i + 1] === "\r")) {
      i += input[i + 1] === "\r" && input[i + 2] === "\n" ? 3 : 2;
      continue;
    }
    if (i >= n) break;

    let token = "";
    let consumed = false;
    while (i < n) {
      const ch = input[i];
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        if (consumed) break;
        i++;
        continue;
      }
      if (ch === "\\" && (input[i + 1] === "\n" || input[i + 1] === "\r")) {
        i += input[i + 1] === "\r" && input[i + 2] === "\n" ? 3 : 2;
        continue;
      }
      if (ch === "'") {
        // Single-quoted string: literal, no escapes (POSIX behavior).
        i++;
        while (i < n && input[i] !== "'") {
          token += input[i++];
        }
        if (i < n) i++; // consume closing '
        consumed = true;
        continue;
      }
      if (ch === '"') {
        // Double-quoted: \" \\ \$ recognized (we treat all backslash-X
        // as the literal X — close enough for headers and bodies).
        i++;
        while (i < n && input[i] !== '"') {
          if (input[i] === "\\" && i + 1 < n) {
            token += input[i + 1];
            i += 2;
          } else {
            token += input[i++];
          }
        }
        if (i < n) i++; // consume closing "
        consumed = true;
        continue;
      }
      if (ch === "\\") {
        // Bare backslash: escape next char (drop the backslash).
        if (i + 1 < n) {
          token += input[i + 1];
          i += 2;
        } else {
          i++;
        }
        consumed = true;
        continue;
      }
      token += ch;
      i++;
      consumed = true;
    }
    if (consumed) out.push(token);
  }
  return out;
}

// Flags that take a value (e.g. -H requires an argument). Long forms
// support both `--flag value` and `--flag=value`.
const VALUE_FLAGS: Record<string, true> = {
  "-X": true,
  "--request": true,
  "-H": true,
  "--header": true,
  "-d": true,
  "--data": true,
  "--data-raw": true,
  "--data-ascii": true,
  "--data-binary": true,
  "--data-urlencode": true,
  "-u": true,
  "--user": true,
  "-A": true,
  "--user-agent": true,
  "-e": true,
  "--referer": true,
  "-b": true,
  "--cookie": true,
  "-c": true,
  "--cookie-jar": true,
  "--url": true,
};

// Flags that don't take an argument and we silently swallow (so they
// don't leak into the URL slot or unknown-flag report). curl-noise.
const SKIP_FLAGS: Set<string> = new Set([
  "-i",
  "--include",
  "-s",
  "--silent",
  "-S",
  "--show-error",
  "-v",
  "--verbose",
  "-k",
  "--insecure",
  "-L",
  "--location",
  "-f",
  "--fail",
  "-O",
  "--remote-name",
  "-J",
  "--remote-header-name",
  "--compressed",
  "-G",
  "--get",
]);

function asKv(name: string, value: string): KvRow {
  return { enabled: true, k: name, v: value };
}

export function parseCurl(input: string): ParsedCurl {
  const tokens = tokenizeShell(input);

  // Drop leading "curl" (case-insensitive) if present.
  if (tokens[0]?.toLowerCase() === "curl") tokens.shift();

  let method = "";
  let url = "";
  const headers: KvRow[] = [];
  let body = "";
  let auth: Auth | null = null;
  const unknownFlags: string[] = [];
  const positional: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];

    // Long-flag --foo=bar split.
    if (tok.startsWith("--") && tok.includes("=")) {
      const eq = tok.indexOf("=");
      const name = tok.slice(0, eq);
      const val = tok.slice(eq + 1);
      tokens.splice(i, 1, name, val);
      tok = name;
    }

    if (SKIP_FLAGS.has(tok)) continue;

    if (VALUE_FLAGS[tok]) {
      const val = tokens[i + 1] ?? "";
      i += 1;
      switch (tok) {
        case "-X":
        case "--request":
          method = val.toUpperCase();
          break;
        case "-H":
        case "--header": {
          const colon = val.indexOf(":");
          if (colon > 0) {
            const k = val.slice(0, colon).trim();
            const v = val.slice(colon + 1).trim();
            headers.push(asKv(k, v));
          }
          break;
        }
        case "-d":
        case "--data":
        case "--data-raw":
        case "--data-ascii":
        case "--data-binary":
        case "--data-urlencode":
          body = body ? body + "&" + val : val;
          break;
        case "-u":
        case "--user": {
          const sep = val.indexOf(":");
          const user = sep >= 0 ? val.slice(0, sep) : val;
          const pass = sep >= 0 ? val.slice(sep + 1) : "";
          auth = { type: "basic", user, pass };
          break;
        }
        case "-A":
        case "--user-agent":
          headers.push(asKv("User-Agent", val));
          break;
        case "-e":
        case "--referer":
          headers.push(asKv("Referer", val));
          break;
        case "-b":
        case "--cookie":
          headers.push(asKv("Cookie", val));
          break;
        case "--url":
          url = val;
          break;
        // -c / cookie-jar accept a value but we have nowhere to put it
        // in the request shape; swallow silently.
      }
      continue;
    }

    if (tok.startsWith("-")) {
      // Unknown flag. Some unknowns expect a value; we conservatively
      // assume "valueless" and just record the flag so the user knows
      // it was dropped. If it eats the URL by mistake the user can
      // fix in the composer.
      unknownFlags.push(tok);
      continue;
    }

    positional.push(tok);
  }

  // First positional arg that wasn't already consumed = URL (unless
  // --url already set it).
  if (!url && positional.length > 0) url = positional[0];

  if (!method) {
    method = body ? "POST" : "GET";
  }

  return { method, url, headers, body, auth, unknownFlags };
}
