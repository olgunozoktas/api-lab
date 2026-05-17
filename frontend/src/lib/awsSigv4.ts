/** Olgun Özoktaş geliştirdi · API Lab */
// AWS Signature Version 4 — a dependency-free implementation built on
// the Web Crypto API (`crypto.subtle`), which both WKWebView and Node
// (vitest) provide. Given a request + AWS credentials it returns the
// headers to add (`Authorization`, `X-Amz-Date`,
// `X-Amz-Content-Sha256`, and `X-Amz-Security-Token` for temporary
// credentials). The signer signs exactly `host;x-amz-content-sha256;
// x-amz-date` — the minimum AWS requires — so it stays correct
// regardless of whatever other headers the request carries.
//
// Reference: https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html

export type Sigv4Input = {
  method: string;
  url: string;
  body: string;
  accessKey: string;
  secretKey: string;
  region: string;
  service: string;
  sessionToken?: string;
  /** Override the signing instant — tests pin this; production omits it. */
  now?: Date;
};

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(data)));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

// AWS canonical timestamp: `YYYYMMDDTHHMMSSZ` (UTC, no punctuation).
export function amzDate(d: Date): string {
  return d.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

// AWS URI-encodes each path segment but keeps `/`. Unreserved chars
// (RFC 3986) pass through; everything else is %XX. Pure.
export function uriEncode(s: string, encodeSlash: boolean): string {
  let out = "";
  for (const ch of s) {
    if (/[A-Za-z0-9_.~-]/.test(ch)) {
      out += ch;
    } else if (ch === "/" && !encodeSlash) {
      out += ch;
    } else {
      for (const byte of enc.encode(ch)) {
        out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return out;
}

// The canonical query string: params sorted by key, each key+value
// URI-encoded, joined with `&`. Pure.
export function canonicalQuery(search: string): string {
  const params: [string, string][] = [];
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return "";
  for (const pair of raw.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const k = eq >= 0 ? pair.slice(0, eq) : pair;
    const v = eq >= 0 ? pair.slice(eq + 1) : "";
    params.push([decodeURIComponent(k), decodeURIComponent(v)]);
  }
  params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
  return params.map(([k, v]) => `${uriEncode(k, true)}=${uriEncode(v, true)}`).join("&");
}

// Derive the SigV4 signing key — `HMAC(HMAC(HMAC(HMAC("AWS4"+secret,
// date), region), service), "aws4_request")` — returned as hex.
// Exported so the HMAC chain (the cryptographic heart of SigV4) can be
// pinned against the AWS-documented derivation example.
export async function deriveSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<string> {
  const kDate = await hmac(enc.encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  return hex(kSigning);
}

async function signingKeyBytes(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmac(enc.encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export type Sigv4Headers = { name: string; value: string }[];

// Sign the request. Returns the headers to append (or replace) before
// sending. Throws on a malformed URL.
export async function signRequestV4(input: Sigv4Input): Promise<Sigv4Headers> {
  const u = new URL(input.url);
  const now = input.now ?? new Date();
  const amz = amzDate(now);
  const dateStamp = amz.slice(0, 8);

  const payloadHash = await sha256Hex(input.body ?? "");
  const host = u.host;

  // Signed headers — minimum set, sorted lowercase.
  const signed: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amz,
  };
  if (input.sessionToken) signed["x-amz-security-token"] = input.sessionToken;
  const signedNames = Object.keys(signed).sort();
  const canonicalHeaders = signedNames.map((n) => `${n}:${signed[n]}\n`).join("");
  const signedHeaders = signedNames.join(";");

  const canonicalRequest = [
    input.method.toUpperCase(),
    uriEncode(decodeURIComponent(u.pathname) || "/", false),
    canonicalQuery(u.search),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, await sha256Hex(canonicalRequest)].join(
    "\n"
  );

  // Derive the signing key, then sign.
  const kSigning = await signingKeyBytes(input.secretKey, dateStamp, input.region, input.service);
  const signature = hex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const out: Sigv4Headers = [
    { name: "Authorization", value: authorization },
    { name: "X-Amz-Date", value: amz },
    { name: "X-Amz-Content-Sha256", value: payloadHash },
  ];
  if (input.sessionToken) {
    out.push({ name: "X-Amz-Security-Token", value: input.sessionToken });
  }
  return out;
}
