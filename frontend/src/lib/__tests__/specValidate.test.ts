/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { validateSpec } from "../specValidate";

const VALID = {
  openapi: "3.0.3",
  info: { title: "Demo", version: "1.0.0" },
  paths: {
    "/users": {
      get: { operationId: "listUsers", responses: { "200": { description: "ok" } } },
    },
  },
};

const errs = (doc: unknown) => validateSpec(doc).filter((i) => i.severity === "error");
const warns = (doc: unknown) => validateSpec(doc).filter((i) => i.severity === "warning");

describe("validateSpec", () => {
  it("returns no issues for a well-formed spec", () => {
    expect(validateSpec(VALID)).toEqual([]);
  });

  it("flags a non-object document", () => {
    expect(errs("hello").length).toBe(1);
    expect(errs(null).length).toBe(1);
  });

  it("flags a missing or non-3.x openapi version", () => {
    expect(errs({ ...VALID, openapi: undefined }).some((i) => i.path === "openapi")).toBe(true);
    expect(errs({ ...VALID, openapi: "2.0" }).some((i) => i.path === "openapi")).toBe(true);
  });

  it("flags a missing info.title and warns on missing info.version", () => {
    expect(
      errs({ ...VALID, info: { version: "1.0.0" } }).some((i) => i.path === "info.title")
    ).toBe(true);
    expect(warns({ ...VALID, info: { title: "X" } }).some((i) => i.path === "info.version")).toBe(
      true
    );
  });

  it("flags a missing info object", () => {
    const d = { openapi: "3.0.0", paths: {} };
    expect(errs(d).some((i) => i.path === "info")).toBe(true);
  });

  it("flags a missing paths object", () => {
    expect(
      errs({ openapi: "3.0.0", info: { title: "X", version: "1" } }).some((i) => i.path === "paths")
    ).toBe(true);
  });

  it("warns on an empty paths object", () => {
    expect(warns({ ...VALID, paths: {} }).some((i) => i.message.includes("no paths"))).toBe(true);
  });

  it("warns on a path key that doesn't start with /", () => {
    const d = { ...VALID, paths: { users: { get: { responses: { "200": {} } } } } };
    expect(warns(d).some((i) => i.message.includes('should start with "/"'))).toBe(true);
  });

  it("warns on an operation with no responses", () => {
    const d = { ...VALID, paths: { "/x": { get: {} } } };
    expect(warns(d).some((i) => i.message.includes("no responses"))).toBe(true);
  });

  it("flags duplicate operationIds", () => {
    const d = {
      ...VALID,
      paths: {
        "/a": { get: { operationId: "dup", responses: { "200": {} } } },
        "/b": { get: { operationId: "dup", responses: { "200": {} } } },
      },
    };
    expect(errs(d).some((i) => i.message.includes("Duplicate operationId"))).toBe(true);
  });

  it("flags an unresolved local $ref", () => {
    const d = {
      ...VALID,
      paths: {
        "/x": {
          get: {
            responses: { "200": {} },
            parameters: [{ $ref: "#/components/parameters/Missing" }],
          },
        },
      },
    };
    expect(errs(d).some((i) => i.message.includes("Unresolved $ref"))).toBe(true);
  });

  it("accepts a resolvable local $ref", () => {
    const d = {
      ...VALID,
      components: { parameters: { Page: { name: "page", in: "query" } } },
      paths: {
        "/x": {
          get: {
            responses: { "200": {} },
            parameters: [{ $ref: "#/components/parameters/Page" }],
          },
        },
      },
    };
    expect(errs(d).some((i) => i.message.includes("Unresolved $ref"))).toBe(false);
  });

  it("warns on a server entry without a url", () => {
    const d = { ...VALID, servers: [{ description: "no url here" }] };
    expect(warns(d).some((i) => i.message.includes("no `url`"))).toBe(true);
  });
});
