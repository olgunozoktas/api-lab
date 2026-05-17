# End-to-end tests

`scripts/e2e/run.sh` drives the built api-lab binary through
zero-native's **file-based automation protocol** and asserts the
`http.request` bridge response — a true end-to-end exercise of the
process → runtime → automation server → bridge dispatch → policy →
`curl` subprocess → JSON-artifact path.

## Run it

```bash
bash scripts/e2e/run.sh
```

Inside a git worktree, `../zero-native` won't resolve — pass the
checkout explicitly:

```bash
ZERO_NATIVE_PATH=~/Herd/zero-native bash scripts/e2e/run.sh
```

The harness builds `frontend/dist/` if it is missing, builds the Zig
binary with `-Dautomation=true`, starts a local Python fixture server
(`fixtures/serve.py` serving `fixtures/hello.json`), launches the
app, and runs two cases:

1. **Happy path** — `GET` the fixture server → assert `ok:true`,
   `status:200`, and the fixture body marker.
2. **Error path** — `GET` a closed port → assert a non-zero curl
   `exit_code` and an error/`stderr` detail.

Exit 0 means both passed; any failure prints which case broke plus
the tail of the app log.

## How the protocol works

The app, built with `-Dautomation=true`, runs zero-native's
automation server. The harness and app exchange plain files under
`.zig-cache/zero-native-automation/`:

- harness writes `command.txt` (`bridge <json-envelope>`)
- app consumes it, dispatches the bridge command, writes
  `bridge-response.txt`
- app publishes `snapshot.txt` (`ready=true …`) each frame

## Scope boundary

The automation snapshot is **window-granularity only** — there is no
DOM introspection, so "the response renders in the Body tab" cannot
be asserted here. That DOM-level assertion is tracked as a separate
P3 follow-up; it needs zero-native to grow DOM introspection upstream.
