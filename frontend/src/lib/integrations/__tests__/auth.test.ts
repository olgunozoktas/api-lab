/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { scaffoldAuth, applyAuthToItems } from "../auth";
import type { CollectionItem } from "../../types";

describe("scaffoldAuth", () => {
  it("bearer → empty token", () => {
    expect(scaffoldAuth("bearer")).toEqual({ type: "bearer", token: "" });
  });

  it("apikey → header name + empty value", () => {
    const a = scaffoldAuth("apikey");
    expect(a.type).toBe("apikey");
    expect(a.header).toBeTruthy();
    expect(a.value).toBe("");
  });

  it("aws-sigv4 → sigv4 block with a default region", () => {
    const a = scaffoldAuth("aws-sigv4");
    expect(a.type).toBe("aws-sigv4");
    expect(a.awsSigv4?.region).toBe("us-east-1");
  });

  it("unsupported type falls back to none", () => {
    expect(scaffoldAuth("oauth2").type).toBe("none");
    expect(scaffoldAuth("mtls").type).toBe("none");
  });
});

describe("applyAuthToItems", () => {
  it("sets auth on request nodes and leaves folders untouched", () => {
    const items: CollectionItem[] = [
      { id: "f", parentId: null, kind: "folder", order: 0, name: "F" },
      {
        id: "r",
        parentId: "f",
        kind: "request",
        order: 0,
        name: "R",
        request: {
          method: "GET",
          url: "/x",
          params: [],
          headers: [],
          auth: { type: "none" },
          body: { mode: "none", text: "" },
          gql: { query: "", vars: "" },
          isGraphql: false,
        },
      },
    ];
    const out = applyAuthToItems(items, "bearer");
    expect(out[0].request).toBeUndefined();
    expect(out[1].request?.auth).toEqual({ type: "bearer", token: "" });
  });
});
