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
    // No hint → service is empty (user fills it in per request).
    expect(a.awsSigv4?.service).toBe("");
  });

  it("aws-sigv4 honours the sigv4Service hint", () => {
    // The AWS S3 integration pre-fills `service: "s3"` via this
    // hint — without it the user would have to type the service
    // name on every imported request.
    const a = scaffoldAuth("aws-sigv4", { sigv4Service: "s3" });
    expect(a.awsSigv4?.service).toBe("s3");
    const b = scaffoldAuth("aws-sigv4", { sigv4Service: "lambda" });
    expect(b.awsSigv4?.service).toBe("lambda");
  });

  it("hints are ignored for non-sigv4 auth types", () => {
    // Bearer / apikey / basic have no use for hints — they're fully
    // determined by the type. The contract is "hints are advisory".
    const a = scaffoldAuth("bearer", { sigv4Service: "ignored" });
    expect(a).toEqual({ type: "bearer", token: "" });
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

  it("threads authHints into every request's scaffolded auth", () => {
    const items: CollectionItem[] = [
      {
        id: "r",
        parentId: null,
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
    const out = applyAuthToItems(items, "aws-sigv4", { sigv4Service: "s3" });
    expect(out[0].request?.auth.awsSigv4?.service).toBe("s3");
  });
});
