// zero-native JS↔Zig bridge wrapper.
// Calls window.zero.invoke(command, payload) when available.

declare global {
  interface Window {
    zero?: { invoke: (command: string, payload: unknown) => Promise<unknown> };
  }
}

export const bridge = {
  get available() {
    return typeof window !== "undefined"
      && typeof window.zero !== "undefined"
      && typeof window.zero.invoke === "function";
  },
  async invoke<T = unknown>(command: string, payload: unknown): Promise<T> {
    if (!this.available) throw new Error("zero-native bridge unavailable");
    return (await window.zero!.invoke(command, payload)) as T;
  },
};

export type HttpHeader = { name: string; value: string };

export type HttpRequest = {
  method: string;
  url: string;
  headers: HttpHeader[];
  body: string | null;
  timeout_ms?: number;
  follow_redirects?: number;
  insecure?: boolean;
};

export type HttpResponse = {
  status: number;
  size_bytes: number;
  timing_ms: number;
  timing?: {
    namelookup_ms: number;
    connect_ms: number;
    ttfb_ms: number;
    total_ms: number;
  };
  url: string;
  headers: HttpHeader[];
  body: string;
  error?: string;
  exit_code?: number;
  stderr?: string;
};
