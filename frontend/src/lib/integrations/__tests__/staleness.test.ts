/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  specFingerprint,
  compareFingerprint,
  verdictFrom,
  checkSpecStaleness,
  type SpecProbe,
} from "../staleness";
import type { IntegrationDef } from "../registry";

const openapiDef: IntegrationDef = {
  id: "demo",
  name: "Demo",
  category: "Test",
  description: "",
  homepage: "",
  fetch: { kind: "openapi-url", specUrl: "https://demo.test/openapi.json" },
  authType: "none",
};

const curatedDef: IntegrationDef = {
  ...openapiDef,
  id: "curated-demo",
  fetch: { kind: "curated", provider: { baseUrl: "", endpoints: [] } },
};

describe("specFingerprint", () => {
  it("prefers the ETag when present", () => {
    expect(specFingerprint('"abc"', "Mon, 01 Jan 2026", "body")).toBe('etag:"abc"');
  });

  it("falls back to Last-Modified when there is no ETag", () => {
    expect(specFingerprint("", "Mon, 01 Jan 2026", "body")).toBe("lm:Mon, 01 Jan 2026");
  });

  it("falls back to a body hash when no validator header is sent", () => {
    const fp = specFingerprint("", "", "the spec body");
    expect(fp.startsWith("h:")).toBe(true);
  });

  it("the body hash is stable for identical bodies and differs for changed ones", () => {
    expect(specFingerprint("", "", "abc")).toBe(specFingerprint("", "", "abc"));
    expect(specFingerprint("", "", "abc")).not.toBe(specFingerprint("", "", "abd"));
  });
});

describe("compareFingerprint", () => {
  it("is fresh when equal, stale when different", () => {
    expect(compareFingerprint("etag:1", "etag:1")).toBe("fresh");
    expect(compareFingerprint("etag:1", "etag:2")).toBe("stale");
  });
});

describe("verdictFrom", () => {
  it("treats a 304 as fresh (server honored If-None-Match)", () => {
    expect(verdictFrom("etag:1", { status: 304, etag: "", lastModified: "", body: "" })).toBe(
      "fresh"
    );
  });

  it("is fresh when the live fingerprint matches", () => {
    expect(
      verdictFrom('etag:"v1"', { status: 200, etag: '"v1"', lastModified: "", body: "x" })
    ).toBe("fresh");
  });

  it("is stale when the live fingerprint differs", () => {
    expect(
      verdictFrom('etag:"v1"', { status: 200, etag: '"v2"', lastModified: "", body: "x" })
    ).toBe("stale");
  });

  it("is unreachable on a network error", () => {
    expect(verdictFrom("etag:1", { error: "offline" })).toBe("unreachable");
  });

  it("is unreachable on a 4xx/5xx so a flaky provider can't flap the badge", () => {
    expect(verdictFrom("etag:1", { status: 500, etag: "", lastModified: "", body: "" })).toBe(
      "unreachable"
    );
  });
});

describe("checkSpecStaleness", () => {
  const probeOk = (p: SpecProbe) => async () => p;

  it("short-circuits curated providers to fresh without probing", async () => {
    let probed = false;
    const v = await checkSpecStaleness(curatedDef, "etag:1", async () => {
      probed = true;
      return { error: "should not run" };
    });
    expect(v).toBe("fresh");
    expect(probed).toBe(false);
  });

  it("short-circuits to fresh when no fingerprint was ever captured", async () => {
    const v = await checkSpecStaleness(openapiDef, "", probeOk({ error: "x" }));
    expect(v).toBe("fresh");
  });

  it("reports stale when the upstream spec fingerprint moved", async () => {
    const v = await checkSpecStaleness(
      openapiDef,
      'etag:"v1"',
      probeOk({ status: 200, etag: '"v2"', lastModified: "", body: "x" })
    );
    expect(v).toBe("stale");
  });

  it("reports unreachable when the provider is down (no flap)", async () => {
    const v = await checkSpecStaleness(openapiDef, "etag:1", probeOk({ error: "timeout" }));
    expect(v).toBe("unreachable");
  });

  it("passes the stored ETag as If-None-Match for a conditional request", async () => {
    let seen = "";
    await checkSpecStaleness(openapiDef, 'etag:"abc"', async (_url, inm) => {
      seen = inm;
      return { status: 304, etag: "", lastModified: "", body: "" };
    });
    expect(seen).toBe('"abc"');
  });
});
