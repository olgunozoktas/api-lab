/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { REDACTED_PLACEHOLDER, redactBody, redactHeaders, redactInput } from "../codegen/redact";

describe("redactHeaders", () => {
  it("replaces credential header values with the placeholder", () => {
    const out = redactHeaders([
      { name: "Authorization", value: "Bearer abc123" },
      { name: "Cookie", value: "session=xyz" },
      { name: "Content-Type", value: "application/json" },
    ]);
    expect(out).toEqual([
      { name: "Authorization", value: REDACTED_PLACEHOLDER },
      { name: "Cookie", value: REDACTED_PLACEHOLDER },
      { name: "Content-Type", value: "application/json" },
    ]);
  });

  it("matches header names case-insensitively (RFC 7230)", () => {
    const out = redactHeaders([
      { name: "authorization", value: "Bearer x" },
      { name: "X-API-KEY", value: "sk-live-abc" },
      { name: "x-auth-token", value: "tok" },
      { name: "Proxy-Authorization", value: "Basic xx" },
    ]);
    for (const h of out) {
      expect(h.value).toBe(REDACTED_PLACEHOLDER);
    }
  });

  it("does NOT redact lookalike custom headers (X-Auth-Source, X-Authentic)", () => {
    // Conservative match — exact name, not substring — so a custom
    // header with `auth` in its name keeps its value.
    const out = redactHeaders([
      { name: "X-Auth-Source", value: "google" },
      { name: "X-Authentic", value: "yes" },
    ]);
    expect(out[0].value).toBe("google");
    expect(out[1].value).toBe("yes");
  });

  it("preserves header order", () => {
    const out = redactHeaders([
      { name: "Accept", value: "*/*" },
      { name: "Authorization", value: "Bearer x" },
      { name: "X-Trace-Id", value: "abc" },
    ]);
    expect(out.map((h) => h.name)).toEqual(["Accept", "Authorization", "X-Trace-Id"]);
  });
});

describe("redactBody", () => {
  it("passes through null / empty unchanged", () => {
    expect(redactBody(null)).toBe(null);
    expect(redactBody(undefined)).toBe(undefined);
    expect(redactBody("")).toBe("");
  });

  it("redacts known JSON keys, leaves the rest intact", () => {
    const out = redactBody('{"name":"alice","token":"sk-live-abc","note":"keep"}');
    expect(out).toBe(JSON.stringify({ name: "alice", token: REDACTED_PLACEHOLDER, note: "keep" }));
  });

  it("matches body keys case-insensitively (Token, API_KEY)", () => {
    const out = redactBody('{"Token":"a","API_KEY":"b","Password":"c"}');
    const parsed = JSON.parse(out!);
    expect(parsed.Token).toBe(REDACTED_PLACEHOLDER);
    expect(parsed.API_KEY).toBe(REDACTED_PLACEHOLDER);
    expect(parsed.Password).toBe(REDACTED_PLACEHOLDER);
  });

  it("recurses into nested objects + arrays", () => {
    const out = redactBody(
      JSON.stringify({
        user: { name: "alice", api_key: "sk-x" },
        sessions: [{ token: "t1" }, { token: "t2", role: "admin" }],
      })
    );
    const parsed = JSON.parse(out!);
    expect(parsed.user.api_key).toBe(REDACTED_PLACEHOLDER);
    expect(parsed.user.name).toBe("alice");
    expect(parsed.sessions[0].token).toBe(REDACTED_PLACEHOLDER);
    expect(parsed.sessions[1].token).toBe(REDACTED_PLACEHOLDER);
    expect(parsed.sessions[1].role).toBe("admin");
  });

  it("only redacts string values — leaves numeric / null / boolean alone", () => {
    // A field called `password` with a number is almost certainly a
    // schema mismatch, not a secret — leave it visible so the user
    // notices.
    const out = redactBody('{"password":42,"token":null,"secret":true}');
    const parsed = JSON.parse(out!);
    expect(parsed.password).toBe(42);
    expect(parsed.token).toBe(null);
    expect(parsed.secret).toBe(true);
  });

  it("passes non-JSON bodies through unchanged (no risky regex pass)", () => {
    const form = "name=alice&token=sk-live-abc";
    expect(redactBody(form)).toBe(form);
    const xml = "<creds><token>sk-x</token></creds>";
    expect(redactBody(xml)).toBe(xml);
  });

  it("preserves pretty-print when input was multi-line", () => {
    const pretty = '{\n  "token": "sk-x",\n  "name": "alice"\n}';
    const out = redactBody(pretty);
    expect(out).toContain("\n  ");
    expect(out).toContain(REDACTED_PLACEHOLDER);
  });
});

describe("redactInput", () => {
  it("applies both header + body redaction in one call", () => {
    const out = redactInput({
      method: "POST",
      url: "https://api.example.com/x",
      headers: [
        { name: "Authorization", value: "Bearer x" },
        { name: "Content-Type", value: "application/json" },
      ],
      body: '{"token":"sk-x","note":"keep"}',
    });
    expect(out.headers[0].value).toBe(REDACTED_PLACEHOLDER);
    expect(out.headers[1].value).toBe("application/json");
    expect(JSON.parse(out.body!).token).toBe(REDACTED_PLACEHOLDER);
    expect(JSON.parse(out.body!).note).toBe("keep");
    // url + method untouched
    expect(out.url).toBe("https://api.example.com/x");
    expect(out.method).toBe("POST");
  });
});
