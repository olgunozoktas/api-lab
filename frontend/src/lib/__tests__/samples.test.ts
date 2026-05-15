/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { SAMPLES, findSample, matchSamplesByQuery } from "../samples";
import { en as enDict } from "../i18n/en";
import { tr as trDict } from "../i18n/tr";

const en: Record<string, string> = enDict as unknown as Record<string, string>;
const tr: Record<string, string> = trDict as unknown as Record<string, string>;

describe("samples manifest", () => {
  it("contains at least one sample per supported protocol", () => {
    const kinds = new Set(SAMPLES.map((s) => s.kind));
    for (const k of ["http", "graphql", "ws", "sse", "grpc"] as const) {
      expect(kinds.has(k), `missing kind: ${k}`).toBe(true);
    }
  });

  it("has unique stable ids", () => {
    const ids = SAMPLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("HTTP / GraphQL samples carry a method; ws / sse / grpc do not require one", () => {
    for (const s of SAMPLES) {
      if (s.kind === "http" || s.kind === "graphql") {
        expect(s.method, `${s.id} should have a method`).toBeTruthy();
      }
    }
  });

  it("URLs parse — HTTP / GraphQL via URL ctor, streaming kinds via prefix", () => {
    for (const s of SAMPLES) {
      if (s.kind === "http" || s.kind === "graphql") {
        expect(() => new URL(s.url), `${s.id} URL should parse`).not.toThrow();
      } else if (s.kind === "ws") {
        expect(s.url.startsWith("ws://") || s.url.startsWith("wss://")).toBe(true);
      } else if (s.kind === "sse") {
        // api-lab uses sse:// / sses:// as marker schemes (lib/sse.ts).
        expect(s.url.startsWith("sse://") || s.url.startsWith("sses://")).toBe(true);
      } else if (s.kind === "grpc") {
        // grpc:// / grpcs:// trigger the gRPC composer (lib/grpc.ts).
        expect(s.url.startsWith("grpc://") || s.url.startsWith("grpcs://")).toBe(true);
      }
    }
  });

  it("every i18n key referenced by a sample exists in both en and tr", () => {
    for (const s of SAMPLES) {
      expect(en[s.nameKey], `en missing ${s.nameKey}`).toBeTruthy();
      expect(en[s.descriptionKey], `en missing ${s.descriptionKey}`).toBeTruthy();
      expect(tr[s.nameKey], `tr missing ${s.nameKey}`).toBeTruthy();
      expect(tr[s.descriptionKey], `tr missing ${s.descriptionKey}`).toBeTruthy();
    }
    expect(en["samples.section.title"]).toBeTruthy();
    expect(tr["samples.section.title"]).toBeTruthy();
    expect(en["samples.section.publicHint"]).toBeTruthy();
    expect(tr["samples.section.publicHint"]).toBeTruthy();
  });
});

describe("findSample()", () => {
  it("returns the entry by id", () => {
    expect(findSample("sample-http-get")?.kind).toBe("http");
  });

  it("returns undefined for unknown id", () => {
    expect(findSample("sample-does-not-exist")).toBeUndefined();
  });
});

describe("matchSamplesByQuery()", () => {
  it("empty query returns all samples", () => {
    expect(matchSamplesByQuery("").length).toBe(SAMPLES.length);
    expect(matchSamplesByQuery("   ").length).toBe(SAMPLES.length);
  });

  it("matches by kind", () => {
    const hits = matchSamplesByQuery("ws");
    expect(hits.some((s) => s.id === "sample-ws-echo")).toBe(true);
  });

  it("matches multi-token queries (AND across tokens)", () => {
    const hits = matchSamplesByQuery("ws echo");
    expect(hits.some((s) => s.id === "sample-ws-echo")).toBe(true);
  });

  it("returns empty for nonsense queries", () => {
    expect(matchSamplesByQuery("xyzzy-no-such-thing").length).toBe(0);
  });

  it("matches the i18n key fragment", () => {
    const hits = matchSamplesByQuery("graphql");
    expect(hits.some((s) => s.kind === "graphql")).toBe(true);
  });
});
