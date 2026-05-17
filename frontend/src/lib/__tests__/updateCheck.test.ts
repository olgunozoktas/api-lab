/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { isUpdateAvailable, parseLatestRelease } from "../updateCheck";

describe("parseLatestRelease", () => {
  it("extracts tag_name + html_url from a GitHub release payload", () => {
    const json = JSON.stringify({
      tag_name: "v0.6.0",
      html_url: "https://github.com/olgunozoktas/api-lab/releases/tag/v0.6.0",
      name: "v0.6.0",
    });
    expect(parseLatestRelease(json)).toEqual({
      version: "v0.6.0",
      url: "https://github.com/olgunozoktas/api-lab/releases/tag/v0.6.0",
    });
  });

  it("returns null when tag_name is missing", () => {
    expect(parseLatestRelease(JSON.stringify({ html_url: "x" }))).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(parseLatestRelease("{not json")).toBeNull();
    expect(parseLatestRelease("")).toBeNull();
  });

  it("tolerates a missing html_url (returns an empty url)", () => {
    expect(parseLatestRelease(JSON.stringify({ tag_name: "v1.0.0" }))).toEqual({
      version: "v1.0.0",
      url: "",
    });
  });
});

describe("isUpdateAvailable", () => {
  it("is true when the release tag is newer", () => {
    expect(isUpdateAvailable("0.5.1", "v0.6.0")).toBe(true);
    expect(isUpdateAvailable("0.5.1", "0.5.2")).toBe(true);
  });

  it("is false when the release is the same or older", () => {
    expect(isUpdateAvailable("0.5.1", "v0.5.1")).toBe(false);
    expect(isUpdateAvailable("0.5.1", "v0.5.0")).toBe(false);
  });

  it("tolerates a v prefix on either side", () => {
    expect(isUpdateAvailable("v0.5.1", "0.6.0")).toBe(true);
    expect(isUpdateAvailable("0.5.1", "v0.5.1")).toBe(false);
  });
});
