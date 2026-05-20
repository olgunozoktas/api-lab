/** Olgun Özoktaş geliştirdi · API Lab */
import type { Auth, AuthType, CollectionItem } from "../types";

// Optional hints an integration can carry for its auth scaffolding.
// At present only `sigv4Service` is used — an AWS S3 integration
// pre-fills `service: "s3"` so the user doesn't have to type it on
// every imported request. Bearer / apikey / basic don't need hints
// (their structure is fully determined by the type itself).
export type AuthHints = {
  sigv4Service?: string;
};

// Build a placeholder auth config for an integration's imported
// requests. The shape matches the provider's declared auth type; the
// user fills in the secret once, in the request's Auth panel.
export function scaffoldAuth(authType: AuthType, hints: AuthHints = {}): Auth {
  switch (authType) {
    case "bearer":
      return { type: "bearer", token: "" };
    case "apikey":
      return { type: "apikey", header: "X-API-Key", value: "" };
    case "basic":
      return { type: "basic", user: "", pass: "" };
    case "aws-sigv4":
      return {
        type: "aws-sigv4",
        awsSigv4: {
          accessKey: "",
          secretKey: "",
          region: "us-east-1",
          service: hints.sigv4Service ?? "",
        },
      };
    default:
      return { type: "none" };
  }
}

// Apply the scaffolded auth to every request node in an imported tree.
// Folder nodes pass through untouched. Hints (`sigv4Service` etc) are
// passed through so per-provider details (e.g. AWS service name) land
// pre-filled.
export function applyAuthToItems(
  items: CollectionItem[],
  authType: AuthType,
  hints: AuthHints = {}
): CollectionItem[] {
  return items.map((item) =>
    item.request
      ? { ...item, request: { ...item.request, auth: scaffoldAuth(authType, hints) } }
      : item
  );
}
