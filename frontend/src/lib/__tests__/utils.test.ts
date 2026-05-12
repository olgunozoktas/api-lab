/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  displayTabName,
  envSubst,
  hasUnresolvedVars,
  humanSize,
  isProbablyJson,
  methodClass,
  sizeBand,
  sizeClass,
  statusText,
  timeAgo,
  timingBand,
  timingClass,
  tokenizeUnresolvedVars,
} from "../utils";

describe("envSubst", () => {
  it("substitutes a single placeholder", () => {
    expect(envSubst("Hello {{name}}", { name: "Alice" })).toBe("Hello Alice");
  });

  it("substitutes multiple placeholders in one string", () => {
    expect(envSubst("{{greet}}, {{name}}!", { greet: "Hi", name: "Bob" })).toBe("Hi, Bob!");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(envSubst("Hello {{missing}}", {})).toBe("Hello {{missing}}");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(envSubst("Hello {{  name  }}", { name: "x" })).toBe("Hello x");
  });

  it("supports keys with dots and dashes", () => {
    expect(envSubst("{{api.base-url}}", { "api.base-url": "https://x" })).toBe("https://x");
  });

  it("returns empty string for null / undefined input", () => {
    expect(envSubst(null, {})).toBe("");
    expect(envSubst(undefined, {})).toBe("");
  });

  it("does not replace inside nested values (no recursion)", () => {
    expect(envSubst("{{a}}", { a: "{{b}}", b: "x" })).toBe("{{b}}");
  });
});

describe("statusText", () => {
  it("returns text for known 2xx codes", () => {
    expect(statusText(200)).toBe("OK");
    expect(statusText(201)).toBe("Created");
    expect(statusText(204)).toBe("No Content");
  });

  it("returns text for known 4xx / 5xx codes", () => {
    expect(statusText(404)).toBe("Not Found");
    expect(statusText(500)).toBe("Server Error");
  });

  it("returns empty string for unknown codes", () => {
    expect(statusText(0)).toBe("");
    expect(statusText(999)).toBe("");
  });
});

describe("humanSize", () => {
  it("formats bytes under 1 KB plainly", () => {
    expect(humanSize(0)).toBe("0 B");
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(1023)).toBe("1023 B");
  });

  it("formats KB with one decimal", () => {
    expect(humanSize(1024)).toBe("1.0 KB");
    expect(humanSize(1536)).toBe("1.5 KB");
  });

  it("formats MB with two decimals", () => {
    expect(humanSize(1024 * 1024)).toBe("1.00 MB");
    expect(humanSize(2.5 * 1024 * 1024)).toBe("2.50 MB");
  });
});

describe("isProbablyJson", () => {
  it("recognizes object start", () => {
    expect(isProbablyJson('{"a":1}')).toBe(true);
    expect(isProbablyJson("   { }")).toBe(true);
  });

  it("recognizes array start", () => {
    expect(isProbablyJson("[1,2,3]")).toBe(true);
    expect(isProbablyJson("\n  [\n]")).toBe(true);
  });

  it("rejects non-JSON-shaped strings", () => {
    expect(isProbablyJson("hello")).toBe(false);
    expect(isProbablyJson("<html>")).toBe(false);
    expect(isProbablyJson("")).toBe(false);
  });
});

describe("methodClass", () => {
  it("maps each known method to its color class", () => {
    expect(methodClass("GET")).toBe("text-green-500");
    expect(methodClass("POST")).toBe("text-orange-500");
    expect(methodClass("PUT")).toBe("text-sky-500");
    expect(methodClass("PATCH")).toBe("text-purple-500");
    expect(methodClass("DELETE")).toBe("text-red-500");
  });

  it("falls back to a muted token for unknown methods", () => {
    expect(methodClass("HEAD")).toBe("text-[var(--color-fg-muted)]");
    expect(methodClass("")).toBe("text-[var(--color-fg-muted)]");
  });
});

describe("timeAgo", () => {
  const NOW = 1_700_000_000_000;
  it("returns 'now' for very recent timestamps", () => {
    expect(timeAgo(NOW - 1_000, NOW)).toBe("now");
    expect(timeAgo(NOW - 4_000, NOW)).toBe("now");
  });
  it("returns seconds when < 60s", () => {
    expect(timeAgo(NOW - 30_000, NOW)).toBe("30s");
    expect(timeAgo(NOW - 59_000, NOW)).toBe("59s");
  });
  it("returns minutes when < 1h", () => {
    expect(timeAgo(NOW - 5 * 60_000, NOW)).toBe("5m");
    expect(timeAgo(NOW - 59 * 60_000, NOW)).toBe("59m");
  });
  it("returns hours when < 24h", () => {
    expect(timeAgo(NOW - 3 * 3600_000, NOW)).toBe("3h");
  });
  it("returns days when < 30d", () => {
    expect(timeAgo(NOW - 5 * 86400_000, NOW)).toBe("5d");
  });
  it("returns months / years for older timestamps", () => {
    expect(timeAgo(NOW - 60 * 86400_000, NOW)).toBe("2mo");
    expect(timeAgo(NOW - 400 * 86400_000, NOW)).toBe("1y");
  });
  it("clamps negative deltas to 'now'", () => {
    expect(timeAgo(NOW + 10_000, NOW)).toBe("now");
  });
});

describe("displayTabName", () => {
  it("returns the stored name when the user has renamed the tab", () => {
    expect(displayTabName({ name: "Login flow", method: "GET", url: "https://api.test/x" })).toBe(
      "Login flow"
    );
  });
  it("derives METHOD + short URL for default-named tabs (TR)", () => {
    expect(
      displayTabName({
        name: "Yeni istek",
        method: "GET",
        url: "https://api.github.com/users/octocat",
      })
    ).toBe("GET api.github.com/users/octocat");
  });
  it("derives METHOD + short URL for default-named tabs (EN)", () => {
    expect(
      displayTabName({ name: "New request", method: "POST", url: "https://x.test/login" })
    ).toBe("POST x.test/login");
  });
  it("falls back to Untitled when default-named AND no URL", () => {
    expect(displayTabName({ name: "Yeni istek", method: "GET", url: "" })).toBe("Yeni istek");
    expect(displayTabName({ name: "", method: "GET", url: "" })).toBe("Untitled");
  });
  it("truncates very long URLs with an ellipsis", () => {
    const long = "https://" + "x".repeat(80) + "/path";
    const out = displayTabName({ name: "New request", method: "GET", url: long, maxUrl: 16 });
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(16 + 4); // "GET " + 16 chars
  });
  it("strips scheme + trailing slash", () => {
    expect(displayTabName({ name: "Yeni istek", method: "GET", url: "http://example.com/" })).toBe(
      "GET example.com"
    );
  });
});

describe("tokenizeUnresolvedVars", () => {
  it("returns a single text token when no vars are present", () => {
    expect(tokenizeUnresolvedVars("https://api.test/users")).toEqual([
      { kind: "text", value: "https://api.test/users" },
    ]);
  });
  it("splits an unresolved var in the middle of a URL", () => {
    expect(tokenizeUnresolvedVars("https://api.test/{{userId}}/profile")).toEqual([
      { kind: "text", value: "https://api.test/" },
      { kind: "unresolved", name: "userId" },
      { kind: "text", value: "/profile" },
    ]);
  });
  it("emits an unresolved token when the URL starts with a var", () => {
    expect(tokenizeUnresolvedVars("{{base}}/x")).toEqual([
      { kind: "unresolved", name: "base" },
      { kind: "text", value: "/x" },
    ]);
  });
  it("emits multiple unresolved tokens when several refs are missing", () => {
    expect(tokenizeUnresolvedVars("{{a}}/{{b}}")).toEqual([
      { kind: "unresolved", name: "a" },
      { kind: "text", value: "/" },
      { kind: "unresolved", name: "b" },
    ]);
  });
  it("strips whitespace inside braces", () => {
    expect(tokenizeUnresolvedVars("{{  x  }}")).toEqual([{ kind: "unresolved", name: "x" }]);
  });
});

describe("timingBand", () => {
  it("buckets sub-200ms as fast", () => {
    expect(timingBand(0)).toBe("fast");
    expect(timingBand(50)).toBe("fast");
    expect(timingBand(199)).toBe("fast");
  });
  it("buckets 200–700ms as ok", () => {
    expect(timingBand(200)).toBe("ok");
    expect(timingBand(500)).toBe("ok");
    expect(timingBand(699)).toBe("ok");
  });
  it("buckets 700–2000ms as slow", () => {
    expect(timingBand(700)).toBe("slow");
    expect(timingBand(1500)).toBe("slow");
    expect(timingBand(1999)).toBe("slow");
  });
  it("buckets ≥2000ms as bad", () => {
    expect(timingBand(2000)).toBe("bad");
    expect(timingBand(5000)).toBe("bad");
  });
  it("returns ok for NaN / negative / Infinity", () => {
    expect(timingBand(NaN)).toBe("ok");
    expect(timingBand(-5)).toBe("ok");
    expect(timingBand(Infinity)).toBe("ok");
  });
});

describe("sizeBand", () => {
  it("buckets <10KB as tiny", () => {
    expect(sizeBand(0)).toBe("tiny");
    expect(sizeBand(5000)).toBe("tiny");
    expect(sizeBand(10 * 1024 - 1)).toBe("tiny");
  });
  it("buckets 10KB–100KB as normal", () => {
    expect(sizeBand(10 * 1024)).toBe("normal");
    expect(sizeBand(50 * 1024)).toBe("normal");
    expect(sizeBand(100 * 1024 - 1)).toBe("normal");
  });
  it("buckets 100KB–1MB as large", () => {
    expect(sizeBand(100 * 1024)).toBe("large");
    expect(sizeBand(500 * 1024)).toBe("large");
    expect(sizeBand(1024 * 1024 - 1)).toBe("large");
  });
  it("buckets ≥1MB as huge", () => {
    expect(sizeBand(1024 * 1024)).toBe("huge");
    expect(sizeBand(50 * 1024 * 1024)).toBe("huge");
  });
  it("returns normal for NaN / negative / Infinity", () => {
    expect(sizeBand(NaN)).toBe("normal");
    expect(sizeBand(-100)).toBe("normal");
    expect(sizeBand(Infinity)).toBe("normal");
  });
});

describe("sizeClass", () => {
  it("muted for tiny and normal", () => {
    expect(sizeClass(500)).toBe("text-[var(--color-fg-muted)]");
    expect(sizeClass(50 * 1024)).toBe("text-[var(--color-fg-muted)]");
  });
  it("warning for large", () => {
    expect(sizeClass(500 * 1024)).toBe("text-[var(--color-warning)]");
  });
  it("danger for huge", () => {
    expect(sizeClass(5 * 1024 * 1024)).toBe("text-[var(--color-danger)]");
  });
});

describe("timingClass", () => {
  it("returns the success token for fast responses", () => {
    expect(timingClass(50)).toBe("text-[var(--color-success)]");
  });
  it("returns the muted token for normal responses", () => {
    expect(timingClass(500)).toBe("text-[var(--color-fg-muted)]");
  });
  it("returns the warning token for slow responses", () => {
    expect(timingClass(1500)).toBe("text-[var(--color-warning)]");
  });
  it("returns the danger token for very slow responses", () => {
    expect(timingClass(5000)).toBe("text-[var(--color-danger)]");
  });
});

describe("hasUnresolvedVars", () => {
  it("returns true when at least one var ref remains", () => {
    expect(hasUnresolvedVars("https://api.test/{{userId}}")).toBe(true);
    expect(hasUnresolvedVars("{{a}}")).toBe(true);
  });
  it("returns false on plain strings", () => {
    expect(hasUnresolvedVars("https://api.test/x")).toBe(false);
    expect(hasUnresolvedVars("")).toBe(false);
  });
});
