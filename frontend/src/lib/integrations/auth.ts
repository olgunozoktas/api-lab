/** Olgun Özoktaş geliştirdi · API Lab */
import type { Auth, AuthType, CollectionItem } from "../types";

// Build a placeholder auth config for an integration's imported
// requests. The shape matches the provider's declared auth type; the
// user fills in the secret once, in the request's Auth panel.
export function scaffoldAuth(authType: AuthType): Auth {
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
        awsSigv4: { accessKey: "", secretKey: "", region: "us-east-1", service: "" },
      };
    default:
      return { type: "none" };
  }
}

// Apply the scaffolded auth to every request node in an imported tree.
// Folder nodes pass through untouched.
export function applyAuthToItems(items: CollectionItem[], authType: AuthType): CollectionItem[] {
  return items.map((item) =>
    item.request ? { ...item, request: { ...item.request, auth: scaffoldAuth(authType) } } : item
  );
}
