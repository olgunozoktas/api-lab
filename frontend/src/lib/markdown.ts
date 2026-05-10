// Minimal markdown-to-HTML renderer for in-app docs (changelog
// entries, feature guides). Hand-rolled, dependency-free, and
// safe-by-default: every input is HTML-escaped first, so raw HTML
// in the source becomes inert text. The renderer only emits a
// curated set of tags (h1-h4, p, ul/ol/li, strong, em, code, pre,
// a) — no <script>, <iframe>, <style>, etc.
//
// Subset supported:
//   # H1 / ## H2 / ### H3 / #### H4
//   - bullet  /  * bullet  (ul)
//   1. numbered            (ol)
//   ```lang ... ```        (fenced code block, lang is informational)
//   `inline code`
//   **bold**
//   _italic_  /  *italic*
//   [text](https://url)    (links open in a new tab)
//   ---                    (hr)
//   blank lines            (paragraph break)
//
// Out of scope intentionally: tables, blockquotes, image embeds, raw
// HTML pass-through, footnotes. We author the content; if we need
// any of these, add them to the renderer.

const ESCAPE_RE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c]);
}

const URL_RE = /^https?:\/\/[^\s<>")]+$/;

function safeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  return URL_RE.test(trimmed) ? trimmed : null;
}

// Inline transforms run AFTER escapeHtml. Order matters:
//   1. Code spans first (their content is not further transformed).
//   2. Bold/italic/links over the remaining text.
function renderInline(escaped: string): string {
  // Code spans — `text`
  let out = "";
  let i = 0;
  while (i < escaped.length) {
    if (escaped[i] === "`") {
      const end = escaped.indexOf("`", i + 1);
      if (end > i) {
        out += `<code>${escaped.slice(i + 1, end)}</code>`;
        i = end + 1;
        continue;
      }
    }
    out += escaped[i];
    i++;
  }

  // Links — [text](url). The url is HTML-escaped (entities like &amp;)
  // so unescape & validate before emitting. Only http/https allowed.
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, urlEsc: string) => {
    const url = urlEsc
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const safe = safeUrl(url);
    if (!safe) return text; // drop the bracket pair, keep the inner text
    const safeAttr = escapeHtml(safe);
    return `<a href="${safeAttr}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Bold then italic. Bold first so **_x_** doesn't get confused.
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, "<em>$1</em>");
  out = out.replace(/(?<![_\w])_([^_\n]+)_(?![_\w])/g, "<em>$1</em>");

  return out;
}

type Block =
  | { kind: "h"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "hr" };

function tokenize(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line === "") {
      i++;
      continue;
    }

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      blocks.push({ kind: "code", lang, text: buf.join("\n") });
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Headings
    const headMatch = /^(#{1,4})\s+(.*)$/.exec(line);
    if (headMatch) {
      const level = headMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({ kind: "h", level, text: headMatch[2] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trimEnd())) {
        items.push(lines[i].trimEnd().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trimEnd())) {
        items.push(lines[i].trimEnd().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph — accumulate consecutive non-empty, non-special lines
    const buf: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trimEnd();
      if (next === "") break;
      if (next.startsWith("```")) break;
      if (/^---+$/.test(next)) break;
      if (/^#{1,4}\s+/.test(next)) break;
      if (/^[-*]\s+/.test(next)) break;
      if (/^\d+\.\s+/.test(next)) break;
      buf.push(next);
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }

  return blocks;
}

function renderBlock(b: Block): string {
  switch (b.kind) {
    case "h":
      return `<h${b.level}>${renderInline(escapeHtml(b.text))}</h${b.level}>`;
    case "p":
      return `<p>${renderInline(escapeHtml(b.text))}</p>`;
    case "ul":
      return `<ul>${b.items.map((it) => `<li>${renderInline(escapeHtml(it))}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${b.items.map((it) => `<li>${renderInline(escapeHtml(it))}</li>`).join("")}</ol>`;
    case "code": {
      const langClass = b.lang ? ` class="lang-${escapeHtml(b.lang)}"` : "";
      return `<pre><code${langClass}>${escapeHtml(b.text)}</code></pre>`;
    }
    case "hr":
      return "<hr />";
  }
}

// Strip optional YAML-ish frontmatter delimited by `---` lines at the
// very top. Returns the body and the parsed key:value pairs (string
// values only — we only use it for `title` and `date`).
export function splitFrontmatter(src: string): {
  body: string;
  frontmatter: Record<string, string>;
} {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return { body: src, frontmatter: {} };
  const end = lines.indexOf("---", 1);
  if (end < 0) return { body: src, frontmatter: {} };
  const fm: Record<string, string> = {};
  for (let i = 1; i < end; i++) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return {
    body: lines
      .slice(end + 1)
      .join("\n")
      .replace(/^\n+/, ""),
    frontmatter: fm,
  };
}

// Render a markdown document body to safe HTML. Frontmatter is NOT
// stripped here — call splitFrontmatter first if your source has
// frontmatter.
export function renderMarkdown(src: string): string {
  return tokenize(src).map(renderBlock).join("\n");
}
