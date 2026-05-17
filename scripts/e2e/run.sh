#!/usr/bin/env bash
# Olgun Özoktaş geliştirdi · API Lab
#
# End-to-end test harness. Drives api-lab through zero-native's
# file-based automation protocol and asserts the `http.request`
# bridge response — exercising the full process → runtime →
# automation server → bridge dispatch → policy → curl → JSON path.
#
# Each case pre-seeds `command.txt` and launches the app fresh: the
# app's WKWebView host is event-driven and does not tick frames when
# idle, so a command must be present before launch for the startup
# frames to consume it (the pattern zero-native's own webview smoke
# test uses). The bridge dispatch — including the synchronous curl
# subprocess — completes inside that startup frame and writes
# `bridge-response.txt` before the app goes idle.
#
# What it does NOT assert: DOM rendering ("response in the Body
# tab"). zero-native's automation snapshot is window-granularity
# only — no DOM introspection. A P3 follow-up tracks that gap.
#
# Usage:  bash scripts/e2e/run.sh
# Env:    ZERO_NATIVE_PATH  path to the zero-native checkout
#                           (default ../zero-native)
#
# Exit 0 = both cases passed. Non-zero = a case failed (the message
# on stderr names which). CI fails the workflow on non-zero.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

ZERO_NATIVE_PATH="${ZERO_NATIVE_PATH:-../zero-native}"
AUTOMATION_DIR=".zig-cache/zero-native-automation"
APP_BIN="zig-out/bin/api-lab"
FIXTURE_DIR="$REPO_ROOT/scripts/e2e/fixtures"
PORT_FILE="$(mktemp)"

SERVER_PID=""
RESPONSE=""

note() { echo "→ $*"; }
fail() {
  echo "✗ E2E: $*" >&2
  for log in "$REPO_ROOT"/.zig-cache/e2e-app.*.log; do
    [ -f "$log" ] || continue
    echo "--- tail of $log ---" >&2
    tail -n 15 "$log" >&2 || true
  done
  exit 1
}

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait >/dev/null 2>&1 || true
  rm -f "$PORT_FILE"
}
trap cleanup EXIT

# --- 1. Frontend assets (the WebView source must resolve) ----------
if [ ! -f frontend/dist/index.html ]; then
  note "frontend/dist missing — building it"
  if command -v dnpm >/dev/null 2>&1; then
    # dnpm builds into a Docker volume — sync-dist copies dist/ to the host.
    ( cd frontend && dnpm run build && dnpm sync-dist )
  else
    ( cd frontend && npm run build )
  fi
fi
[ -f frontend/dist/index.html ] || fail "frontend/dist/index.html still missing after build"

# --- 2. Build the app with the automation server enabled -----------
note "building api-lab (-Dautomation=true -Djs-bridge=true)"
zig build -Dautomation=true -Djs-bridge=true -Dzero-native-path="$ZERO_NATIVE_PATH"
[ -x "$APP_BIN" ] || fail "build did not produce $APP_BIN"

# --- 3. A free-but-closed port for the error-path case -------------
# Bind port 0, read the assigned port, close it — the port is now
# guaranteed unbound, so curl gets a deterministic connection refusal.
CLOSED_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
[ -n "$CLOSED_PORT" ] || fail "could not reserve a closed port"

# --- 4. Start the fixture HTTP server ------------------------------
note "starting fixture server"
python3 "$FIXTURE_DIR/serve.py" "$FIXTURE_DIR" "$PORT_FILE" &
SERVER_PID=$!
for _ in $(seq 1 50); do [ -s "$PORT_FILE" ] && break; sleep 0.1; done
FIXTURE_PORT="$(cat "$PORT_FILE" 2>/dev/null || true)"
[ -n "$FIXTURE_PORT" ] || fail "fixture server never reported its port"
note "fixture server on 127.0.0.1:$FIXTURE_PORT"

# run_case <name> <json-envelope> — pre-seed command.txt, launch the
# app fresh, capture bridge-response.txt into $RESPONSE, kill the app.
run_case() {
  local name="$1" request="$2" log="$REPO_ROOT/.zig-cache/e2e-app.$1.log"
  mkdir -p "$AUTOMATION_DIR"
  rm -f "$AUTOMATION_DIR"/*.txt
  printf 'bridge %s\n' "$request" >"$AUTOMATION_DIR/command.txt"

  "$APP_BIN" >"$log" 2>&1 &
  local pid=$!
  RESPONSE=""
  for _ in $(seq 1 200); do
    if [ -s "$AUTOMATION_DIR/bridge-response.txt" ]; then
      RESPONSE="$(cat "$AUTOMATION_DIR/bridge-response.txt")"
      break
    fi
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.1
  done
  kill "$pid" >/dev/null 2>&1 || true
  wait "$pid" >/dev/null 2>&1 || true
  [ -n "$RESPONSE" ] || fail "$name: app produced no bridge-response.txt"
}

# --- 5. Happy path: GET a local fixture, expect 200 + body ---------
note "case 1 — happy path (http.request → fixture server)"
run_case happy \
  "{\"id\":\"e2e-happy\",\"command\":\"http.request\",\"payload\":{\"method\":\"GET\",\"url\":\"http://127.0.0.1:${FIXTURE_PORT}/hello.json\",\"headers\":[],\"timeout_ms\":5000}}"
echo "  response: $RESPONSE"
case "$RESPONSE" in
  *'"ok":true'*) ;;
  *) fail "happy-path: response not ok — $RESPONSE" ;;
esac
case "$RESPONSE" in
  *'"status":200'*) ;;
  *) fail "happy-path: expected status 200 — $RESPONSE" ;;
esac
case "$RESPONSE" in
  *'E2E_FIXTURE_OK'*) ;;
  *) fail "happy-path: fixture body marker missing — $RESPONSE" ;;
esac
note "case 1 passed"

# --- 6. Error path: GET a closed port, expect curl failure ---------
note "case 2 — error path (http.request → closed port)"
run_case error \
  "{\"id\":\"e2e-error\",\"command\":\"http.request\",\"payload\":{\"method\":\"GET\",\"url\":\"http://127.0.0.1:${CLOSED_PORT}/\",\"headers\":[],\"timeout_ms\":3000}}"
echo "  response: $RESPONSE"
case "$RESPONSE" in
  *exit_code*) ;;
  *) fail "error-path: response missing exit_code — $RESPONSE" ;;
esac
case "$RESPONSE" in
  *'"exit_code":0'*) fail "error-path: curl unexpectedly succeeded — $RESPONSE" ;;
esac
case "$RESPONSE" in
  *stderr*|*error*) ;;
  *) fail "error-path: response missing error/stderr detail — $RESPONSE" ;;
esac
note "case 2 passed"

echo "✓ E2E: both cases passed"
