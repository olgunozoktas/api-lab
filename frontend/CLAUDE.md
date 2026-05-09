# CLAUDE.md

## dnpm — Secure Docker NPM

**All npm/Node.js commands MUST run through `dnpm`. NEVER run `npm`, `npx`, `yarn`, `pnpm`, or `node` directly on the host. This is non-negotiable.**

```bash
dnpm setup              # First-time: build image + install deps (two-phase + auto-check)
dnpm ci                 # Clean install from lockfile (two-phase + auto-check)
dnpm install <pkg>      # Add a package (two-phase + auto-check)
dnpm run dev            # Start dev server
dnpm run build          # Production build (zero network access)
dnpm run <script>       # Run any package.json script
dnpm isolated <cmd>     # Run offline (no network, RO source + node_modules)
                        # — use for tsc, eslint, vitest, jest, any lint/typecheck
dnpm check              # Full security scan (audit + signatures + Socket + CVEs)
dnpm sync               # Copy node_modules to host (React Native / Expo only)
dnpm sync-dist          # Copy dist/ + .astro/ from Docker volumes to host
                        # — only when deploying from host (Vercel CLI, etc.)
dnpm shell              # Debug shell inside container
dnpm nuke               # Remove all volumes and rebuild from scratch
```

### Hard rules (apply to Claude Code sessions AND to the human)

1. **NEVER** run `npm install`, `npm ci`, `npm run`, `npm exec`, `npx`, `yarn`, `pnpm`, or `bun` on the host. Always `dnpm <cmd>`.
2. **NEVER** run `node <script>` on the host. Run via `dnpm run <script>` or `dnpm isolated npx node <script>`.
3. **NEVER** execute binaries from `./node_modules/.bin/` on the host. Use `dnpm shell` or `dnpm isolated`.
4. **NEVER** execute compiled output on the host (e.g., `node ./dist/server.js`). Run inside the container only.
5. **NEVER** run `docker compose` directly against `docker-compose.node.yml`. Use `dnpm` subcommands.
6. If `docker-compose.node.yml` is missing, run `dnpm setup` — DO NOT fall back to host `npm install`.
7. `node_modules`, `dist`, `.astro` live in Docker volumes — NOT on the host filesystem. Use `dnpm sync` / `dnpm sync-dist` only when a host tool genuinely needs them.
8. After adding packages or modifying `package.json`, verify with `dnpm check`.
9. If a package requires network during postinstall (puppeteer, playwright, sharp pre-built binary download), use the package's SKIP_DOWNLOAD env var or equivalent — do not bypass `dnpm`.
10. Prefer `dnpm isolated` for typecheck / lint / unit-test loops — it's faster (no network stack) AND tighter (RO source + RO node_modules + no network).

### Why (threat model in one paragraph)

Malicious npm packages (the #1 supply-chain vector today: lockfile typosquats, postinstall scripts, compromised maintainer accounts) run inside a hardened Linux container with: non-root UID, all Linux capabilities dropped, custom seccomp profile, read-only rootfs, read-only project mount, tmpfs with noexec, pinned npm registry, two-phase install (download scripts-off, rebuild offline), and auto-audit after every install. Docker socket is NOT mounted (the main container-escape vector). Package code cannot reach macOS input devices (no keylogger), cannot read `~/.ssh`/`~/.aws`/`~/.gnupg` (not mounted), cannot modify your source files (read-only mount), cannot exfiltrate during builds (network_mode: none). Running `npm` directly on the host bypasses ALL of this.
