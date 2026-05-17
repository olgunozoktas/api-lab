// Olgun Özoktaş geliştirdi · API Lab
// mock_http.zig — pure HTTP request/response helpers for the mock
// server sidecar. No sockets, no threads, no allocator-owned state:
// every function here is a pure transform over slices, so the matcher
// + request-line parser + response formatter are unit-testable
// without binding a port.
//
// Split out of `mock.zig` to keep both files under the 400-line cap
// (CLAUDE.md hard rule). `mock.zig` owns the posix sockets + worker
// threads; this file owns the bytes.

const std = @import("std");

/// One response header as it arrives from the frontend `Example` —
/// `{k, v}` mirrors `ResponseHeader` in `frontend/src/lib/types.ts`.
pub const ResponseHeader = struct {
    k: []const u8 = "",
    v: []const u8 = "",
};

/// A saved response example. Field names mirror the `Example` type in
/// `frontend/src/lib/types.ts` verbatim so `std.json.parseFromSlice`
/// binds the `mock.start` payload directly. Unknown fields are ignored.
pub const Example = struct {
    id: []const u8 = "",
    name: []const u8 = "",
    status: u16 = 200,
    headers: []const ResponseHeader = &.{},
    body: []const u8 = "",
    contentType: []const u8 = "",
    path: []const u8 = "",
    method: []const u8 = "GET",
    savedAt: i64 = 0,
};

/// `mock.start` bridge payload: a collection id, the example list, and
/// an optional fixed port (0 / omitted → ephemeral).
pub const StartRequest = struct {
    collectionId: []const u8 = "",
    examples: []const Example = &.{},
    port: u16 = 0,
};

pub const RequestLine = struct {
    method: []const u8,
    path: []const u8,
};

/// Parse the HTTP request line — `METHOD SP target SP HTTP/x.y`. The
/// query string is stripped from `target` (examples match on path
/// only, since saved `Example.path` carries no query). Returns null on
/// a malformed line.
pub fn parseRequestLine(line: []const u8) ?RequestLine {
    const trimmed = std.mem.trimEnd(u8, line, "\r\n");
    const sp1 = std.mem.indexOfScalar(u8, trimmed, ' ') orelse return null;
    const method = trimmed[0..sp1];
    const rest = trimmed[sp1 + 1 ..];
    const sp2 = std.mem.indexOfScalar(u8, rest, ' ') orelse return null;
    var target = rest[0..sp2];
    if (std.mem.indexOfScalar(u8, target, '?')) |q| target = target[0..q];
    if (method.len == 0 or target.len == 0) return null;
    return .{ .method = method, .path = target };
}

/// Locate the end of the header block (`\r\n\r\n`). Returns the index
/// just past the blank line, or null if the terminator isn't present.
pub fn findHeaderEnd(buf: []const u8) ?usize {
    if (std.mem.indexOf(u8, buf, "\r\n\r\n")) |i| return i + 4;
    return null;
}

/// First example whose (method, path) matches the incoming request.
/// Method compare is case-insensitive; path compare is exact. First
/// match wins — deterministic when several examples share a route.
pub fn matchExample(examples: []const Example, method: []const u8, path: []const u8) ?usize {
    for (examples, 0..) |ex, i| {
        if (std.ascii.eqlIgnoreCase(ex.method, method) and std.mem.eql(u8, ex.path, path)) {
            return i;
        }
    }
    return null;
}

/// Reason phrase for the common status codes. An unknown code yields
/// an empty phrase — still a valid HTTP status line.
pub fn statusReason(status: u16) []const u8 {
    return switch (status) {
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        304 => "Not Modified",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        409 => "Conflict",
        418 => "I'm a teapot",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        else => "",
    };
}

/// Headers the mock server owns and must not echo from the saved
/// example — `Content-Length` is recomputed per response and the
/// connection is always closed, so a stale value would corrupt the
/// framing.
fn isManagedHeader(name: []const u8) bool {
    return std.ascii.eqlIgnoreCase(name, "content-length") or
        std.ascii.eqlIgnoreCase(name, "transfer-encoding") or
        std.ascii.eqlIgnoreCase(name, "connection");
}

/// Serialise an example into a complete HTTP/1.1 response. Saved
/// headers ship verbatim except the managed framing headers; the mock
/// recomputes `Content-Length`, always sends `Connection: close` (it
/// closes the socket per request), and tags the response with
/// `X-Mock-Server`. When the example carries no `Content-Type` header,
/// `example.contentType` fills the gap.
pub fn writeHttpResponse(w: *std.Io.Writer, example: Example) !void {
    try w.print("HTTP/1.1 {d} {s}\r\n", .{ example.status, statusReason(example.status) });
    var saw_content_type = false;
    for (example.headers) |h| {
        if (h.k.len == 0) continue;
        if (isManagedHeader(h.k)) continue;
        if (std.ascii.eqlIgnoreCase(h.k, "content-type")) saw_content_type = true;
        try w.print("{s}: {s}\r\n", .{ h.k, h.v });
    }
    if (!saw_content_type and example.contentType.len > 0) {
        try w.print("Content-Type: {s}\r\n", .{example.contentType});
    }
    try w.print("Content-Length: {d}\r\n", .{example.body.len});
    try w.writeAll("Connection: close\r\n");
    try w.writeAll("X-Mock-Server: API Lab\r\n");
    try w.writeAll("\r\n");
    try w.writeAll(example.body);
}

/// Fallback response when no saved example matches the route.
pub fn writeNoMatchResponse(w: *std.Io.Writer, method: []const u8, path: []const u8) !void {
    var body_buf: [640]u8 = undefined;
    var bw = std.Io.Writer.fixed(&body_buf);
    bw.print("API Lab mock — no saved example for {s} {s}\n", .{ method, path }) catch {};
    const body = body_buf[0..bw.end];
    try w.writeAll("HTTP/1.1 404 Not Found\r\n");
    try w.writeAll("Content-Type: text/plain; charset=utf-8\r\n");
    try w.print("Content-Length: {d}\r\n", .{body.len});
    try w.writeAll("Connection: close\r\n");
    try w.writeAll("X-Mock-Server: API Lab\r\n");
    try w.writeAll("\r\n");
    try w.writeAll(body);
}
