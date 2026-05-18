/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { buildCuratedItems } from "../curated/build";
import { cloudflareCurated } from "../curated/cloudflare";
import { stripeCurated } from "../curated/stripe";
import type { CuratedProvider } from "../curated/types";

const SAMPLE: CuratedProvider = {
  baseUrl: "https://api.example.com/v1",
  endpoints: [
    { group: "Users", name: "List users", method: "GET", path: "/users" },
    { group: "Users", name: "Create user", method: "POST", path: "/users" },
    { name: "Health check", method: "GET", path: "/health" },
    { group: "Billing", name: "List invoices", method: "GET", path: "/invoices" },
  ],
};

describe("buildCuratedItems", () => {
  it("emits one request item per endpoint", () => {
    const { items, requestCount } = buildCuratedItems(SAMPLE);
    const requests = items.filter((i) => i.kind === "request");
    expect(requests).toHaveLength(4);
    expect(requestCount).toBe(4);
  });

  it("creates one folder per distinct group, in first-seen order", () => {
    const { items, folderCount } = buildCuratedItems(SAMPLE);
    const folders = items.filter((i) => i.kind === "folder");
    expect(folders.map((f) => f.name)).toEqual(["Users", "Billing"]);
    expect(folderCount).toBe(2);
  });

  it("parents grouped requests under their folder and shares one folder per group", () => {
    const { items } = buildCuratedItems(SAMPLE);
    const usersFolder = items.find((i) => i.kind === "folder" && i.name === "Users")!;
    const usersRequests = items.filter(
      (i) => i.kind === "request" && i.parentId === usersFolder.id
    );
    expect(usersRequests.map((r) => r.name)).toEqual(["List users", "Create user"]);
  });

  it("leaves ungrouped endpoints at the root (parentId null)", () => {
    const { items } = buildCuratedItems(SAMPLE);
    const health = items.find((i) => i.name === "Health check")!;
    expect(health.parentId).toBeNull();
  });

  it("joins baseUrl + path into the request URL and carries the method", () => {
    const { items } = buildCuratedItems(SAMPLE);
    const create = items.find((i) => i.name === "Create user")!;
    expect(create.request?.url).toBe("https://api.example.com/v1/users");
    expect(create.request?.method).toBe("POST");
  });

  it("assigns unique ids across every item", () => {
    const { items } = buildCuratedItems(SAMPLE);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handles a provider with no endpoints", () => {
    const empty = buildCuratedItems({ baseUrl: "https://x", endpoints: [] });
    expect(empty.items).toHaveLength(0);
    expect(empty.requestCount).toBe(0);
    expect(empty.folderCount).toBe(0);
  });
});

describe("shipped curated providers", () => {
  it("Cloudflare builds a sane, non-empty collection", () => {
    const { requestCount, folderCount } = buildCuratedItems(cloudflareCurated);
    expect(requestCount).toBeGreaterThan(8);
    expect(requestCount).toBeLessThan(40);
    expect(folderCount).toBeGreaterThan(0);
  });

  it("Stripe builds a sane, non-empty collection", () => {
    const { requestCount, folderCount } = buildCuratedItems(stripeCurated);
    expect(requestCount).toBeGreaterThan(8);
    expect(requestCount).toBeLessThan(40);
    expect(folderCount).toBeGreaterThan(0);
  });

  it("every curated endpoint has an absolute https URL", () => {
    for (const provider of [cloudflareCurated, stripeCurated]) {
      const { items } = buildCuratedItems(provider);
      for (const it of items.filter((i) => i.kind === "request")) {
        expect(it.request?.url).toMatch(/^https:\/\//);
      }
    }
  });
});
