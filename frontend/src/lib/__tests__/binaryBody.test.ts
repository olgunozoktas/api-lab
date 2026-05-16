/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  base64ToBytes,
  bytesToText,
  base64ToText,
  isBinaryContentType,
  pickBinaryViewer,
} from "../binaryBody";

describe("binaryBody", () => {
  it("base64ToBytes round-trips raw bytes", () => {
    const b64 = btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0x00, 0x10));
    expect(Array.from(base64ToBytes(b64))).toEqual([0xff, 0xd8, 0xff, 0x00, 0x10]);
  });

  it("bytesToText decodes valid UTF-8", () => {
    expect(bytesToText(new Uint8Array([104, 105]))).toBe("hi");
  });

  it("bytesToText is lossy (never throws) on invalid UTF-8", () => {
    const t = bytesToText(new Uint8Array([0xff, 0xfe, 0x80]));
    expect(typeof t).toBe("string");
  });

  it("base64ToText composes base64 decode + UTF-8 decode", () => {
    expect(base64ToText(btoa("hello world"))).toBe("hello world");
  });

  it("base64ToBytes handles an empty payload", () => {
    expect(base64ToBytes("").length).toBe(0);
  });
});

describe("isBinaryContentType", () => {
  it("flags binary media types", () => {
    expect(isBinaryContentType("image/png")).toBe(true);
    expect(isBinaryContentType("audio/mpeg")).toBe(true);
    expect(isBinaryContentType("video/mp4")).toBe(true);
    expect(isBinaryContentType("application/pdf")).toBe(true);
    expect(isBinaryContentType("application/octet-stream")).toBe(true);
  });

  it("treats text, JSON, XML and SVG as non-binary", () => {
    expect(isBinaryContentType("application/json")).toBe(false);
    expect(isBinaryContentType("text/html")).toBe(false);
    expect(isBinaryContentType("image/svg+xml")).toBe(false);
    expect(isBinaryContentType("")).toBe(false);
  });
});

describe("pickBinaryViewer", () => {
  it("routes each media family to its viewer", () => {
    expect(pickBinaryViewer("image/png")).toBe("image");
    expect(pickBinaryViewer("image/gif; charset=binary")).toBe("image");
    expect(pickBinaryViewer("audio/mpeg")).toBe("audio");
    expect(pickBinaryViewer("video/webm")).toBe("video");
    expect(pickBinaryViewer("application/pdf")).toBe("pdf");
  });

  it("falls back to hex for unrecognised binary types", () => {
    expect(pickBinaryViewer("application/octet-stream")).toBe("hex");
    expect(pickBinaryViewer("application/x-protobuf")).toBe("hex");
    expect(pickBinaryViewer("")).toBe("hex");
  });

  it("is case-insensitive", () => {
    expect(pickBinaryViewer("IMAGE/PNG")).toBe("image");
    expect(pickBinaryViewer("Application/PDF")).toBe("pdf");
  });
});
