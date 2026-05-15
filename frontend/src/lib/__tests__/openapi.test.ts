/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect, beforeEach } from "vitest";
import {
  parseOpenApi,
  isOpenApiSpec,
  parseSpecText,
  __resetIdSeqForTesting,
} from "../importers/openapi";

beforeEach(() => {
  __resetIdSeqForTesting();
});

// A realistic OAS 3.0 doc: a server with a variable, two security
// schemes, a $ref'd parameter, operations across one tag plus an
// untagged one, a JSON requestBody, and a path parameter.
const SPEC = {
  openapi: "3.0.3",
  info: { title: "Demo API", version: "1.0.0" },
  servers: [{ url: "https://{host}/v1", variables: { host: { default: "api.example.com" } } }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
    parameters: {
      PageParam: {
        name: "page",
        in: "query",
        required: false,
        schema: { type: "integer", default: 1 },
      },
    },
  },
  paths: {
    "/users": {
      get: {
        summary: "List users",
        tags: ["Users"],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { name: "X-Trace", in: "header", required: true, example: "abc" },
        ],
      },
      post: {
        summary: "Create user",
        tags: ["Users"],
        security: [{ apiKeyAuth: [] }],
        requestBody: { content: { "application/json": { example: { name: "alice" } } } },
      },
    },
    "/users/{id}": { get: { operationId: "getUser", tags: ["Users"] } },
    "/health": { get: { summary: "Health" } },
  },
};

const YAML_SPEC = `openapi: 3.0.0
info:
  title: YAML API
paths:
  /ping:
    get:
      summary: Ping
`;

describe("isOpenApiSpec", () => {
  it("accepts OAS 3.0 and 3.1", () => {
    expect(isOpenApiSpec(SPEC)).toBe(true);
    expect(isOpenApiSpec({ openapi: "3.1.0", paths: {} })).toBe(true);
  });

  it("rejects Swagger 2.0, missing paths, and non-objects", () => {
    expect(isOpenApiSpec({ swagger: "2.0", paths: {} })).toBe(false);
    expect(isOpenApiSpec({ openapi: "3.0.0" })).toBe(false);
    expect(isOpenApiSpec(null)).toBe(false);
    expect(isOpenApiSpec("openapi")).toBe(false);
  });
});

describe("parseSpecText", () => {
  it("parses JSON and YAML", () => {
    expect(parseSpecText('{"a":1}')).toEqual({ a: 1 });
    expect(parseSpecText("a: 1\nb: 2")).toEqual({ a: 1, b: 2 });
  });
});

describe("parseOpenApi", () => {
  it("returns info.title + operation/folder counts", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    expect(r.collectionName).toBe("Demo API");
    expect(r.requestCount).toBe(4);
    expect(r.folderCount).toBe(1);
  });

  it("emits one request per operation, grouped into a tag folder", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const folder = r.items.find((i) => i.kind === "folder" && i.name === "Users");
    expect(folder).toBeDefined();
    const listUsers = r.items.find((i) => i.name === "List users")!;
    expect(listUsers.parentId).toBe(folder!.id);
    // The untagged /health operation lands at the root.
    const health = r.items.find((i) => i.name === "Health")!;
    expect(health.parentId).toBeNull();
  });

  it("builds the URL from servers[0].url with variables substituted", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const listUsers = r.items.find((i) => i.name === "List users")!;
    expect(listUsers.request!.url).toBe("https://api.example.com/v1/users");
  });

  it("substitutes path params {id} → :id", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const getUser = r.items.find((i) => i.name === "getUser")!;
    expect(getUser.request!.url).toBe("https://api.example.com/v1/users/:id");
  });

  it("maps query + header params, required flag → enabled", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const listUsers = r.items.find((i) => i.name === "List users")!.request!;
    const page = listUsers.params.find((p) => p.k === "page")!;
    expect(page.enabled).toBe(false); // not required
    expect(page.v).toBe("1"); // schema.default
    const trace = listUsers.headers.find((h) => h.k === "X-Trace")!;
    expect(trace.enabled).toBe(true);
    expect(trace.v).toBe("abc");
  });

  it("maps a JSON requestBody example and adds a Content-Type header", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const create = r.items.find((i) => i.name === "Create user")!.request!;
    expect(create.body.mode).toBe("json");
    expect(JSON.parse(create.body.text)).toEqual({ name: "alice" });
    expect(create.headers.find((h) => h.k === "Content-Type")?.v).toBe("application/json");
  });

  it("stubs auth from the global security scheme (bearer)", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const listUsers = r.items.find((i) => i.name === "List users")!.request!;
    expect(listUsers.auth).toMatchObject({ type: "bearer", token: "" });
  });

  it("lets operation-level security override the global one (apikey)", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const create = r.items.find((i) => i.name === "Create user")!.request!;
    expect(create.auth).toMatchObject({ type: "apikey", header: "X-API-Key", value: "" });
  });

  it("resolves local $ref parameters", () => {
    const r = parseOpenApi(JSON.stringify(SPEC));
    const listUsers = r.items.find((i) => i.name === "List users")!.request!;
    // `page` only exists if the #/components/parameters/PageParam ref resolved.
    expect(listUsers.params.some((p) => p.k === "page")).toBe(true);
  });

  it("skips external $refs with a warning", () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Ext" },
      paths: {
        "/x": { get: { parameters: [{ $ref: "https://other.example.com/defs.yaml#/Param" }] } },
      },
    };
    const r = parseOpenApi(JSON.stringify(spec));
    expect(r.warnings.some((w) => w.includes("external $ref"))).toBe(true);
  });

  it("parses a YAML spec", () => {
    const r = parseOpenApi(YAML_SPEC);
    expect(r.collectionName).toBe("YAML API");
    expect(r.requestCount).toBe(1);
    expect(r.folderCount).toBe(0);
    expect(r.items[0].request!.method).toBe("GET");
  });

  it("falls back to operationId then METHOD+path for the request name", () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Names" },
      paths: { "/a": { get: {} }, "/b": { post: { operationId: "doB" } } },
    };
    const r = parseOpenApi(JSON.stringify(spec));
    expect(r.items.some((i) => i.name === "GET /a")).toBe(true);
    expect(r.items.some((i) => i.name === "doB")).toBe(true);
  });

  it("throws on a non-OpenAPI document", () => {
    expect(() => parseOpenApi(JSON.stringify({ swagger: "2.0", paths: {} }))).toThrow(/OpenAPI/);
    expect(() => parseOpenApi("[1,2,3]")).toThrow(/OpenAPI/);
  });
});
