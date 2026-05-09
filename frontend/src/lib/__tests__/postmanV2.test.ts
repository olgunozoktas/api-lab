import { describe, it, expect, beforeEach } from "vitest";
import { parsePostmanV2, __resetIdSeqForTesting } from "../importers/postmanV2";

beforeEach(() => {
  __resetIdSeqForTesting();
});

const SAMPLE = {
  info: {
    name: "Demo",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "base_url", value: "https://api.example.com" },
    { key: "api_key", value: "abc123" },
    { key: "deprecated", value: "x", disabled: true },
  ],
  auth: {
    type: "bearer",
    bearer: [{ key: "token", value: "{{token}}", type: "string" }],
  },
  item: [
    {
      name: "Health",
      request: {
        method: "GET",
        url: { raw: "{{base_url}}/health", host: ["{{base_url}}"], path: ["health"] },
        header: [{ key: "Accept", value: "application/json" }],
      },
    },
    {
      name: "Users",
      item: [
        {
          name: "List users",
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('status is 200', function() {",
                  "  pm.expect(pm.response.code).to.equal(200);",
                  "});",
                ],
              },
            },
          ],
          request: {
            method: "GET",
            url: { raw: "{{base_url}}/users?limit=10", query: [{ key: "limit", value: "10" }] },
            auth: {
              type: "apikey",
              apikey: [
                { key: "key", value: "X-Api-Key" },
                { key: "value", value: "{{api_key}}" },
                { key: "in", value: "header" },
              ],
            },
          },
        },
        {
          name: "Create user",
          event: [
            {
              listen: "prerequest",
              script: { exec: "pm.environment.set('ts', String(Date.now()));" },
            },
          ],
          request: {
            method: "POST",
            url: "{{base_url}}/users",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: '{"name":"Olgun"}',
              options: { raw: { language: "json" } },
            },
            auth: {
              type: "basic",
              basic: [
                { key: "username", value: "admin" },
                { key: "password", value: "secret" },
              ],
            },
          },
        },
      ],
    },
    {
      name: "Form post",
      request: {
        method: "POST",
        url: "https://example.test/form",
        body: {
          mode: "urlencoded",
          urlencoded: [
            { key: "k1", value: "v1" },
            { key: "k2", value: "v 2", disabled: false },
          ],
        },
      },
    },
  ],
};

describe("parsePostmanV2 — top-level info", () => {
  it("captures name + counts", () => {
    const r = parsePostmanV2(SAMPLE);
    expect(r.collectionName).toBe("Demo");
    expect(r.requestCount).toBe(4);
    expect(r.folderCount).toBe(1);
  });

  it("collects enabled variables into envVars; skips disabled", () => {
    const r = parsePostmanV2(SAMPLE);
    expect(r.envVars).toEqual({
      base_url: "https://api.example.com",
      api_key: "abc123",
    });
    expect(r.envVars.deprecated).toBeUndefined();
  });
});

describe("parsePostmanV2 — folder + request tree", () => {
  it("emits exactly one folder + 4 requests", () => {
    const r = parsePostmanV2(SAMPLE);
    const kinds = r.items.map((i) => i.kind).sort();
    expect(kinds).toEqual(["folder", "request", "request", "request", "request"]);
  });

  it("nests requests under their parent folder", () => {
    const r = parsePostmanV2(SAMPLE);
    const folder = r.items.find((i) => i.kind === "folder")!;
    const children = r.items.filter((i) => i.parentId === folder.id);
    expect(children.map((c) => c.name).sort()).toEqual(["Create user", "List users"]);
  });

  it("preserves order via the `order` field", () => {
    const r = parsePostmanV2(SAMPLE);
    const folder = r.items.find((i) => i.kind === "folder")!;
    const children = r.items
      .filter((i) => i.parentId === folder.id)
      .sort((a, b) => a.order - b.order);
    expect(children.map((c) => c.name)).toEqual(["List users", "Create user"]);
  });
});

describe("parsePostmanV2 — request mapping", () => {
  it("captures method + url from raw + header + auth", () => {
    const r = parsePostmanV2(SAMPLE);
    const health = r.items.find((i) => i.name === "Health" && i.kind === "request")!;
    expect(health.request?.method).toBe("GET");
    expect(health.request?.url).toBe("{{base_url}}/health");
    expect(health.request?.headers).toEqual([
      { enabled: true, k: "Accept", v: "application/json" },
    ]);
    // Auth inherited from collection-level bearer
    expect(health.request?.auth).toEqual({ type: "bearer", token: "{{token}}" });
  });

  it("apikey auth maps to apikey/header", () => {
    const r = parsePostmanV2(SAMPLE);
    const list = r.items.find((i) => i.name === "List users")!;
    expect(list.request?.auth).toEqual({
      type: "apikey",
      header: "X-Api-Key",
      value: "{{api_key}}",
    });
  });

  it("basic auth maps to user + pass", () => {
    const r = parsePostmanV2(SAMPLE);
    const create = r.items.find((i) => i.name === "Create user")!;
    expect(create.request?.auth).toEqual({
      type: "basic",
      user: "admin",
      pass: "secret",
    });
  });

  it("query parameters become params rows", () => {
    const r = parsePostmanV2(SAMPLE);
    const list = r.items.find((i) => i.name === "List users")!;
    expect(list.request?.params).toEqual([{ enabled: true, k: "limit", v: "10" }]);
  });
});

describe("parsePostmanV2 — body mapping", () => {
  it("raw + json language → body.mode=json", () => {
    const r = parsePostmanV2(SAMPLE);
    const create = r.items.find((i) => i.name === "Create user")!;
    expect(create.request?.body).toEqual({
      mode: "json",
      text: '{"name":"Olgun"}',
    });
  });

  it("urlencoded body → body.mode=form with encoded text", () => {
    const r = parsePostmanV2(SAMPLE);
    const form = r.items.find((i) => i.name === "Form post")!;
    expect(form.request?.body.mode).toBe("form");
    expect(form.request?.body.text).toBe("k1=v1&k2=v%202");
  });
});

describe("parsePostmanV2 — script mapping", () => {
  it("test event → postScript", () => {
    const r = parsePostmanV2(SAMPLE);
    const list = r.items.find((i) => i.name === "List users")!;
    expect(list.request?.postScript).toContain("pm.test");
    expect(list.request?.postScript).toContain("equal(200)");
    expect(list.request?.preScript).toBeUndefined();
  });

  it("prerequest event → preScript", () => {
    const r = parsePostmanV2(SAMPLE);
    const create = r.items.find((i) => i.name === "Create user")!;
    expect(create.request?.preScript).toContain("pm.environment.set");
    expect(create.request?.postScript).toBeUndefined();
  });
});

describe("parsePostmanV2 — input forms", () => {
  it("accepts a JSON string", () => {
    const r = parsePostmanV2(JSON.stringify(SAMPLE));
    expect(r.collectionName).toBe("Demo");
    expect(r.requestCount).toBe(4);
  });

  it("rejects non-collection JSON", () => {
    expect(() => parsePostmanV2({ info: { schema: "https://example.com/other" } })).toThrow(
      /Not a Postman collection/
    );
  });

  it("rejects non-object input", () => {
    expect(() => parsePostmanV2("null")).toThrow();
  });

  it("handles a request whose value is just a URL string", () => {
    const r = parsePostmanV2({
      info: {
        name: "X",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [{ name: "ping", request: "https://example.test/ping" }],
    });
    expect(r.requestCount).toBe(1);
    const ping = r.items[0];
    expect(ping.request?.url).toBe("https://example.test/ping");
    expect(ping.request?.method).toBe("GET");
  });
});

describe("parsePostmanV2 — warnings", () => {
  it("flags formdata as imported-as-text", () => {
    const r = parsePostmanV2({
      info: {
        name: "X",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "upload",
          request: {
            method: "POST",
            url: "https://example.test/u",
            body: {
              mode: "formdata",
              formdata: [{ key: "file", type: "file", src: "x.png" }],
            },
          },
        },
      ],
    });
    expect(r.warnings.some((w) => /formdata/i.test(w))).toBe(true);
  });

  it("flags unknown auth types", () => {
    const r = parsePostmanV2({
      info: {
        name: "X",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "weird",
          request: {
            method: "GET",
            url: "https://example.test/w",
            auth: { type: "ntlm" },
          },
        },
      ],
    });
    expect(r.warnings.some((w) => /ntlm|not supported/i.test(w))).toBe(true);
  });
});
