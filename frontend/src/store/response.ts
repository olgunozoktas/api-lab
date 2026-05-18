/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { ResponseSnapshot } from "../lib/types";
import type { Store, StoreMutators } from "./types";
import type { ToastOptions } from "../lib/toast";
import {
  enqueueToast,
  removeToast,
  TOAST_ACTION_DURATION,
  TOAST_DEFAULT_DURATION,
} from "../lib/toast";
import { uid } from "../lib/utils";
import { putBounded, RESPONSE_CACHE_CAP } from "./responseCache";

export type ResponseActions = {
  setLastResponse: (r: ResponseSnapshot | null) => void;
  // Push a toast onto the bounded queue. `opts` is optional — a bare
  // `showToast(msg)` yields an `info` toast, so existing callers need
  // no change.
  showToast: (msg: string, opts?: ToastOptions) => void;
  dismissToast: (id: string) => void;
};

export const createResponseSlice: StateCreator<Store, StoreMutators, [], ResponseActions> = (
  set
) => ({
  setLastResponse: (r) =>
    set((s) => {
      // Remember this response against the active request's saved id
      // so re-selecting the request later restores it. Only saved
      // requests have an id; unsaved / history / sample requests
      // (id === null) and cleared responses (r === null) are skipped.
      const cacheId = s.current.id;
      const responseCache =
        r !== null && cacheId
          ? putBounded(s.responseCache, cacheId, r, RESPONSE_CACHE_CAP)
          : s.responseCache;
      return {
        lastResponse: r,
        responseCache,
        tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, lastResponse: r } : t)),
      };
    }),

  showToast: (msg, opts) =>
    set((s) => ({
      toasts: enqueueToast(s.toasts, {
        id: uid(),
        msg,
        severity: opts?.severity ?? "info",
        action: opts?.action,
        duration: opts?.duration ?? (opts?.action ? TOAST_ACTION_DURATION : TOAST_DEFAULT_DURATION),
        ts: Date.now(),
      }),
    })),

  dismissToast: (id) => set((s) => ({ toasts: removeToast(s.toasts, id) })),
});
