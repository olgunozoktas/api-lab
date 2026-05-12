/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect, beforeEach } from "vitest";
import { REFLECTION_CACHE_TTL_MS, useReflectionCache } from "../reflectionCache";
import type { GrpcReflectService } from "../../lib/bridge";

const services: GrpcReflectService[] = [{ name: "helloworld.Greeter", methods: [] }];

beforeEach(() => {
  useReflectionCache.setState({ entries: new Map() });
});

describe("useReflectionCache", () => {
  it("returns the same services reference on a fresh hit", () => {
    useReflectionCache.getState().setCached("grpcb.in:9001", services, 1000);
    const hit = useReflectionCache.getState().getCached("grpcb.in:9001", 1500);
    expect(hit).not.toBeNull();
    expect(hit!.services).toBe(services);
    expect(hit!.fetchedAt).toBe(1000);
  });

  it("returns null when the entry is stale (TTL boundary)", () => {
    useReflectionCache.getState().setCached("grpcb.in:9001", services, 0);
    const hit = useReflectionCache.getState().getCached("grpcb.in:9001", REFLECTION_CACHE_TTL_MS);
    expect(hit).toBeNull();
  });

  it("returns null for an unknown target", () => {
    expect(useReflectionCache.getState().getCached("nope:1234")).toBeNull();
  });

  it("invalidate clears the entry without touching siblings", () => {
    useReflectionCache.getState().setCached("a:1", services, 0);
    useReflectionCache.getState().setCached("b:2", services, 0);
    useReflectionCache.getState().invalidate("a:1");
    expect(useReflectionCache.getState().getCached("a:1", 100)).toBeNull();
    expect(useReflectionCache.getState().getCached("b:2", 100)).not.toBeNull();
  });

  it("setCached overwrites an existing entry with new fetchedAt", () => {
    useReflectionCache.getState().setCached("a:1", services, 0);
    const more: GrpcReflectService[] = [
      { name: "x.Y", methods: [] },
      { name: "x.Z", methods: [] },
    ];
    useReflectionCache.getState().setCached("a:1", more, 1000);
    const hit = useReflectionCache.getState().getCached("a:1", 1500);
    expect(hit!.services).toBe(more);
    expect(hit!.fetchedAt).toBe(1000);
  });
});
