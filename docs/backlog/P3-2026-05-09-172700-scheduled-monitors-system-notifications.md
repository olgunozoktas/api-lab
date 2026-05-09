# Phase L.3 — Scheduled monitors + system notifications

Priority: P3

## Context

Postman cloud's monitors run a collection on cron, alert when something fails. We can do this locally: macOS launchd job that fires the CLI runner (Phase H.4) on a schedule, persists results, posts a system notification on failure.

## Items

- [ ] Monitor config UI: pick a collection, set schedule (cron expr or simpler "every N minutes/hours"), env, alert preference
- [ ] Translate config → launchd plist; install via new bridge command `monitor.install({plist})`
- [ ] Result persistence: each run stores `{ts, status, durationMs, failedRequests[]}` in IndexedDB
- [ ] Notifications: macOS UNUserNotificationCenter for failures; web notification fallback for cross-platform
- [ ] In-app dashboard: list of active monitors, last result per monitor, on/off toggle
- [ ] Disable monitor on uninstall: launchd unload + plist removal

## Acceptance

User sets up a monitor that hits an API every 5 minutes — sees a green dot in the dashboard. Take the API down → next run shows red + a system notification fires.

## Tradeoffs

launchd is macOS-only. Linux equivalent (systemd timer) + Windows (Task Scheduler) deferred until Phase N.

## How to work on this

1. Phase H.4 (CLI runner) first — monitors call it.
2. macOS launchd plist format: well-documented; emit XML.
