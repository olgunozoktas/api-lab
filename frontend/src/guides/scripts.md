---
title: Pre / post-request scripts — pm.* sandbox
group: Automation
order: 1
---

The **Scripts** sub-tab in the composer runs JavaScript before the
request goes out (pre-request) and after the response lands
(post-response / test). Scripts execute inside a QuickJS sandbox
with a Postman-compatible `pm.*` API subset.

## Pre-request — mutate before send

```js
// Set a header dynamically based on env state
pm.request.headers.add({
  key: "X-Trace-Id",
  value: pm.variables.get("trace_id") + "-" + Date.now(),
});

// Override the body conditionally
if (pm.environment.get("env_name") === "staging") {
  pm.request.body.update("{}"); // empty out body for staging probes
}
```

Pre-request scripts can:

- Read / write env + collection variables
- Mutate request headers / params / body
- Compute signatures / HMACs (no network access)

## Post-response — assert + extract

```js
pm.test("status is 200", () => {
  pm.expect(pm.response.code).to.equal(200);
});

pm.test("body has user id", () => {
  const j = pm.response.json();
  pm.expect(j.user.id).to.be.a("string");
  pm.environment.set("user_id", j.user.id);
});
```

Post-response scripts can:

- Run `pm.test(name, fn)` assertions — pass/fail tally surfaces
  inline in the panel
- Extract values into env variables for chained requests
- `console.log()` to the in-tab console (right pane of the Scripts
  panel)

## Sandbox limits

- 5 second CPU budget per script (hard timeout)
- 10 MB heap
- No `fetch`, no `XHR`, no `eval`, no DOM, no IO — only synchronous
  pm.\* calls + standard JS (Math, JSON, Date, etc.)
- Each request gets a fresh sandbox; no state leaks between
  consecutive sends

Failures don't block the request flow — a runtime error renders
inline (red banner with stack), but the actual HTTP / WS / gRPC
call still completes.
