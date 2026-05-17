#!/usr/bin/env python3
# Olgun Özoktaş geliştirdi · API Lab
#
# E2E fixture server. Binds an ephemeral port (0 → OS picks a free
# one), writes the chosen port to the path given as argv[2] so the
# shell harness can read it, then serves argv[1] as a static dir.
#
# Used by scripts/e2e/run.sh for the happy-path http.request case —
# keeps the E2E offline and deterministic (no httpbin, no network).

import http.server
import sys
import os


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: serve.py <dir> <port-file>", file=sys.stderr)
        return 2

    serve_dir, port_file = sys.argv[1], sys.argv[2]
    os.chdir(serve_dir)

    # Port 0 → kernel assigns a free port; read it back off the socket.
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]

    with open(port_file, "w", encoding="utf-8") as handle:
        handle.write(str(port))

    print(f"e2e fixture server on 127.0.0.1:{port} ({serve_dir})", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
