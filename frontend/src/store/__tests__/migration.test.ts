import { describe, it, expect } from "vitest";
import { migrateV1toV2, migrateV2toV3 } from "../internal";
import type { CoreState } from "../internal";

describe("store persist migrations", () => {
  describe("v1 → v2", () => {
    it("converts top-level current/lastResponse into a single tab", () => {
      const v1 = {
        current: {
          id: null,
          name: "Eski istek",
          method: "GET",
          url: "https://example.com",
          params: [],
          headers: [],
          auth: { type: "none" as const },
          body: { mode: "none" as const, text: "" },
          gql: { query: "", vars: "" },
        },
        lastResponse: { status: 200, sizeBytes: 10, elapsedMs: 50, headers: [], body: "" },
        ui: {
          theme: "dark" as const,
          composerTab: "params" as const,
          responseTab: "body" as const,
        },
        collections: [],
        envs: [{ id: "default", name: "default", vars: {} }],
        activeEnv: "default",
        history: [],
      };
      const v2 = migrateV1toV2(v1);
      expect(v2.tabs).toHaveLength(1);
      expect(v2.tabs[0].name).toBe("Eski istek");
      expect(v2.tabs[0].request.url).toBe("https://example.com");
      expect(v2.activeTabId).toBe(v2.tabs[0].id);
      expect(v2.current.url).toBe("https://example.com");
      expect(v2.lastResponse?.status).toBe(200);
      expect(v2.ui.theme).toBe("dark");
    });

    it("falls back to defaults for missing fields", () => {
      const v2 = migrateV1toV2({});
      expect(v2.tabs).toHaveLength(1);
      expect(v2.tabs[0].name).toBe("Yeni istek");
      expect(v2.envs).toEqual([{ id: "default", name: "default", vars: {} }]);
      expect(v2.activeEnv).toBe("default");
      expect(v2.history).toEqual([]);
      expect(v2.ui.theme).toBe("auto");
    });
  });

  describe("v2 → v3", () => {
    it("promotes flat collections into the tree shape", () => {
      const v2 = {
        collections: [
          {
            id: "c1",
            name: "GET users",
            request: {
              method: "GET" as const,
              url: "https://api.example.com/users",
              params: [],
              headers: [],
              auth: { type: "none" as const },
              body: { mode: "none" as const, text: "" },
              gql: { query: "", vars: "" },
              isGraphql: false,
            },
          },
          {
            id: "c2",
            name: "POST users",
            request: {
              method: "POST" as const,
              url: "https://api.example.com/users",
              params: [],
              headers: [],
              auth: { type: "none" as const },
              body: { mode: "json" as const, text: "{}" },
              gql: { query: "", vars: "" },
              isGraphql: false,
            },
          },
        ],
        envs: [{ id: "e1", name: "prod", vars: { token: "abc" } }],
        activeEnv: "e1",
      } as unknown;
      const v3 = migrateV2toV3(v2) as CoreState;
      expect(v3.collectionItems).toHaveLength(2);
      expect(v3.collectionItems[0]).toMatchObject({
        id: "c1",
        parentId: null,
        kind: "request",
        order: 0,
        name: "GET users",
      });
      expect(v3.collectionItems[1]).toMatchObject({
        id: "c2",
        parentId: null,
        order: 1,
        name: "POST users",
      });
      expect(v3.collectionsExpanded).toEqual({});
      // legacy `collections` field stripped
      expect((v3 as unknown as { collections?: unknown }).collections).toBeUndefined();
      // env data preserved
      expect(v3.envs).toEqual([{ id: "e1", name: "prod", vars: { token: "abc" } }]);
      expect(v3.activeEnv).toBe("e1");
    });

    it("backfills missing fields from buildInitialState", () => {
      const v3 = migrateV2toV3({});
      expect(v3.collectionItems).toEqual([]);
      expect(v3.tabs.length).toBeGreaterThan(0);
      expect(v3.activeTabId).toBeTruthy();
      expect(v3.locale).toBeDefined();
      expect(v3.defaults).toBeDefined();
    });
  });

  describe("v1 → v3 (chained)", () => {
    it("end-to-end: v1 snapshot survives both migrations", () => {
      const v1 = {
        current: {
          id: null,
          name: "Old",
          method: "GET" as const,
          url: "https://x.test",
          params: [],
          headers: [],
          auth: { type: "none" as const },
          body: { mode: "none" as const, text: "" },
          gql: { query: "", vars: "" },
        },
        collections: [
          {
            id: "c1",
            name: "saved",
            request: {
              method: "GET" as const,
              url: "https://saved.test",
              params: [],
              headers: [],
              auth: { type: "none" as const },
              body: { mode: "none" as const, text: "" },
              gql: { query: "", vars: "" },
              isGraphql: false,
            },
          },
        ],
      };
      const v2 = migrateV1toV2(v1);
      const v3 = migrateV2toV3(v2) as CoreState;
      expect(v3.collectionItems).toHaveLength(1);
      expect(v3.collectionItems[0].name).toBe("saved");
      expect(v3.tabs).toHaveLength(1);
      expect(v3.tabs[0].request.url).toBe("https://x.test");
    });
  });
});
