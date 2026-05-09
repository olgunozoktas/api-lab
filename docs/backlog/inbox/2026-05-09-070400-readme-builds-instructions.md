# Update README with Vite + dnpm build steps

GitHub Issue: [#6](https://github.com/olgunozoktas/api-lab/issues/6)

Existing README still has the old "just run zig build" path. New build flow needs:
- Clone both repos as siblings
- `cd frontend && dnpm install && dnpm run build && dnpm sync-dist && cd ..`
- `zig build run`

Also document the `dnpm` policy (or link to `frontend/CLAUDE.md`).

Add section: "Why two build steps?" — explain dnpm sandbox, explain dnpm sync-dist for zero-native asset access.
