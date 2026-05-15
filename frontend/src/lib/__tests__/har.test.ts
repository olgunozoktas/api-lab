/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { parseHar, isHarFile } from "../importers/har";

const SAMPLE = {
  log: {
    version: "1.2",
    creator: { name: "Chrome DevTools", version: "120.0" },
    entries: [
      {
        startedDateTime: "2026-05-15T08:00:00.123Z",
        time: 234,
        request: {
          method: "GET",
          url: "https://api.example.com/health?v=1",
          headers: [
            { name: "Accept", value: "application/json" },
            { name: "User-Agent", value: "test" },
          ],
          queryString: [{ name: "v", value: "1" }],
        },
        response: {
          status: 200,
          statusText: "OK",
          headers: [{ name: "Content-Type", value: "application/json" }],
          content: { mimeType: "application/json", text: '{"ok":true}', size: 11 },
        },
      },
      {
        startedDateTime: "2026-05-15T08:00:05.000Z",
        time: 567,
        request: {
          method: "POST",
          url: "https://api.example.com/users",
          headers: [{ name: "Content-Type", value: "application/json" }],
          postData: { mimeType: "application/json", text: '{"name":"alice"}' },
        },
        response: {
          status: 201,
          statusText: "Created",
          content: { mimeType: "application/json", size: 42 },
        },
      },
      {
        startedDateTime: "2026-05-15T08:00:10.000Z",
        time: 99,
        request: {
          method: "PUT",
          url: "https://api.example.com/upload",
          postData: { mimeType: "multipart/form-data; boundary=abc", text: "binary" },
        },
        response: { status: 204, content: { size: 0 } },
      },
    ],
  },
};

describe("isHarFile", () => {
  it("accepts HAR 1.2", () => {
    expect(isHarFile(SAMPLE)).toBe(true);
  });

  it("accepts HAR 1.1 (prefix match)", () => {
    expect(isHarFile({ ...SAMPLE, log: { ...SAMPLE.log, version: "1.1" } })).toBe(true);
  });

  it("rejects non-HAR shapes", () => {
    expect(isHarFile({ log: { entries: [] } })).toBe(false); // missing version
    expect(isHarFile({ log: { version: "2.0", entries: [] } })).toBe(false);
    expect(isHarFile({ entries: [] })).toBe(false);
    expect(isHarFile(null)).toBe(false);
    expect(isHarFile("string")).toBe(false);
  });
});

describe("parseHar", () => {
  it("returns the right count + collectionName", () => {
    const r = parseHar(JSON.stringify(SAMPLE));
    expect(r.totalEntries).toBe(3);
    expect(r.requestCount).toBe(3);
    expect(r.folderCount).toBe(0);
    expect(r.collectionName).toContain("Chrome DevTools");
    expect(r.collectionName).toContain("3");
  });

  it("maps method, URL, query, and headers", () => {
    const r = parseHar(JSON.stringify(SAMPLE));
    const get = r.items[0];
    expect(get.request.method).toBe("GET");
    expect(get.request.url).toBe("https://api.example.com/health?v=1");
    expect(get.request.headers.find((h) => h.k === "Accept")?.v).toBe("application/json");
    expect(get.request.params.find((p) => p.k === "v")?.v).toBe("1");
  });

  it("preserves the response status + timing + size", () => {
    const r = parseHar(JSON.stringify(SAMPLE));
    expect(r.items[0].response.status).toBe(200);
    expect(r.items[0].response.elapsedMs).toBe(234);
    expect(r.items[0].response.sizeBytes).toBe(11);
    expect(r.items[1].response.status).toBe(201);
    expect(r.items[1].response.sizeBytes).toBe(42);
  });

  it("parses startedDateTime into a millisecond timestamp", () => {
    const r = parseHar(JSON.stringify(SAMPLE));
    expect(r.items[0].ts).toBe(Date.parse("2026-05-15T08:00:00.123Z"));
    expect(r.items[1].ts).toBeGreaterThan(r.items[0].ts);
  });

  it("maps JSON postData to body.mode json", () => {
    const r = parseHar(JSON.stringify(SAMPLE));
    expect(r.items[1].request.body.mode).toBe("json");
    expect(r.items[1].request.body.text).toBe('{"name":"alice"}');
  });

  it("skips multipart with a warning and leaves body none", () => {
    const r = parseHar(JSON.stringify(SAMPLE));
    expect(r.items[2].request.body.mode).toBe("none");
    expect(r.warnings.some((w) => w.includes("multipart"))).toBe(true);
  });

  it("throws on invalid JSON / non-HAR shape", () => {
    expect(() => parseHar("{not json")).toThrow(/Invalid JSON/);
    expect(() => parseHar(JSON.stringify({ hello: "world" }))).toThrow(/HAR/);
  });

  it("skips entries with no request.url and warns", () => {
    const malformed = {
      log: {
        version: "1.2",
        entries: [
          { startedDateTime: "2026-05-15T00:00:00Z", time: 1, request: {} },
          ...SAMPLE.log.entries,
        ],
      },
    };
    const r = parseHar(JSON.stringify(malformed));
    expect(r.requestCount).toBe(3);
    expect(r.totalEntries).toBe(4);
    expect(r.warnings.some((w) => w.includes("missing request.url"))).toBe(true);
  });
});
