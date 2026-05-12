/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { parseHistoryQuery, matchesHistoryQuery, filterHistory } from "../historyFilter";
import type { HistoryItem } from "../types";

const mk = (method: string, url: string, status: number): HistoryItem => ({
  id: `${method}-${url}-${status}`,
  ts: 0,
  request: {
    method,
    url,
    params: [],
    headers: [],
    auth: { type: "none" },
    body: { mode: "none", text: "" },
    gql: { query: "", vars: "" },
  },
  response: { status, sizeBytes: 0, elapsedMs: 0 },
});

describe("parseHistoryQuery", () => {
  it("empty / whitespace → empty filter", () => {
    expect(parseHistoryQuery("")).toEqual({ urlSubstring: "" });
    expect(parseHistoryQuery("   ")).toEqual({ urlSubstring: "" });
  });

  it("plain text → urlSubstring only", () => {
    expect(parseHistoryQuery("users")).toEqual({ urlSubstring: "users" });
    expect(parseHistoryQuery("API.example.com")).toEqual({ urlSubstring: "api.example.com" });
  });

  it("HTTP verb prefix → method", () => {
    expect(parseHistoryQuery("GET")).toEqual({ method: "GET", urlSubstring: "" });
    expect(parseHistoryQuery("post users")).toEqual({ method: "POST", urlSubstring: "users" });
    expect(parseHistoryQuery("DELETE 42")).toEqual({ method: "DELETE", urlSubstring: "42" });
  });

  it("3-digit number → status", () => {
    expect(parseHistoryQuery("404")).toEqual({ status: 404, urlSubstring: "" });
    expect(parseHistoryQuery("200 ok")).toEqual({ status: 200, urlSubstring: "ok" });
  });

  it("rejects out-of-range status numbers", () => {
    expect(parseHistoryQuery("999")).toEqual({ urlSubstring: "999" });
    expect(parseHistoryQuery("099")).toEqual({ urlSubstring: "099" });
  });

  it("non-3-digit numbers stay in urlSubstring", () => {
    expect(parseHistoryQuery("42")).toEqual({ urlSubstring: "42" });
    expect(parseHistoryQuery("12345")).toEqual({ urlSubstring: "12345" });
  });

  it("combines method + status + url", () => {
    expect(parseHistoryQuery("GET 401 login")).toEqual({
      method: "GET",
      status: 401,
      urlSubstring: "login",
    });
  });

  it("only first verb counts as method; second verb stays in urlSubstring", () => {
    expect(parseHistoryQuery("GET POST")).toEqual({
      method: "GET",
      urlSubstring: "post",
    });
  });
});

describe("matchesHistoryQuery", () => {
  const item = mk("POST", "https://api.example.com/users/42", 201);

  it("empty filter matches everything", () => {
    expect(matchesHistoryQuery(item, { urlSubstring: "" })).toBe(true);
  });

  it("method filter (case-insensitive on item)", () => {
    expect(matchesHistoryQuery(item, { method: "POST", urlSubstring: "" })).toBe(true);
    expect(matchesHistoryQuery(item, { method: "GET", urlSubstring: "" })).toBe(false);
  });

  it("status filter", () => {
    expect(matchesHistoryQuery(item, { status: 201, urlSubstring: "" })).toBe(true);
    expect(matchesHistoryQuery(item, { status: 200, urlSubstring: "" })).toBe(false);
  });

  it("url substring filter is case-insensitive", () => {
    expect(matchesHistoryQuery(item, { urlSubstring: "users" })).toBe(true);
    expect(matchesHistoryQuery(item, { urlSubstring: "USERS" })).toBe(true);
    expect(matchesHistoryQuery(item, { urlSubstring: "missing" })).toBe(false);
  });

  it("AND-semantics: all filters must match", () => {
    expect(matchesHistoryQuery(item, { method: "POST", status: 201, urlSubstring: "users" })).toBe(
      true
    );
    expect(matchesHistoryQuery(item, { method: "POST", status: 200, urlSubstring: "users" })).toBe(
      false
    );
  });
});

describe("filterHistory", () => {
  const items = [
    mk("GET", "https://api/users/1", 200),
    mk("POST", "https://api/users", 201),
    mk("GET", "https://api/orders/7", 404),
    mk("DELETE", "https://api/users/2", 204),
  ];

  it("empty query returns input unchanged", () => {
    expect(filterHistory(items, "")).toBe(items);
    expect(filterHistory(items, "   ")).toBe(items);
  });

  it("filters by url substring", () => {
    expect(filterHistory(items, "users")).toHaveLength(3);
    expect(filterHistory(items, "orders")).toHaveLength(1);
  });

  it("filters by method", () => {
    expect(filterHistory(items, "GET")).toHaveLength(2);
    expect(filterHistory(items, "DELETE")).toHaveLength(1);
  });

  it("filters by status", () => {
    expect(filterHistory(items, "404")).toHaveLength(1);
    expect(filterHistory(items, "201")).toHaveLength(1);
  });

  it("combines method + url", () => {
    expect(filterHistory(items, "GET users")).toHaveLength(1);
  });
});
