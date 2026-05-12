/** Olgun Özoktaş geliştirdi · API Lab */
// OAuth 2.0 helpers — pure functions used by the AuthPanel OAuth sub-panel
// and (eventually) the popup flow once zero-native gains the primitive.
//
// Today's surface (v1 helper):
//   - PKCE generators: random verifier (43-128 chars) + SHA-256 challenge
//     (base64url, no padding). Wired but only consumed by tests until the
//     full popup flow ships — backlog P2 follow-up.
//   - tokenExchangeBody / refreshTokenBody — application/x-www-form-urlencoded
//     payload builders that match the OAuth 2.1 spec for code-exchange and
//     refresh-token grants. Used by the Refresh button in AuthPanel and
//     (later) by the popup flow.
//   - parseTokenResponse — robust JSON-or-form-encoded parsing of the
//     token endpoint's response. Many providers return JSON; some legacy
//     ones return application/x-www-form-urlencoded; this normalizes.

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToBase64Url(bytes: Uint8Array): string {
  // Manual base64url (no padding) — avoids depending on btoa+replace which
  // breaks on Unicode-shaped inputs.
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++] ?? 0;
    const b2 = bytes[i++] ?? 0;
    const b3 = bytes[i++] ?? 0;
    out += BASE64URL_ALPHABET[b1 >> 2];
    out += BASE64URL_ALPHABET[((b1 & 0x03) << 4) | (b2 >> 4)];
    if (i - 2 < bytes.length) {
      out += BASE64URL_ALPHABET[((b2 & 0x0f) << 2) | (b3 >> 6)];
    }
    if (i - 1 < bytes.length) {
      out += BASE64URL_ALPHABET[b3 & 0x3f];
    }
  }
  return out;
}

// Generate a random PKCE code_verifier. RFC 7636 mandates 43-128 chars
// from the unreserved set [A-Z][a-z][0-9]-._~. We use 64 random bytes
// → base64url (which produces ~86 chars), trimmed if needed.
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes).slice(0, 128);
}

// Derive the S256 code_challenge from a verifier. Uses Web Crypto's
// SHA-256, available in WKWebView under the `zero://app` origin.
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const enc = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return bytesToBase64Url(new Uint8Array(hash));
}

// Build the form-urlencoded body for the authorization-code-grant token
// exchange. Used by the popup flow (when it ships) and by the manual
// "I have a code" paste flow.
export type TokenExchangeInput = {
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret?: string; // public PKCE clients omit
  code_verifier?: string; // PKCE flow
};

export function tokenExchangeBody(input: TokenExchangeInput): string {
  const params = new URLSearchParams();
  params.set("grant_type", "authorization_code");
  params.set("code", input.code);
  params.set("redirect_uri", input.redirect_uri);
  params.set("client_id", input.client_id);
  if (input.client_secret) params.set("client_secret", input.client_secret);
  if (input.code_verifier) params.set("code_verifier", input.code_verifier);
  return params.toString();
}

// Refresh-token body. The user already has a refresh_token (from a
// previous exchange or a copy-paste from another tool); we POST it to
// the token endpoint to swap for a fresh access_token.
export type RefreshTokenInput = {
  refresh_token: string;
  client_id: string;
  client_secret?: string;
  scope?: string;
};

export function refreshTokenBody(input: RefreshTokenInput): string {
  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", input.refresh_token);
  params.set("client_id", input.client_id);
  if (input.client_secret) params.set("client_secret", input.client_secret);
  if (input.scope) params.set("scope", input.scope);
  return params.toString();
}

// Parse the token endpoint's response. Most providers return JSON
// (`{access_token, refresh_token?, expires_in?, ...}`), but a handful
// of legacy / weird providers return application/x-www-form-urlencoded.
// We normalize both shapes into the same TS type.
export type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export function parseTokenResponse(raw: string): TokenResponse {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      return obj as TokenResponse;
    } catch {
      // fall through to form parser
    }
  }
  const params = new URLSearchParams(trimmed);
  const out: Record<string, string | number> = {};
  for (const [k, v] of params.entries()) {
    if (k === "expires_in") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) out[k] = n;
    } else {
      out[k] = v;
    }
  }
  return out as TokenResponse;
}

// Convert `expires_in` (seconds) into an absolute epoch-ms timestamp the
// store can persist + display. Subtract a small skew so we refresh
// shortly before the server-side expiry, not after.
export function expiresInToEpoch(expires_in: number, skewSeconds: number = 30): number {
  return Date.now() + Math.max(0, expires_in - skewSeconds) * 1000;
}

// Human-friendly relative-time renderer for the AuthPanel's expiry
// indicator. Returns strings like "expires in 42 min" / "expired 5 min ago".
export function formatExpiry(
  expiresAt: number | undefined,
  now: number = Date.now()
): {
  expired: boolean;
  text: string;
  ms: number;
} {
  if (!expiresAt) return { expired: false, text: "no expiry set", ms: 0 };
  const ms = expiresAt - now;
  const expired = ms <= 0;
  const abs = Math.abs(ms);
  const min = Math.floor(abs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  let unit: string;
  if (day >= 1) unit = `${day}d`;
  else if (hr >= 1) unit = `${hr}h ${min % 60}m`;
  else unit = `${min}m`;
  return {
    expired,
    text: expired ? `expired ${unit} ago` : `expires in ${unit}`,
    ms,
  };
}
