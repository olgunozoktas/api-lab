/** Olgun Özoktaş geliştirdi · API Lab */
// AWS S3 — curated essentials. The S3 REST API surface is XML, not
// JSON, and AWS ships no single OpenAPI document for it. This
// curated slice covers the everyday object + bucket operations a
// user is most likely to hit.
//
// Region / virtual-hosting note: this uses the regional path-style
// endpoint (`s3.{region}.amazonaws.com`) with `{bucket}` / `{key}`
// as edit-here placeholders. Bucket-as-host (virtual-hosted style)
// works too but breaks the curated `path` pattern; users who want
// it can change the URL after import. `us-east-1` is hard-coded as
// the canonical region — change the auth panel's `region` field
// after import for other regions.
import type { CuratedProvider } from "./types";

export const awsS3Curated: CuratedProvider = {
  baseUrl: "https://s3.us-east-1.amazonaws.com",
  endpoints: [
    {
      group: "Service",
      name: "List buckets",
      method: "GET",
      path: "/",
      description: "List every S3 bucket the account owns.",
    },
    {
      group: "Bucket",
      name: "List objects (v2)",
      method: "GET",
      path: "/{bucket}/?list-type=2",
      description:
        "Paginated object listing for a bucket. Append `&prefix=…` to filter or `&continuation-token=…` to page.",
    },
    {
      group: "Bucket",
      name: "Get bucket location",
      method: "GET",
      path: "/{bucket}/?location",
      description:
        "Return the bucket's AWS region (useful for redirecting to a regional endpoint).",
    },
    {
      group: "Object",
      name: "Head object",
      method: "HEAD",
      path: "/{bucket}/{key}",
      description:
        "Metadata-only fetch — Content-Length, ETag, Last-Modified, content type. Cheap probe for existence.",
    },
    {
      group: "Object",
      name: "Get object",
      method: "GET",
      path: "/{bucket}/{key}",
      description: "Download an object. Add a `Range: bytes=…` header for partial reads.",
    },
    {
      group: "Object",
      name: "Put object",
      method: "PUT",
      path: "/{bucket}/{key}",
      description:
        "Upload an object. Use the Binary body picker (the bridge streams the file off disk via curl --data-binary @<path>).",
    },
    {
      group: "Object",
      name: "Delete object",
      method: "DELETE",
      path: "/{bucket}/{key}",
      description: "Remove an object from a bucket.",
    },
    {
      group: "Object",
      name: "Copy object",
      method: "PUT",
      path: "/{bucket}/{key}",
      description:
        "Server-side copy. Set the `x-amz-copy-source: /source-bucket/source-key` header; body stays empty.",
    },
  ],
};
