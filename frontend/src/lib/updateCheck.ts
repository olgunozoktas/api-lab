/** Olgun Özoktaş geliştirdi · API Lab */
// Launch-time update check. Queries the GitHub Releases API once for
// the latest release and compares it to APP_VERSION. Privacy-conscious
// by design: a single best-effort GET, no telemetry, opt-out via the
// `ui.updateCheck` setting. Every failure is swallowed — a check that
// can't complete never bothers the user.

import { useEffect, useState } from "react";
import { bridge } from "./bridge";
import type { HttpResponse } from "./bridge";
import { APP_VERSION, cmpVersion } from "./changelog";
import { useStore } from "../store";

const RELEASES_API = "https://api.github.com/repos/olgunozoktas/api-lab/releases/latest";

export type UpdateInfo = {
  available: boolean;
  latestVersion: string;
  url: string;
};

// Extract `{version, url}` from a GitHub "latest release" API payload.
// Returns null when the JSON is malformed or missing `tag_name`. Pure.
export function parseLatestRelease(json: string): { version: string; url: string } | null {
  try {
    const obj = JSON.parse(json) as { tag_name?: unknown; html_url?: unknown };
    const tag = typeof obj.tag_name === "string" ? obj.tag_name : "";
    const url = typeof obj.html_url === "string" ? obj.html_url : "";
    if (!tag) return null;
    return { version: tag, url };
  } catch {
    return null;
  }
}

// True when `latestTag` is a newer release than `current`. Tolerant of
// a `v` prefix on either side (cmpVersion strips it). Pure.
export function isUpdateAvailable(current: string, latestTag: string): boolean {
  return cmpVersion(latestTag, current) > 0;
}

// One best-effort GET to the GitHub Releases API. Routes through the
// native bridge (CORS-free) when available, else browser fetch.
async function fetchLatestReleaseBody(): Promise<string | null> {
  try {
    if (bridge.available) {
      const r = await bridge.invoke<HttpResponse>("http.request", {
        method: "GET",
        url: RELEASES_API,
        headers: [{ name: "Accept", value: "application/vnd.github+json" }],
        body: null,
        timeout_ms: 10000,
        follow_redirects: 5,
      });
      if (r.error || r.status < 200 || r.status >= 300) return null;
      return r.body ?? null;
    }
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Check for a newer release. Returns null on any failure (offline,
// rate-limited, malformed) — the caller treats null as "no update".
export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  const body = await fetchLatestReleaseBody();
  if (!body) return null;
  const rel = parseLatestRelease(body);
  if (!rel) return null;
  return {
    available: isUpdateAvailable(currentVersion, rel.version),
    latestVersion: rel.version,
    url: rel.url,
  };
}

// Runs the check once on mount when the `ui.updateCheck` setting is on
// (the default). Returns the update info only when a newer release
// exists — otherwise null, so the caller renders nothing.
export function useUpdateCheck(): UpdateInfo | null {
  const enabled = useStore((s) => s.ui.updateCheck !== false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void checkForUpdate(APP_VERSION).then((r) => {
      if (!cancelled && r?.available) setInfo(r);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return info;
}
