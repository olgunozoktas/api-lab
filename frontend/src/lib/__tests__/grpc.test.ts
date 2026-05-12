/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  isGrpcUrl,
  derivePlaintext,
  extractTarget,
  isLikelyFullMethod,
  buildTlsPayload,
} from "../grpc";

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

describe("buildTlsPayload", () => {
  const noop = (s: string) => s;

  it("returns all undefined for an empty/undefined tls input", () => {
    expect(buildTlsPayload(undefined, noop)).toEqual({
      ca_cert: undefined,
      client_cert: undefined,
      client_key: undefined,
      server_name: undefined,
      authority: undefined,
    });
    expect(buildTlsPayload({}, noop)).toEqual({
      ca_cert: undefined,
      client_cert: undefined,
      client_key: undefined,
      server_name: undefined,
      authority: undefined,
    });
  });

  it("maps camelCase UI shape to snake_case bridge fields", () => {
    const out = buildTlsPayload(
      {
        caCert: "CA-PEM",
        clientCert: "CLIENT-PEM",
        clientKey: "CLIENT-KEY",
        serverName: "host.internal",
        authority: "actual-backend",
      },
      noop
    );
    expect(out).toEqual({
      ca_cert: "CA-PEM",
      client_cert: "CLIENT-PEM",
      client_key: "CLIENT-KEY",
      server_name: "host.internal",
      authority: "actual-backend",
    });
  });

  it("strips empty-string fields (treated same as undefined)", () => {
    const out = buildTlsPayload({ caCert: "X", clientCert: "", clientKey: "" }, noop);
    expect(out.ca_cert).toBe("X");
    expect(out.client_cert).toBeUndefined();
    expect(out.client_key).toBeUndefined();
  });

  it("applies the substitution function to every set field", () => {
    const subst = (s: string) => s.replace("{{X}}", "expanded");
    const out = buildTlsPayload(
      {
        caCert: "before-{{X}}-after",
        serverName: "{{X}}.example.com",
      },
      subst
    );
    expect(out.ca_cert).toBe("before-expanded-after");
    expect(out.server_name).toBe("expanded.example.com");
  });
});
