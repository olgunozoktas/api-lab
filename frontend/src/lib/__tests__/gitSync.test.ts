/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { buildSyncPayload, parseSyncPayload, SYNC_SCHEMA_VERSION } from "../gitSync";
import type { CollectionItem, Environment } from "../types";

const items: CollectionItem[] = [
  { id: "a", parentId: null, kind: "folder", name: "APIs", order: 0 },
  {
    id: "b",
    parentId: "a",
    kind: "request",
    name: "users",
    order: 0,
    request: {
      method: "GET",
      url: "https://api.example.test/users",
      params: [],
      headers: [],
      auth: { type: "none" },
      body: { mode: "none", text: "" },
      gql: { query: "", vars: "" },
    },
  },
];
const envs: Environment[] = [{ id: "default", name: "default", vars: { base: "x" } }];

describe("buildSyncPayload", () => {
  it("serialises collections + envs and round-trips through parse", () => {
    const json = buildSyncPayload(items, envs, 1700000000000);
    const parsed = parseSyncPayload(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.schemaVersion).toBe(SYNC_SCHEMA_VERSION);
    expect(parsed!.exportedAt).toBe(1700000000000);
    expect(parsed!.collectionItems).toEqual(items);
    expect(parsed!.envs).toEqual(envs);
  });
});

describe("parseSyncPayload", () => {
  it("returns null for empty / blank input", () => {
    expect(parseSyncPayload("")).toBeNull();
    expect(parseSyncPayload("   ")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseSyncPayload("{not json")).toBeNull();
  });

  it("returns null when the schema version does not match", () => {
    const wrong = JSON.stringify({ schemaVersion: 999, collectionItems: [], envs: [] });
    expect(parseSyncPayload(wrong)).toBeNull();
  });

  it("returns null when collectionItems / envs are not arrays", () => {
    const bad = JSON.stringify({
      schemaVersion: SYNC_SCHEMA_VERSION,
      collectionItems: {},
      envs: [],
    });
    expect(parseSyncPayload(bad)).toBeNull();
  });

  it("accepts a well-formed payload with a missing exportedAt", () => {
    const json = JSON.stringify({
      schemaVersion: SYNC_SCHEMA_VERSION,
      collectionItems: [],
      envs: [],
    });
    const parsed = parseSyncPayload(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.exportedAt).toBe(0);
  });
});
