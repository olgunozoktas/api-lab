/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { basename, binaryPath, buildMultipartWire, contentTypeForPath } from "../fileBody";
import { emptyMultipartField, type Body, type MultipartField } from "../types";

describe("basename", () => {
  it("extracts the last POSIX path segment", () => {
    expect(basename("/Users/me/photos/cat.jpg")).toBe("cat.jpg");
  });
  it("handles Windows separators", () => {
    expect(basename("C:\\Users\\me\\report.pdf")).toBe("report.pdf");
  });
  it("strips a trailing slash and returns a bare name as-is", () => {
    expect(basename("/tmp/dir/")).toBe("dir");
    expect(basename("solo.txt")).toBe("solo.txt");
  });
});

describe("contentTypeForPath", () => {
  it("maps known extensions, case-insensitively", () => {
    expect(contentTypeForPath("/x/a.PNG")).toBe("image/png");
    expect(contentTypeForPath("/x/a.pdf")).toBe("application/pdf");
    expect(contentTypeForPath("doc.json")).toBe("application/json");
  });
  it("falls back to octet-stream for unknown or extensionless paths", () => {
    expect(contentTypeForPath("/x/a.qwerty")).toBe("application/octet-stream");
    expect(contentTypeForPath("/x/noext")).toBe("application/octet-stream");
  });
});

const field = (over: Partial<MultipartField>): MultipartField => ({
  ...emptyMultipartField(),
  ...over,
});

describe("buildMultipartWire", () => {
  it("maps text + file fields and substitutes env vars", () => {
    const parts = [
      field({ k: "caption", kind: "text", v: "{{msg}}" }),
      field({ k: "photo", kind: "file", filePath: "/tmp/cat.jpg", fileName: "cat.jpg" }),
    ];
    const wire = buildMultipartWire(parts, { msg: "hello" });
    expect(wire).toEqual([
      { name: "caption", value: "hello", is_file: false },
      { name: "photo", value: "/tmp/cat.jpg", is_file: true },
    ]);
  });

  it("drops disabled, unnamed, and file fields with no picked path", () => {
    const parts = [
      field({ k: "a", v: "1", enabled: false }),
      field({ k: "", v: "2" }),
      field({ k: "noFile", kind: "file", filePath: "" }),
      field({ k: "ok", v: "3" }),
    ];
    expect(buildMultipartWire(parts, {})).toEqual([{ name: "ok", value: "3", is_file: false }]);
  });

  it("returns an empty array for undefined parts", () => {
    expect(buildMultipartWire(undefined, {})).toEqual([]);
  });
});

describe("binaryPath", () => {
  const body = (over: Partial<Body>): Body => ({ mode: "binary", text: "", ...over });
  it("returns the file path for a binary body", () => {
    expect(binaryPath(body({ filePath: "/tmp/data.bin" }))).toBe("/tmp/data.bin");
  });
  it("returns undefined when no file is picked or the mode is not binary", () => {
    expect(binaryPath(body({ filePath: "" }))).toBeUndefined();
    expect(binaryPath({ mode: "json", text: "{}" })).toBeUndefined();
  });
});
