/** Olgun Özoktaş geliştirdi · API Lab */
// AWS Lambda — curated essentials. The Lambda REST API surface is
// JSON. Endpoints here cover the everyday "deploy + invoke + debug"
// loop without scaffolding the full ~80 operations of the published
// service definition.
//
// Region note: `us-east-1` is hard-coded as the canonical endpoint.
// Change the auth panel's `region` field after import for other
// regions; the host portion of the URL has to be edited too (Lambda
// uses regional hostnames, unlike S3's path-style global option).
import type { CuratedProvider } from "./types";

export const awsLambdaCurated: CuratedProvider = {
  baseUrl: "https://lambda.us-east-1.amazonaws.com",
  endpoints: [
    {
      group: "Functions",
      name: "List functions",
      method: "GET",
      path: "/2015-03-31/functions",
      description: "Paginated list of every Lambda function in the region.",
    },
    {
      group: "Functions",
      name: "Get function",
      method: "GET",
      path: "/2015-03-31/functions/{function_name}",
      description:
        "Function configuration + a presigned URL for the deployment package. Useful before invoking.",
    },
    {
      group: "Invoke",
      name: "Invoke (RequestResponse)",
      method: "POST",
      path: "/2015-03-31/functions/{function_name}/invocations",
      description:
        "Synchronous invoke — body is the JSON event payload, response is the function's return value.",
      body: {
        mode: "json",
        text: '{\n  "key1": "value1",\n  "key2": "value2"\n}',
      },
    },
    {
      group: "Invoke",
      name: "Invoke (Event / async)",
      method: "POST",
      path: "/2015-03-31/functions/{function_name}/invocations?Qualifier=$LATEST",
      description:
        "Async invoke — add `X-Amz-Invocation-Type: Event` header. Returns 202 immediately; the function runs in the background.",
      body: {
        mode: "json",
        text: '{\n  "key1": "value1"\n}',
      },
    },
    {
      group: "Aliases",
      name: "List aliases",
      method: "GET",
      path: "/2015-03-31/functions/{function_name}/aliases",
      description: "Aliases pointing at versions of a function (e.g. `prod`, `staging`).",
    },
    {
      group: "Versions",
      name: "List versions",
      method: "GET",
      path: "/2015-03-31/functions/{function_name}/versions",
      description: "Every published version of a function.",
    },
  ],
};
