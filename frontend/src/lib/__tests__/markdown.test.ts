import { describe, it, expect } from "vitest";
import { renderMarkdown, splitFrontmatter } from "../markdown";

describe("markdown renderer", () => {
  describe("splitFrontmatter", () => {
    it("returns empty frontmatter when no delimiters", () => {
      const r = splitFrontmatter("# Hello\n\nbody");
      expect(r.frontmatter).toEqual({});
      expect(r.body).toBe("# Hello\n\nbody");
    });

    it("parses key: value pairs and strips quotes", () => {
      const src = `---
title: My title
date: 2026-05-10
quoted: "with spaces"
---

body content
`;
      const r = splitFrontmatter(src);
      expect(r.frontmatter.title).toBe("My title");
      expect(r.frontmatter.date).toBe("2026-05-10");
      expect(r.frontmatter.quoted).toBe("with spaces");
      expect(r.body).toBe("body content\n");
    });
  });

  describe("renderMarkdown", () => {
    it("renders headings", () => {
      const html = renderMarkdown("# H1\n\n## H2\n\n### H3");
      expect(html).toContain("<h1>H1</h1>");
      expect(html).toContain("<h2>H2</h2>");
      expect(html).toContain("<h3>H3</h3>");
    });

    it("groups paragraph lines", () => {
      const html = renderMarkdown("First line\nsecond line\n\nNext para");
      expect(html).toContain("<p>First line second line</p>");
      expect(html).toContain("<p>Next para</p>");
    });

    it("renders unordered lists", () => {
      const html = renderMarkdown("- one\n- two\n- three");
      expect(html).toBe("<ul><li>one</li><li>two</li><li>three</li></ul>");
    });

    it("renders ordered lists", () => {
      const html = renderMarkdown("1. one\n2. two");
      expect(html).toBe("<ol><li>one</li><li>two</li></ol>");
    });

    it("renders fenced code blocks with lang class", () => {
      const html = renderMarkdown("```ts\nconst x = 1;\n```");
      expect(html).toContain('<pre><code class="lang-ts">const x = 1;</code></pre>');
    });

    it("renders inline code", () => {
      const html = renderMarkdown("Use `useStore` to read state.");
      expect(html).toContain("<code>useStore</code>");
    });

    it("renders bold and italic", () => {
      const html = renderMarkdown("**bold** and _italic_ and *also italic*");
      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<em>italic</em>");
      expect(html).toContain("<em>also italic</em>");
    });

    it("renders safe links with target+rel", () => {
      const html = renderMarkdown("See [docs](https://example.com)");
      expect(html).toContain(
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer">docs</a>'
      );
    });

    it("rejects javascript: links — keeps inner text only", () => {
      const html = renderMarkdown("[click](javascript:alert(1))");
      expect(html).not.toContain("<a");
      expect(html).not.toContain("javascript:");
      expect(html).toContain("click");
    });

    it("escapes raw HTML — never emits inline tags from input", () => {
      const html = renderMarkdown("<script>alert(1)</script>");
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes attribute-injection attempts", () => {
      const html = renderMarkdown('Look at "this" & that.');
      expect(html).toContain("&quot;this&quot;");
      expect(html).toContain("&amp;");
    });

    it("hr renders for --- on its own line", () => {
      const html = renderMarkdown("before\n\n---\n\nafter");
      expect(html).toContain("<hr />");
    });
  });
});
