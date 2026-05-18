/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { buildCuratedItems } from "../curated/build";
import { INTEGRATIONS } from "../registry";
import { cloudflareCurated } from "../curated/cloudflare";
import { stripeCurated } from "../curated/stripe";
import { linearCurated } from "../curated/linear";
import type { CuratedProvider } from "../curated/types";

// Every curated provider shipped in the registry.
const CURATED_PROVIDERS = INTEGRATIONS.flatMap((def) =>
  def.fetch.kind === "curated" ? [{ name: def.name, provider: def.fetch.provider }] : []
);

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

describe("graphql endpoints", () => {
  it("marks a graphql endpoint isGraphql and forces POST", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com/graphql",
      endpoints: [{ name: "GraphQL", method: "GET", path: "", graphql: true }],
    });
    const req = items.find((i) => i.kind === "request")!;
    expect(req.request?.isGraphql).toBe(true);
    expect(req.request?.method).toBe("POST");
  });

  it("leaves REST endpoints as plain HTTP requests", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com",
      endpoints: [{ name: "Ping", method: "GET", path: "/ping" }],
    });
    const req = items.find((i) => i.kind === "request")!;
    expect(req.request?.isGraphql).toBeUndefined();
  });

  it("seeds gql.query from a curated graphqlQuery on a graphql endpoint", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com/graphql",
      endpoints: [
        { name: "GQL", method: "POST", path: "", graphql: true, graphqlQuery: "query { me }" },
      ],
    });
    expect(items.find((i) => i.kind === "request")!.request?.gql.query).toBe("query { me }");
  });

  it("leaves gql.query empty for a REST endpoint even if graphqlQuery is set", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com",
      endpoints: [{ name: "Get", method: "GET", path: "/g", graphqlQuery: "query { me }" }],
    });
    expect(items.find((i) => i.kind === "request")!.request?.gql.query).toBe("");
  });
});

describe("body skeletons + descriptions", () => {
  it("seeds the request body from a curated `body` skeleton", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com",
      endpoints: [
        {
          name: "Create",
          method: "POST",
          path: "/things",
          body: { mode: "json", text: '{"a":1}' },
        },
      ],
    });
    const req = items.find((i) => i.kind === "request")!;
    expect(req.request?.body).toEqual({ mode: "json", text: '{"a":1}' });
  });

  it("supports form-mode bodies (e.g. Stripe)", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com",
      endpoints: [
        { name: "Create", method: "POST", path: "/c", body: { mode: "form", text: "a=1&b=2" } },
      ],
    });
    expect(items.find((i) => i.kind === "request")!.request?.body).toEqual({
      mode: "form",
      text: "a=1&b=2",
    });
  });

  it("leaves the body empty (mode none) when no skeleton is given", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com",
      endpoints: [{ name: "Get", method: "GET", path: "/g" }],
    });
    expect(items.find((i) => i.kind === "request")!.request?.body).toEqual({
      mode: "none",
      text: "",
    });
  });

  it("ignores a body skeleton on a graphql endpoint", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com/graphql",
      endpoints: [
        {
          name: "GraphQL",
          method: "POST",
          path: "",
          graphql: true,
          body: { mode: "json", text: '{"a":1}' },
        },
      ],
    });
    expect(items.find((i) => i.kind === "request")!.request?.body).toEqual({
      mode: "none",
      text: "",
    });
  });

  it("stamps a curated `description` onto the request item", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com",
      endpoints: [{ name: "Get", method: "GET", path: "/g", description: "Fetch a thing." }],
    });
    expect(items.find((i) => i.kind === "request")!.description).toBe("Fetch a thing.");
  });

  it("leaves description undefined when the endpoint has none", () => {
    const { items } = buildCuratedItems({
      baseUrl: "https://api.example.com",
      endpoints: [{ name: "Get", method: "GET", path: "/g" }],
    });
    expect(items.find((i) => i.kind === "request")!.description).toBeUndefined();
  });
});

describe("shipped curated providers", () => {
  it.each(CURATED_PROVIDERS)("$name builds a sane, non-empty collection", ({ provider }) => {
    const { requestCount } = buildCuratedItems(provider);
    expect(requestCount).toBeGreaterThan(0);
    expect(requestCount).toBeLessThan(40);
  });

  it("Cloudflare and Stripe are grouped into sub-folders", () => {
    for (const provider of [cloudflareCurated, stripeCurated]) {
      expect(buildCuratedItems(provider).folderCount).toBeGreaterThan(0);
    }
  });

  it("every curated endpoint has an absolute https URL", () => {
    for (const { provider } of CURATED_PROVIDERS) {
      const { items } = buildCuratedItems(provider);
      for (const it of items.filter((i) => i.kind === "request")) {
        expect(it.request?.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("Cloudflare ships JSON body skeletons + descriptions", () => {
    const { items } = buildCuratedItems(cloudflareCurated);
    const createDns = items.find((i) => i.name === "Create DNS record")!;
    expect(createDns.request?.body.mode).toBe("json");
    expect(createDns.request?.body.text).toContain('"type"');
    // Every Cloudflare endpoint carries a hover description.
    for (const it of items.filter((i) => i.kind === "request")) {
      expect(it.description).toBeTruthy();
    }
  });

  it("Stripe ships form-mode body skeletons (not JSON)", () => {
    const { items } = buildCuratedItems(stripeCurated);
    const createCustomer = items.find((i) => i.name === "Create customer")!;
    expect(createCustomer.request?.body.mode).toBe("form");
    expect(createCustomer.request?.body.text).toContain("email=");
  });

  it("Linear ships as a single GraphQL endpoint with a starter query", () => {
    const { items } = buildCuratedItems(linearCurated);
    const requests = items.filter((i) => i.kind === "request");
    expect(requests).toHaveLength(1);
    expect(requests[0].request?.isGraphql).toBe(true);
    expect(requests[0].request?.gql.query).toContain("viewer");
  });

  it("every curated endpoint carries a hover description", () => {
    for (const { provider } of CURATED_PROVIDERS) {
      for (const it of buildCuratedItems(provider).items.filter((i) => i.kind === "request")) {
        expect(it.description).toBeTruthy();
      }
    }
  });

  it.each(["GitHub", "OpenAI", "Slack", "Notion"])(
    "%s ships JSON body skeletons on its write endpoints",
    (name) => {
      const provider = CURATED_PROVIDERS.find((p) => p.name === name)!.provider;
      const withBody = buildCuratedItems(provider).items.filter(
        (i) => i.kind === "request" && i.request?.body.mode === "json"
      );
      // Each of these providers has at least one JSON write endpoint.
      expect(withBody.length).toBeGreaterThan(0);
      for (const it of withBody) {
        // A JSON skeleton must be parseable.
        expect(() => JSON.parse(it.request!.body.text)).not.toThrow();
      }
    }
  );
});
