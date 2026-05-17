/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { buildRedocHtml } from "../redocHtml";

describe("buildRedocHtml", () => {
  it("produces an HTML document referencing the Redoc bundle", () => {
    const html = buildRedocHtml({ openapi: "3.0.0" }, "My API");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("redoc.standalone.js");
    expect(html).toContain("Redoc.init(");
  });

  it("inlines the spec as JSON", () => {
    const html = buildRedocHtml({ openapi: "3.0.0", info: { title: "x" } }, "doc");
    expect(html).toContain('"openapi":"3.0.0"');
  });

  it("escapes the title against HTML injection", () => {
    const html = buildRedocHtml({}, "<script>alert(1)</script>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes `<` in the inlined spec so it can't break out of the script tag", () => {
    const html = buildRedocHtml({ note: "</script><script>evil()" }, "doc");
    expect(html).not.toContain("</script><script>evil()");
    expect(html).toContain("\\u003c/script>");
  });
});
