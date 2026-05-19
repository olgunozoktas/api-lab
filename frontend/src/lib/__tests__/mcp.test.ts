/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  rpcRequest,
  rpcNotification,
  parseRpcResponses,
  buildExchangeFrames,
  MCP_PROTOCOL_VERSION,
} from "../mcp";

describe("rpcRequest / rpcNotification", () => {
  it("a request carries jsonrpc, id, method, params", () => {
    const obj = JSON.parse(rpcRequest(7, "tools/list", { a: 1 }));
    expect(obj).toEqual({ jsonrpc: "2.0", id: 7, method: "tools/list", params: { a: 1 } });
  });

  it("a notification has no id (so the server sends no reply)", () => {
    const obj = JSON.parse(rpcNotification("notifications/initialized", {}));
    expect(obj.id).toBeUndefined();
    expect(obj).toEqual({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
  });
});

describe("parseRpcResponses", () => {
  it("indexes newline-delimited responses by their numeric id", () => {
    const text = `{"jsonrpc":"2.0","id":1,"result":{"ok":true}}
{"jsonrpc":"2.0","id":2,"result":{"tools":[]}}`;
    const map = parseRpcResponses(text);
    expect(map.size).toBe(2);
    expect(map.get(2)?.result).toEqual({ tools: [] });
  });

  it("skips non-JSON lines (a server's stray log output)", () => {
    const text = `[info] starting server
{"jsonrpc":"2.0","id":2,"result":42}
plain log tail`;
    const map = parseRpcResponses(text);
    expect(map.size).toBe(1);
    expect(map.get(2)?.result).toBe(42);
  });

  it("skips notifications — objects without an id are not responses", () => {
    const text = `{"jsonrpc":"2.0","method":"notifications/message","params":{}}
{"jsonrpc":"2.0","id":2,"result":"x"}`;
    const map = parseRpcResponses(text);
    expect(map.size).toBe(1);
    expect(map.has(2)).toBe(true);
  });

  it("captures a JSON-RPC error response", () => {
    const text = `{"jsonrpc":"2.0","id":2,"error":{"code":-32601,"message":"method not found"}}`;
    expect(parseRpcResponses(text).get(2)?.error?.message).toBe("method not found");
  });

  it("ignores blank lines and tolerates empty input", () => {
    expect(parseRpcResponses("").size).toBe(0);
    expect(parseRpcResponses("\n\n").size).toBe(0);
  });
});

describe("buildExchangeFrames", () => {
  it("emits the handshake (initialize + initialized) then the operation", () => {
    const frames = buildExchangeFrames("tools/list", {});
    expect(frames).toHaveLength(3);
    const f0 = JSON.parse(frames[0]);
    expect(f0.method).toBe("initialize");
    expect(f0.params.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
    expect(JSON.parse(frames[1]).method).toBe("notifications/initialized");
  });

  it("the operation frame uses id 2 so the caller can pull its response", () => {
    const frames = buildExchangeFrames("tools/call", { name: "echo" });
    const op = JSON.parse(frames[2]);
    expect(op.id).toBe(2);
    expect(op.method).toBe("tools/call");
    expect(op.params).toEqual({ name: "echo" });
  });
});
