/** Olgun Özoktaş geliştirdi · API Lab */
// Cookie jar slice. The send pipeline reads matching cookies via
// `cookiesForUrl` (pure, in lib/cookies.ts) and pipes them into the
// `http.request` bridge; the response pipeline calls
// `absorbSetCookies` to fold any `Set-Cookie` headers back into the
// jar. The slice itself stays tiny — CRUD over a flat array, plus
// the absorption helper. UI lives in `components/CookieJarModal.tsx`.
import type { StateCreator } from "zustand";
import type { Cookie } from "../lib/cookies";
import { parseSetCookieHeaders } from "../lib/cookies";
import { uid } from "../lib/utils";
import type { Store, StoreMutators } from "./types";

export type CookiesActions = {
  setCookies: (next: Cookie[]) => void;
  addCookie: (c: Omit<Cookie, "id">) => string;
  removeCookie: (id: string) => void;
  clearCookies: () => void;
  // Parse a response's `Set-Cookie` headers and fold them into the
  // jar. New cookies append; cookies that match an existing
  // `{domain, path, name}` triple are updated in place rather than
  // duplicating. Returns the count of cookies absorbed for the
  // caller (lets the send pipeline surface a one-line toast on
  // first capture without re-deriving the count).
  absorbSetCookies: (
    headers: ReadonlyArray<{ name: string; value: string }>,
    requestHost: string
  ) => number;
};

// Match-key for de-dup. The natural key in RFC 6265 is the
// `{domain, path, name}` triple — two `Set-Cookie` lines with the
// same triple are an update, not a new cookie.
const keyOf = (c: { domain: string; path: string; name: string }): string =>
  `${c.domain.toLowerCase()}\x00${c.path}\x00${c.name}`;

export const createCookiesSlice: StateCreator<Store, StoreMutators, [], CookiesActions> = (
  set,
  get
) => ({
  setCookies: (next) => set({ cookies: next }),

  addCookie: (c) => {
    const id = uid();
    set((s) => {
      // Same-triple replace instead of append — matches the
      // absorb-cookies de-dup rule, so manual adds behave the same
      // as auto-captured.
      const k = keyOf(c);
      const existing = s.cookies.find((x) => keyOf(x) === k);
      if (existing) {
        return {
          cookies: s.cookies.map((x) => (x.id === existing.id ? { ...x, value: c.value } : x)),
        };
      }
      return { cookies: [...s.cookies, { id, ...c }] };
    });
    return id;
  },

  removeCookie: (id) => set((s) => ({ cookies: s.cookies.filter((c) => c.id !== id) })),

  clearCookies: () => set({ cookies: [] }),

  absorbSetCookies: (headers, requestHost) => {
    const parsed = parseSetCookieHeaders(headers, requestHost);
    if (parsed.length === 0) return 0;
    set((s) => {
      const byKey = new Map(s.cookies.map((c) => [keyOf(c), c]));
      for (const p of parsed) {
        const k = keyOf(p);
        const existing = byKey.get(k);
        if (existing) {
          byKey.set(k, { ...existing, value: p.value });
        } else {
          byKey.set(k, { id: uid(), ...p });
        }
      }
      return { cookies: Array.from(byKey.values()) };
    });
    return parsed.length;
  },
});
