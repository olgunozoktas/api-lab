/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { extensionForContentType } from "../responseDownload";

describe("extensionForContentType", () => {
  it("maps common JSON variants to json", () => {
    expect(extensionForContentType("application/json")).toBe("json");
    expect(extensionForContentType("application/json; charset=utf-8")).toBe("json");
    expect(extensionForContentType("application/vnd.api+json")).toBe("json");
    expect(extensionForContentType("application/hal+json")).toBe("json");
  });

  it("maps HTML / SVG / XML", () => {
    expect(extensionForContentType("text/html")).toBe("html");
    expect(extensionForContentType("text/html; charset=utf-8")).toBe("html");
    expect(extensionForContentType("image/svg+xml")).toBe("svg");
    expect(extensionForContentType("application/xml")).toBe("xml");
    expect(extensionForContentType("text/xml")).toBe("xml");
    expect(extensionForContentType("application/atom+xml")).toBe("xml");
  });

  it("maps assorted text types", () => {
    expect(extensionForContentType("text/csv")).toBe("csv");
    expect(extensionForContentType("text/markdown")).toBe("md");
    expect(extensionForContentType("text/yaml")).toBe("yaml");
    expect(extensionForContentType("application/yaml")).toBe("yaml");
    expect(extensionForContentType("application/javascript")).toBe("js");
    expect(extensionForContentType("text/javascript")).toBe("js");
    expect(extensionForContentType("text/css")).toBe("css");
    expect(extensionForContentType("text/plain")).toBe("txt");
  });

  it("falls back to txt for unknown or empty types", () => {
    expect(extensionForContentType("")).toBe("txt");
    expect(extensionForContentType("application/octet-stream")).toBe("txt");
    expect(extensionForContentType("image/png")).toBe("txt"); // raster images stored as bytes
  });

  it("is case-insensitive", () => {
    expect(extensionForContentType("APPLICATION/JSON")).toBe("json");
    expect(extensionForContentType("Text/HTML; Charset=UTF-8")).toBe("html");
  });
});
