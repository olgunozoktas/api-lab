import { describe, it, expect } from "vitest";
import { isGrpcUrl, derivePlaintext, extractTarget, isLikelyFullMethod } from "../grpc";

describe("isGrpcUrl", () => {
  it("accepts grpc:// and grpcs:// (case-insensitive)", () => {
    expect(isGrpcUrl("grpc://x:50051")).toBe(true);
    expect(isGrpcUrl("grpcs://x:443")).toBe(true);
    expect(isGrpcUrl("GRPC://x")).toBe(true);
    expect(isGrpcUrl("GRPCS://x")).toBe(true);
    expect(isGrpcUrl("  grpc://leading-space")).toBe(true);
  });

  it("rejects http(s)://, ws(s)://, file://, and empty", () => {
    expect(isGrpcUrl("https://x.test")).toBe(false);
    expect(isGrpcUrl("http://x.test")).toBe(false);
    expect(isGrpcUrl("ws://x.test")).toBe(false);
    expect(isGrpcUrl("wss://x.test")).toBe(false);
    expect(isGrpcUrl("file:///x")).toBe(false);
    expect(isGrpcUrl("")).toBe(false);
    expect(isGrpcUrl("   ")).toBe(false);
  });

  it("rejects unsubstituted env-var prefixes", () => {
    expect(isGrpcUrl("{{grpcBase}}/path")).toBe(false);
  });

  it("rejects bare host:port (no scheme)", () => {
    expect(isGrpcUrl("grpcb.in:9001")).toBe(false);
  });
});

describe("derivePlaintext", () => {
  it("grpc:// → true (no TLS)", () => {
    expect(derivePlaintext("grpc://x:50051")).toBe(true);
    expect(derivePlaintext("GRPC://X")).toBe(true);
  });

  it("grpcs:// → false (TLS)", () => {
    expect(derivePlaintext("grpcs://x:443")).toBe(false);
    expect(derivePlaintext("GRPCS://X")).toBe(false);
  });
});

describe("extractTarget", () => {
  it("strips grpc:// prefix preserving host:port", () => {
    expect(extractTarget("grpc://grpcb.in:9001")).toBe("grpcb.in:9001");
    expect(extractTarget("grpcs://api.example.com:443")).toBe("api.example.com:443");
  });

  it("preserves case after the scheme", () => {
    expect(extractTarget("GRPC://Host.Example:50051")).toBe("Host.Example:50051");
  });

  it("returns input unchanged when no scheme present", () => {
    expect(extractTarget("grpcb.in:9001")).toBe("grpcb.in:9001");
  });

  it("trims surrounding whitespace", () => {
    expect(extractTarget("  grpc://x:1  ")).toBe("x:1");
  });
});

describe("isLikelyFullMethod", () => {
  it("accepts package.Service/Method shape", () => {
    expect(isLikelyFullMethod("hello.HelloService/SayHello")).toBe(true);
    expect(isLikelyFullMethod("grpc.health.v1.Health/Check")).toBe(true);
  });

  it("rejects shapes missing slash or dot", () => {
    expect(isLikelyFullMethod("HelloService/SayHello")).toBe(false); // no dot
    expect(isLikelyFullMethod("hello.HelloService.SayHello")).toBe(false); // no slash
    expect(isLikelyFullMethod("hello/world")).toBe(false); // no dot
  });

  it("rejects empty / whitespace", () => {
    expect(isLikelyFullMethod("")).toBe(false);
    expect(isLikelyFullMethod("   ")).toBe(false);
  });
});
