/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  generateCodeVerifier,
  deriveCodeChallenge,
  tokenExchangeBody,
  refreshTokenBody,
  parseTokenResponse,
  expiresInToEpoch,
  formatExpiry,
} from "../oauth";

describe("PKCE generation", () => {
  it("generateCodeVerifier returns a string of 43-128 unreserved chars", () => {
    for (let i = 0; i < 5; i++) {
      const v = generateCodeVerifier();
      expect(v.length).toBeGreaterThanOrEqual(43);
      expect(v.length).toBeLessThanOrEqual(128);
      // Unreserved set per RFC 7636: A-Z a-z 0-9 - . _ ~ — base64url
      // gives us A-Z a-z 0-9 - _, which is a subset and valid.
      expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("two consecutive verifiers are different", () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });

  it("deriveCodeChallenge produces deterministic SHA-256 output", async () => {
    // Spec example: verifier "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    // → challenge "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    const got = await deriveCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
    expect(got).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("tokenExchangeBody", () => {
  it("includes the required fields for authorization_code grant", () => {
    const body = tokenExchangeBody({
      code: "abc",
      redirect_uri: "http://localhost:8080/callback",
      client_id: "my-client",
    });
    const p = new URLSearchParams(body);
    expect(p.get("grant_type")).toBe("authorization_code");
    expect(p.get("code")).toBe("abc");
    expect(p.get("redirect_uri")).toBe("http://localhost:8080/callback");
    expect(p.get("client_id")).toBe("my-client");
    expect(p.has("client_secret")).toBe(false);
    expect(p.has("code_verifier")).toBe(false);
  });

  it("includes client_secret when provided (confidential client)", () => {
    const body = tokenExchangeBody({
      code: "abc",
      redirect_uri: "http://x",
      client_id: "c",
      client_secret: "s",
    });
    const p = new URLSearchParams(body);
    expect(p.get("client_secret")).toBe("s");
  });

  it("includes code_verifier when provided (PKCE flow)", () => {
    const body = tokenExchangeBody({
      code: "abc",
      redirect_uri: "http://x",
      client_id: "c",
      code_verifier: "v",
    });
    const p = new URLSearchParams(body);
    expect(p.get("code_verifier")).toBe("v");
  });

  it("URL-encodes special characters", () => {
    const body = tokenExchangeBody({
      code: "abc&xyz=1",
      redirect_uri: "http://x?q=v",
      client_id: "c",
    });
    expect(body).toContain("code=abc%26xyz%3D1");
    expect(body).toContain("redirect_uri=http%3A%2F%2Fx%3Fq%3Dv");
  });
});

describe("refreshTokenBody", () => {
  it("includes the required fields for refresh_token grant", () => {
    const body = refreshTokenBody({
      refresh_token: "rt-123",
      client_id: "c",
    });
    const p = new URLSearchParams(body);
    expect(p.get("grant_type")).toBe("refresh_token");
    expect(p.get("refresh_token")).toBe("rt-123");
    expect(p.get("client_id")).toBe("c");
  });

  it("optionally narrows scope on refresh", () => {
    const body = refreshTokenBody({
      refresh_token: "rt",
      client_id: "c",
      scope: "read write",
    });
    expect(new URLSearchParams(body).get("scope")).toBe("read write");
  });
});

describe("parseTokenResponse", () => {
  it("parses JSON shape", () => {
    const out = parseTokenResponse(
      '{"access_token":"AT","token_type":"Bearer","expires_in":3600,"refresh_token":"RT"}'
    );
    expect(out.access_token).toBe("AT");
    expect(out.token_type).toBe("Bearer");
    expect(out.expires_in).toBe(3600);
    expect(out.refresh_token).toBe("RT");
  });

  it("parses application/x-www-form-urlencoded shape (legacy providers)", () => {
    const out = parseTokenResponse("access_token=AT&expires_in=3600&token_type=bearer");
    expect(out.access_token).toBe("AT");
    expect(out.expires_in).toBe(3600);
    expect(out.token_type).toBe("bearer");
  });

  it("surfaces error field for failure responses", () => {
    const out = parseTokenResponse(
      '{"error":"invalid_grant","error_description":"Refresh token expired"}'
    );
    expect(out.error).toBe("invalid_grant");
    expect(out.error_description).toBe("Refresh token expired");
  });
});

describe("expiresInToEpoch", () => {
  it("returns a future timestamp minus a 30s safety skew", () => {
    const before = Date.now();
    const got = expiresInToEpoch(3600);
    const delta = got - before;
    expect(delta).toBeGreaterThan(3500 * 1000);
    expect(delta).toBeLessThan(3600 * 1000);
  });

  it("clamps to current time when expires_in is 0 or negative", () => {
    const before = Date.now();
    const got = expiresInToEpoch(0);
    expect(got).toBeGreaterThanOrEqual(before);
    expect(got).toBeLessThan(before + 1000);
  });
});

describe("formatExpiry", () => {
  it("returns 'no expiry set' for undefined", () => {
    expect(formatExpiry(undefined).text).toBe("no expiry set");
  });

  it("formats minutes-in-the-future", () => {
    const now = 1_700_000_000_000;
    const out = formatExpiry(now + 42 * 60 * 1000, now);
    expect(out.expired).toBe(false);
    expect(out.text).toMatch(/^expires in \d+m$/);
  });

  it("formats hours+minutes", () => {
    const now = 1_700_000_000_000;
    const out = formatExpiry(now + (3 * 60 + 15) * 60 * 1000, now);
    expect(out.text).toBe("expires in 3h 15m");
  });

  it("formats expired-N-ago", () => {
    const now = 1_700_000_000_000;
    const out = formatExpiry(now - 5 * 60 * 1000, now);
    expect(out.expired).toBe(true);
    expect(out.text).toMatch(/^expired \d+m ago$/);
  });

  it("uses days for >24h", () => {
    const now = 1_700_000_000_000;
    const out = formatExpiry(now + 3 * 86400_000, now);
    expect(out.text).toBe("expires in 3d");
  });
});
