/** Olgun Özoktaş geliştirdi · API Lab */
//
// Spectral OpenAPI linting. `@stoplight/spectral-core` + the built-in
// `oas` ruleset are ~500 KB, so everything here is reached only via a
// dynamic import — the spec editor lazy-loads `lintSpec` so Spectral
// never lands in the first-paint bundle.
//
// Custom rulesets: the in-app editor takes a YAML ruleset that layers
// on top of the built-in `oas` rules — the `rules` override map
// (turn a rule off with `false`, or re-grade it to `error` / `warn` /
// `info` / `hint` / `off`). That covers the common "tune the defaults
// for this project" need without pulling in the heavyweight ruleset
// bundler/migrator that authoring brand-new JSONPath rules would
// require.

import { parse as parseYaml } from "yaml";

export type LintSeverity = "error" | "warning" | "info" | "hint";

export type LintFinding = {
  code: string;
  message: string;
  severity: LintSeverity;
  // 0-based CodeMirror-friendly coordinates.
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  path: string;
};

// Spectral's DiagnosticSeverity enum is numeric: 0 Error, 1 Warning,
// 2 Information, 3 Hint. Anything else → treated as a warning.
function mapSeverity(n: number): LintSeverity {
  if (n === 0) return "error";
  if (n === 2) return "info";
  if (n === 3) return "hint";
  return "warning";
}

// Parse a custom-ruleset YAML string into the `rules` override map
// Spectral accepts. Throws with a readable message on bad YAML.
export function parseCustomRuleset(yamlText: string): Record<string, unknown> {
  const trimmed = yamlText.trim();
  if (!trimmed) return {};
  let doc: unknown;
  try {
    doc = parseYaml(trimmed);
  } catch (e) {
    throw new Error(`Invalid ruleset YAML: ${(e as Error).message}`);
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("Ruleset must be a YAML object");
  }
  const rules = (doc as Record<string, unknown>).rules;
  if (rules === undefined) return {};
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    throw new Error("`rules` must be a YAML object");
  }
  return rules as Record<string, unknown>;
}

// Lint an OpenAPI spec. `customRulesetYaml`, when given, layers its
// `rules` overrides on top of the built-in `oas` ruleset.
export async function lintSpec(
  text: string,
  isJson: boolean,
  customRulesetYaml?: string
): Promise<LintFinding[]> {
  if (!text.trim()) return [];

  const overrides = customRulesetYaml ? parseCustomRuleset(customRulesetYaml) : {};

  const [{ Spectral, Document }, parsers, rulesets] = await Promise.all([
    import("@stoplight/spectral-core"),
    import("@stoplight/spectral-parsers"),
    import("@stoplight/spectral-rulesets"),
  ]);

  const spectral = new Spectral();
  // Spectral's published RulesetDefinition types are stricter than the
  // runtime accepts for this "extend oas + override rules" shape, so
  // the ruleset is cast — the behaviour is pinned by the unit tests in
  // __tests__/spectralLint.test.ts.
  const ruleset = { extends: [[rulesets.oas, "all"]], rules: overrides };
  spectral.setRuleset(ruleset as unknown as Parameters<typeof spectral.setRuleset>[0]);

  const parser = (isJson ? parsers.Json : parsers.Yaml) as typeof parsers.Json;
  const doc = new Document(text, parser, "spec");
  const results = await spectral.run(doc);

  return results.map((r) => ({
    code: String(r.code ?? ""),
    message: r.message,
    severity: mapSeverity(r.severity),
    startLine: r.range.start.line,
    startCol: r.range.start.character,
    endLine: r.range.end.line,
    endCol: r.range.end.character,
    path: Array.isArray(r.path) ? r.path.join(".") : "",
  }));
}
