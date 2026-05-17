/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { amzDate, canonicalQuery, deriveSigningKey, signRequestV4, uriEncode } from "../awsSigv4";

describe("amzDate", () => {
  it("formats a UTC instant as YYYYMMDDTHHMMSSZ", () => {
    expect(amzDate(new Date("2015-08-30T12:36:00Z"))).toBe("20150830T123600Z");
  });
});

describe("uriEncode", () => {
  it("leaves RFC 3986 unreserved characters untouched", () => {
    expect(uriEncode("aZ09_.~-", true)).toBe("aZ09_.~-");
  });
  it("percent-encodes spaces and reserved characters", () => {
    expect(uriEncode("a b", true)).toBe("a%20b");
    expect(uriEncode("k=v&x", true)).toBe("k%3Dv%26x");
  });
  it("keeps slashes when encodeSlash is false, encodes them otherwise", () => {
    expect(uriEncode("/a/b", false)).toBe("/a/b");
    expect(uriEncode("/a/b", true)).toBe("%2Fa%2Fb");
  });
});

describe("canonicalQuery", () => {
  it("sorts params by key and URI-encodes them", () => {
    expect(canonicalQuery("?Version=2010-05-08&Action=ListUsers")).toBe(
      "Action=ListUsers&Version=2010-05-08"
    );
  });
  it("returns an empty string for no query", () => {
    expect(canonicalQuery("")).toBe("");
  });
});

describe("deriveSigningKey", () => {
  // The canonical AWS docs derivation example — secret
  // wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY, 20150830, us-east-1, iam.
  // Pinning this verifies the full HMAC-SHA256 signing-key chain.
  it("matches the AWS-documented signing key", async () => {
    const key = await deriveSigningKey(
      "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      "20150830",
      "us-east-1",
      "iam"
    );
    expect(key).toBe("c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9");
  });
});

describe("signRequestV4", () => {
  const base = {
    method: "GET",
    url: "https://examplebucket.s3.amazonaws.com/test.txt",
    body: "",
    accessKey: "AKIDEXAMPLE",
    secretKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
    service: "s3",
    now: new Date("2015-08-30T12:36:00Z"),
  };

  it("emits a well-formed Authorization header with the right scope + signed headers", async () => {
    const headers = await signRequestV4(base);
    const auth = headers.find((h) => h.name === "Authorization")!.value;
    expect(auth).toContain(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/s3/aws4_request"
    );
    expect(auth).toContain("SignedHeaders=host;x-amz-content-sha256;x-amz-date");
    expect(auth).toMatch(/Signature=[0-9a-f]{64}$/);
  });

  it("adds X-Amz-Date and X-Amz-Content-Sha256, and is deterministic", async () => {
    const a = await signRequestV4(base);
    const b = await signRequestV4(base);
    expect(a.find((h) => h.name === "X-Amz-Date")!.value).toBe("20150830T123600Z");
    expect(a.find((h) => h.name === "X-Amz-Content-Sha256")).toBeTruthy();
    expect(a).toEqual(b);
  });

  it("includes the session token header for temporary credentials", async () => {
    const headers = await signRequestV4({ ...base, sessionToken: "FQoGZ-token" });
    expect(headers.find((h) => h.name === "X-Amz-Security-Token")!.value).toBe("FQoGZ-token");
    const auth = headers.find((h) => h.name === "Authorization")!.value;
    expect(auth).toContain("x-amz-security-token");
  });
});
