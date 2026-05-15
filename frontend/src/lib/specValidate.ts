/** Olgun Özoktaş geliştirdi · API Lab */
// Structural OpenAPI 3.x validator.
//
// A hand-rolled structural check — consistent with api-lab's zero-dep
// importer suite — rather than full JSON-Schema meta-schema validation
// (which would pull in ajv + the bundled OAS dialect schemas). It
// catches the spec mistakes that actually bite: missing required
// fields, malformed path keys, operations with no responses, broken
// local $refs, and duplicate operationIds. Deeper meta-schema
// validation can land as a follow-up if it's ever wanted.
//
// `validateSpec` takes an already-parsed document (the caller parses
// YAML/JSON) so this module stays free of the yaml dependency.

export type SpecSeverity = "error" | "warning";
export type SpecIssue = { path: string; message: string; severity: SpecSeverity };

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options", "trace"];

type AnyObj = Record<string, unknown>;

function isObj(v: unknown): v is AnyObj {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// True iff a local JSON Pointer (`#/a/b`) resolves to something in doc.
function resolvePointer(doc: AnyObj, ref: string): boolean {
  let cur: unknown = doc;
  for (const part of ref
    .slice(2)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (!isObj(cur) && !Array.isArray(cur)) return false;
    cur = (cur as AnyObj)[part];
    if (cur === undefined) return false;
  }
  return true;
}

// Walk the whole document, flag every local `#/...` $ref that doesn't
// resolve. External refs are left alone — the importer skips those by
// design, so they're not a validation error here.
function checkRefs(doc: AnyObj, issues: SpecIssue[]): void {
  const flagged = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isObj(node)) return;
    const ref = node.$ref;
    if (typeof ref === "string" && ref.startsWith("#/") && !flagged.has(ref)) {
      if (!resolvePointer(doc, ref)) {
        flagged.add(ref);
        issues.push({ path: ref, message: `Unresolved $ref: ${ref}`, severity: "error" });
      }
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(doc);
}

/** Structurally validate a parsed OpenAPI 3.x document. Returns every
    issue found — an empty array means no structural problems. */
export function validateSpec(doc: unknown): SpecIssue[] {
  const issues: SpecIssue[] = [];
  if (!isObj(doc)) {
    return [{ path: "", message: "Document is not an object.", severity: "error" }];
  }

  const ver = doc.openapi;
  if (typeof ver !== "string") {
    issues.push({
      path: "openapi",
      message: "Missing `openapi` version string.",
      severity: "error",
    });
  } else if (!ver.startsWith("3.")) {
    issues.push({
      path: "openapi",
      message: `Unsupported OpenAPI version "${ver}" — need 3.x.`,
      severity: "error",
    });
  }

  if (!isObj(doc.info)) {
    issues.push({ path: "info", message: "Missing `info` object.", severity: "error" });
  } else {
    if (typeof doc.info.title !== "string" || doc.info.title === "") {
      issues.push({ path: "info.title", message: "Missing `info.title`.", severity: "error" });
    }
    if (typeof doc.info.version !== "string" || doc.info.version === "") {
      issues.push({
        path: "info.version",
        message: "Missing `info.version`.",
        severity: "warning",
      });
    }
  }

  if (Array.isArray(doc.servers)) {
    doc.servers.forEach((s, i) => {
      if (!isObj(s) || typeof s.url !== "string" || s.url === "") {
        issues.push({
          path: `servers[${i}]`,
          message: `Server ${i} has no \`url\`.`,
          severity: "warning",
        });
      }
    });
  }

  if (!isObj(doc.paths)) {
    issues.push({ path: "paths", message: "Missing `paths` object.", severity: "error" });
  } else {
    const pathKeys = Object.keys(doc.paths);
    if (pathKeys.length === 0) {
      issues.push({ path: "paths", message: "Spec defines no paths.", severity: "warning" });
    }
    const opIds = new Map<string, string>();
    for (const pk of pathKeys) {
      if (!pk.startsWith("/")) {
        issues.push({
          path: `paths.${pk}`,
          message: `Path "${pk}" should start with "/".`,
          severity: "warning",
        });
      }
      const item = (doc.paths as AnyObj)[pk];
      if (!isObj(item)) {
        issues.push({
          path: `paths.${pk}`,
          message: `Path item "${pk}" is not an object.`,
          severity: "error",
        });
        continue;
      }
      for (const m of HTTP_METHODS) {
        const op = item[m];
        if (op === undefined) continue;
        const where = `${m.toUpperCase()} ${pk}`;
        if (!isObj(op)) {
          issues.push({
            path: `paths.${pk}.${m}`,
            message: `Operation ${where} is not an object.`,
            severity: "error",
          });
          continue;
        }
        if (!isObj(op.responses) || Object.keys(op.responses).length === 0) {
          issues.push({
            path: `paths.${pk}.${m}`,
            message: `${where} declares no responses.`,
            severity: "warning",
          });
        }
        const opId = op.operationId;
        if (typeof opId === "string" && opId !== "") {
          const prev = opIds.get(opId);
          if (prev) {
            issues.push({
              path: `paths.${pk}.${m}`,
              message: `Duplicate operationId "${opId}" — also on ${prev}.`,
              severity: "error",
            });
          } else {
            opIds.set(opId, where);
          }
        }
      }
    }
  }

  checkRefs(doc, issues);
  return issues;
}
