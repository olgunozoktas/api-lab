/** Olgun Özoktaş geliştirdi · API Lab */
// Helpers for the local mock-server feature. The Zig sidecar
// (src/handlers/mock.zig) binds a loopback HTTP listener that serves
// saved response Examples back to any external client. These helpers
// build the bridge payloads and wrap the mock.start / mock.stop /
// mock.list bridge commands so the UI stays thin.

import { bridge } from "./bridge";
import type { Example } from "./types";

// mock.start bridge payload. `examples` is passed straight from the
// request — the Zig side parses with ignore_unknown_fields, so the
// full Example shape travels without a separate DTO.
export type MockStartPayload = {
  collectionId: string;
  examples: Example[];
  port?: number;
};

// mock.start result — `{id, port}` on success, `{error}` on failure.
export type MockStartResult = {
  id?: number;
  port?: number;
  error?: string;
};

// One row of mock.list — an active loopback server.
export type MockServerInfo = {
  id: number;
  port: number;
  exampleCount: number;
  status: string;
};

export type MockStopResult = {
  ok?: boolean;
  error?: string;
};

// Build the mock.start bridge payload. Pure — this is the canonical
// "bridge command shape" the frontend unit test pins.
export function buildMockStartPayload(
  collectionId: string | null,
  examples: Example[],
  port?: number
): MockStartPayload {
  return {
    collectionId: collectionId ?? "",
    examples,
    // Only include `port` when it's a real fixed port — 0 / undefined
    // means "ephemeral", which the Zig side already defaults to.
    ...(port && port > 0 ? { port } : {}),
  };
}

// Loopback base URL for a started mock. Pure.
export function mockBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

export async function startMock(payload: MockStartPayload): Promise<MockStartResult> {
  return bridge.invoke<MockStartResult>("mock.start", payload);
}

export async function stopMock(id: number): Promise<MockStopResult> {
  return bridge.invoke<MockStopResult>("mock.stop", { id });
}

export async function listMocks(): Promise<MockServerInfo[]> {
  return bridge.invoke<MockServerInfo[]>("mock.list", {});
}
