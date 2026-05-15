/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect, beforeEach } from "vitest";
import { parseBruno, isBrunoFile, __resetIdSeqForTesting } from "../importers/bruno";

beforeEach(() => {
  __resetIdSeqForTesting();
});

// A realistic Bruno-serialized POST request: meta + method block,
// headers (one disabled), query params (one disabled), bearer auth,
// and a JSON body with its own nested braces.
const POST_SAMPLE = `meta {
  name: Create User
  type: http
  seq: 1
}

post {
  url: https://api.example.com/users
  body: json
  auth: bearer
}

headers {
  Accept: application/json
  Content-Type: application/json
  ~X-Debug: true
}

query {
  notify: true
  ~verbose: 1
}

auth:bearer {
  token: {{authToken}}
}

body:json {
  {
    "name": "alice",
    "tags": ["a", "b"]
  }
}
`;

// A GET with basic auth and no body.
const GET_BASIC = `meta {
  name: Health Check
  type: http
}

get {
  url: https://api.example.com/health
  auth: basic
}

auth:basic {
  username: admin
  password: s3cret
}
`;

describe("isBrunoFile", () => {
  it("accepts a .bru file with meta + method blocks", () => {
    expect(isBrunoFile(POST_SAMPLE)).toBe(true);
    expect(isBrunoFile(GET_BASIC)).toBe(true);
  });

  it("accepts a .bru file with only a method block (no meta)", () => {
    expect(isBrunoFile("get {\n  url: https://x.test\n}\n")).toBe(true);
  });

  it("rejects JSON (Postman / Insomnia / HAR) and empty input", () => {
    expect(isBrunoFile('{"info":{"name":"Postman"}}')).toBe(false);
    expect(isBrunoFile('{\n  "_type": "export"\n}')).toBe(false);
    expect(isBrunoFile("[]")).toBe(false);
    expect(isBrunoFile("")).toBe(false);
    expect(isBrunoFile("   \n  ")).toBe(false);
    expect(isBrunoFile("just some prose, no blocks")).toBe(false);
  });
});

describe("parseBruno", () => {
  it("returns the request name + single-request counts", () => {
    const r = parseBruno(POST_SAMPLE);
    expect(r.collectionName).toBe("Create User");
    expect(r.requestCount).toBe(1);
    expect(r.folderCount).toBe(0);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].kind).toBe("request");
    expect(r.items[0].parentId).toBeNull();
  });

  it("maps method + url from the method block", () => {
    const snap = parseBruno(POST_SAMPLE).items[0].request!;
    expect(snap.method).toBe("POST");
    expect(snap.url).toBe("https://api.example.com/users");
  });

  it("maps headers and respects the ~disabled prefix", () => {
    const headers = parseBruno(POST_SAMPLE).items[0].request!.headers;
    expect(headers.find((h) => h.k === "Accept")?.enabled).toBe(true);
    expect(headers.find((h) => h.k === "Content-Type")?.v).toBe("application/json");
    expect(headers.find((h) => h.k === "X-Debug")?.enabled).toBe(false);
  });

  it("maps query params and respects the ~disabled prefix", () => {
    const params = parseBruno(POST_SAMPLE).items[0].request!.params;
    expect(params.find((p) => p.k === "notify")?.v).toBe("true");
    expect(params.find((p) => p.k === "verbose")?.enabled).toBe(false);
  });

  it("maps bearer auth", () => {
    const auth = parseBruno(POST_SAMPLE).items[0].request!.auth;
    expect(auth).toMatchObject({ type: "bearer", token: "{{authToken}}" });
  });

  it("maps basic auth", () => {
    const auth = parseBruno(GET_BASIC).items[0].request!.auth;
    expect(auth).toMatchObject({ type: "basic", user: "admin", pass: "s3cret" });
  });

  it("maps apikey auth (header placement)", () => {
    const src = `meta {
  name: Keyed
  type: http
}

get {
  url: https://x.test
  auth: apikey
}

auth:apikey {
  key: X-Api-Key
  value: abc123
  placement: header
}
`;
    const auth = parseBruno(src).items[0].request!.auth;
    expect(auth).toMatchObject({ type: "apikey", header: "X-Api-Key", value: "abc123" });
  });

  it("warns when apikey placement is not header", () => {
    const src = `get {
  url: https://x.test
  auth: apikey
}

auth:apikey {
  key: api_key
  value: abc
  placement: queryparams
}
`;
    const r = parseBruno(src);
    expect(r.warnings.some((w) => w.includes("placement"))).toBe(true);
  });

  it("maps a JSON body verbatim, dedented past Bruno's indentation", () => {
    const body = parseBruno(POST_SAMPLE).items[0].request!.body;
    expect(body.mode).toBe("json");
    expect(JSON.parse(body.text)).toEqual({ name: "alice", tags: ["a", "b"] });
  });

  it("maps a text body as raw", () => {
    const src = `meta {
  name: Plain
  type: http
}

post {
  url: https://x.test
  body: text
}

body:text {
  hello world
}
`;
    const body = parseBruno(src).items[0].request!.body;
    expect(body.mode).toBe("raw");
    expect(body.text).toBe("hello world");
  });

  it("warns and skips multipart + graphql bodies", () => {
    const multipart = parseBruno(`post {
  url: https://x.test
  body: multipart-form
}
`);
    expect(multipart.items[0].request!.body.mode).toBe("none");
    expect(multipart.warnings.some((w) => w.includes("multipart"))).toBe(true);

    const graphql = parseBruno(`post {
  url: https://x.test
  body: graphql
}
`);
    expect(graphql.warnings.some((w) => w.includes("graphql"))).toBe(true);
  });

  it("falls back to the URL when meta.name is absent", () => {
    const r = parseBruno("get {\n  url: https://api.example.com/ping\n}\n");
    expect(r.collectionName).toBe("https://api.example.com/ping");
  });

  it("warns on a params:path block", () => {
    const src = `get {
  url: https://api.example.com/users/:id
}

params:path {
  id: 1
}
`;
    expect(parseBruno(src).warnings.some((w) => w.includes("path params"))).toBe(true);
  });

  it("warns on an unterminated block", () => {
    const src = `meta {
  name: Broken
  type: http
}

get {
  url: https://x.test
`;
    expect(parseBruno(src).warnings.some((w) => w.includes("not closed"))).toBe(true);
  });

  it("throws on non-Bruno input", () => {
    expect(() => parseBruno('{"hello":"world"}')).toThrow(/Bruno/);
    expect(() => parseBruno("")).toThrow(/Bruno/);
  });
});
