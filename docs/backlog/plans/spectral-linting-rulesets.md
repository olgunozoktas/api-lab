# Plan — Spectral linting + custom rulesets

For: `docs/backlog/P2-2026-05-09-171600-spectral-linting-rulesets.md`

## Dependency spike (done)

`@stoplight/spectral-core` + `-parsers` + `-rulesets` + `@codemirror/lint`
installed via `dnpm install` (153 packages, security check passed).
`lib/spectralLint.ts` written + 9 vitest cases green — the Spectral
API (`new Spectral().setRuleset({extends:[[oas,"all"]],rules})` +
`Document` + `run`) works and a custom ruleset disables a rule.

## Item 3 reinterpretation

The backlog's "`.spectral.yaml` next to the spec → loaded
automatically" assumes a filesystem-adjacent file. api-lab specs are
in-memory tabs (`SpecTabState {text, fileName}`) — there is no "next
to". Item 4's in-app rule editor IS the custom-ruleset mechanism: the
ruleset YAML is persisted on the spec tab and applied automatically on
every lint pass. The filesystem variant is N/A for api-lab's model;
the user-facing capability (custom rulesets, auto-applied) is fully
delivered.

## Architecture

- `lib/spectralLint.ts` (done) — `lintSpec(text, isJson, customYaml?)`
  → `LintFinding[]` (lazy-imports Spectral). Custom rulesets layer a
  `rules` override map onto the built-in `oas` ruleset — disable a
  rule (`false`/`off`) or re-grade severity. Full new-rule authoring
  (JSONPath `given`/`then`) is out of scope (needs the heavyweight
  ruleset bundler); the acceptance only needs rule on/off + severity.
- `lib/types.ts` — `SpecTabState` gains `ruleset?: string`.
- `store/tabs.ts` — `updateSpecRuleset(id, yaml)` action (sibling of
  `updateSpecText`); persisted with the tab.
- `ui/code-editor.tsx` — new `diagnostics` prop + `@codemirror/lint`
  `lintGutter()`; an effect converts line/col findings to offsets and
  `setDiagnostics` — gutter markers + inline underlines.
- `components/SpecSidePanel.tsx` (NEW) — extracted from OpenApiEditor
  (the file is already 313 lines; K.2 would blow the 400 cap). Holds
  the validation issues + a new **Spectral lint** section + the
  operations outline.
- `components/OpenApiEditor.tsx` — slimmed; the debounced edit pass
  also runs `lintSpec`; feeds diagnostics to `CodeEditor`; an "Edit
  ruleset" button opens the modal.
- `components/SpecRulesetModal.tsx` (NEW) — the in-app rule editor: a
  YAML `CodeEditor`, live `parseCustomRuleset` validation, save →
  `updateSpecRuleset`.
- i18n: `spec.lint.*` keys in `tr.ts` + `en.ts`.

## Reuse (inline audit)

- `OpenApiEditor` debounced parse/validate effect — EXTEND with the
  lint call.
- `CodeEditor` — EXTEND with a diagnostics prop.
- `Dialog`/`Button`/`CodeEditor` primitives, `updateSpecText` pattern
  — REUSE.
- `validateSpec` (zero-dep structural) — KEEP; Spectral is additive,
  not a replacement (structural parse-errors still gate "Convert").

## Edge cases

- Spectral run is async (~200 ms) — runs in the existing 300 ms
  debounce; a "linting…" state covers the gap.
- Invalid spec (parse error) → skip the lint pass (Spectral needs a
  parseable doc); the structural validator already surfaces the error.
- Invalid ruleset YAML → caught, surfaced in the modal; lint falls
  back to the built-in `oas` ruleset.

## Changelog + version

User-visible (new linting surface) → changelog entry + **minor** bump
(0.9.0 → 0.10.0).

## Verification

`dnpm run typecheck` + `test` + `build` green — the **build** is the
real gate (Spectral must bundle for the WKWebView). `./build.sh` →
open a thin spec, confirm Spectral warnings in the panel + gutter,
edit the ruleset to disable one, confirm it clears.
