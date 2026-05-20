// Olgun Özoktaş geliştirdi · API Lab
//
// http.zig — the `http.request` bridge handler. Shells out to `curl`
// so HTTP calls bypass WKWebView's CORS sandbox; routing requests
// through a native subprocess is the whole reason this app needs a
// Zig shell at all. Pure `buildArgv` + parser helpers are unit-tested
// (see http_test.zig); `runRequest` is the I/O entry point.
//
// curl is invoked with `--write-out` JSON metrics appended after the
// `SEPARATOR` sentinel, so a single subprocess yields both the
// response body and the timing block on one stdout stream that
// `runRequest` later splits on that separator.
//
// The JSON-string escaper and `formatTransportError` defined here are
// the single source the gRPC handler imports — see grpc.zig's header.
const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;

const SEPARATOR = "\n----APILAB-METRICS----";

/// Largest raw binary body the base64 channel will carry. The
/// zero-native bridge result buffer is 1 MB (`max_result_bytes`);
/// base64 inflates ~4/3, so 700 KB raw → ~933 KB encoded, leaving
/// headroom for the headers array + JSON envelope. Larger binary
/// bodies are reported with `body_too_large: true` instead of being
/// truncated into a corrupt payload.
const MAX_BINARY_RAW: usize = 700 * 1024;

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
    env_map: *std.process.Environ.Map,
};

pub fn handler(ctx: *Context) bridge.Handler {
    return .{
        .name = "http.request",
        .context = ctx,
        .invoke_fn = invoke,
    };
}

pub const HttpRequest = struct {
    method: []const u8 = "GET",
    url: []const u8,
    headers: []const Header = &.{},
    body: ?[]const u8 = null,
    timeout_ms: u32 = 60000,
    follow_redirects: u32 = 10,
    insecure: bool = false,
    /// multipart/form-data fields. When non-empty, curl `-F` args are
    /// built (`name=value` for text, `name=@path` for files) and the
    /// `body` string is ignored. curl reads file parts off disk.
    multipart: []const MultipartPart = &.{},
    /// Raw-binary body — an absolute file path. When non-empty, curl
    /// `--data-binary @path` is used and `body` is ignored.
    binary_path: []const u8 = "",
    /// Outbound proxy URL — curl `--proxy` (scheme picks HTTP/SOCKS5).
    proxy: []const u8 = "",
    /// Comma-separated host patterns to skip the proxy (curl `--noproxy`).
    /// Only emitted when `proxy` is also set — curl needs a proxy to
    /// have an exception list against. Empty = no bypass entries.
    proxy_bypass: []const u8 = "",
    /// mTLS client certificate / key — absolute PEM file paths, plus
    /// an optional key passphrase. curl `--cert` / `--key` / `--pass`.
    client_cert: []const u8 = "",
    client_key: []const u8 = "",
    client_key_pass: []const u8 = "",
    /// Cookie jar replay — `name=value` pairs joined by "; ". Emitted
    /// via curl `-b` so the server sees a real `Cookie:` request
    /// header. The frontend builds this from the matching subset of
    /// the jar (see `lib/cookies.ts` `cookiesForUrl` +
    /// `buildCookieHeader`); the handler just relays the string.
    cookies: []const u8 = "",

    pub const Header = struct {
        name: []const u8,
        value: []const u8,
    };

    pub const MultipartPart = struct {
        name: []const u8,
        value: []const u8,
        is_file: bool = false,
    };
};

fn invoke(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runRequest(ctx, invocation.request.payload, output) catch |err| {
        return formatError(output, @errorName(err));
    };
}

/// Run the curl subprocess and serialise its result into `output` as
/// JSON. Response shape (the `http.request` bridge contract):
///
///   {status, size_bytes, timing_ms, timing:{namelookup_ms, connect_ms,
///    ttfb_ms, total_ms}, url, headers:[{name,value}], body}
///
/// Text bodies (valid UTF-8, text/json/xml/svg content types) ship in
/// `body` verbatim — no extra fields. Binary bodies (images, audio,
/// video, PDFs, anything that fails UTF-8 validation) ship `body`
/// base64-encoded with an added `body_base64: true` flag; a binary
/// body over `MAX_BINARY_RAW` ships `body: ""` with
/// `body_too_large: true`. Both binary flags are additive — a frontend
/// that ignores them still reads `body` as before. On failure:
/// {error, exit_code?, stderr?}.
fn runRequest(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(HttpRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const req = parsed.value;

    const argv = try buildArgv(a, req);

    const result = std.process.run(ctx.gpa, ctx.io, .{
        .argv = argv,
        .stdout_limit = .limited(8 * 1024 * 1024),
        .stderr_limit = .limited(64 * 1024),
        .environ_map = ctx.env_map,
    }) catch |err| {
        return formatError(output, @errorName(err));
    };
    defer ctx.gpa.free(result.stdout);
    defer ctx.gpa.free(result.stderr);

    if (result.term != .exited or result.term.exited != 0) {
        const exit_code: i32 = if (result.term == .exited) @intCast(result.term.exited) else -1;
        return formatTransportError(output, "curl failed", exit_code, result.stderr, 0);
    }

    // Split stdout at LAST occurrence of separator
    const sep_idx_opt = std.mem.lastIndexOf(u8, result.stdout, SEPARATOR);
    if (sep_idx_opt == null) {
        return formatError(output, "missing metrics separator");
    }
    const sep_idx = sep_idx_opt.?;
    const headers_and_body = result.stdout[0..sep_idx];
    const metrics_raw = result.stdout[sep_idx + SEPARATOR.len ..];

    // Parse curl metrics JSON
    const Metrics = struct {
        http_code: u16 = 0,
        size_download: u64 = 0,
        time_total: f64 = 0,
        time_connect: f64 = 0,
        time_starttransfer: f64 = 0,
        time_namelookup: f64 = 0,
        url_effective: []const u8 = "",
    };
    const metrics_parsed = std.json.parseFromSlice(Metrics, a, metrics_raw, .{
        .ignore_unknown_fields = true,
    }) catch |err| {
        return formatError(output, @errorName(err));
    };
    const m = metrics_parsed.value;

    // Split headers vs body — find LAST \r\n\r\n in headers_and_body that comes before the body
    // (curl with --include + --location may emit MULTIPLE header blocks for redirects)
    const split = findLastHeaderBoundary(headers_and_body);
    const headers_block = headers_and_body[0..split];
    const body_bytes = headers_and_body[split..];
    const content_type = findContentType(headers_block);

    // Build response JSON
    const total_ms: u64 = @intFromFloat(m.time_total * 1000.0);
    var w = std.Io.Writer.fixed(output);
    try w.print(
        \\{{"status":{d},"size_bytes":{d},"timing_ms":{d},"timing":{{"namelookup_ms":{d},"connect_ms":{d},"ttfb_ms":{d},"total_ms":{d}}},"url":
    , .{
        m.http_code,
        m.size_download,
        total_ms,
        @as(u64, @intFromFloat(m.time_namelookup * 1000.0)),
        @as(u64, @intFromFloat(m.time_connect * 1000.0)),
        @as(u64, @intFromFloat(m.time_starttransfer * 1000.0)),
        total_ms,
    });
    try writeJsonString(&w, m.url_effective);
    try w.writeAll(",\"headers\":");
    try writeHeadersJson(&w, headers_block);
    try writeBodyJson(&w, a, content_type, body_bytes);
    try w.writeAll("}");
    return output[0..w.end];
}

/// Locate the `Content-Type` header value in a raw header block.
/// Case-insensitive on the header name; returns "" when absent.
pub fn findContentType(headers_block: []const u8) []const u8 {
    var lines = std.mem.splitSequence(u8, headers_block, "\r\n");
    while (lines.next()) |line_raw| {
        const line = std.mem.trim(u8, line_raw, " \t");
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse continue;
        const name = std.mem.trim(u8, line[0..colon], " \t");
        if (std.ascii.eqlIgnoreCase(name, "content-type")) {
            return std.mem.trim(u8, line[colon + 1 ..], " \t");
        }
    }
    return "";
}

/// True when the response body should travel base64-encoded. Binary
/// when the content type is unambiguously binary, OR when the body
/// fails UTF-8 validation. Known text types (text/*, json, xml, svg,
/// js, yaml, form-encoded) always stay on the verbatim text path so
/// the common case pays no base64 tax.
pub fn isBinaryBody(content_type: []const u8, body: []const u8) bool {
    var buf: [128]u8 = undefined;
    const ct = ctLower(content_type, &buf);
    if (isBinaryContentType(ct)) return true;
    if (isTextContentType(ct)) return false;
    return !std.unicode.utf8ValidateSlice(body);
}

fn ctLower(content_type: []const u8, buf: []u8) []const u8 {
    const n = @min(content_type.len, buf.len);
    for (content_type[0..n], 0..) |c, i| buf[i] = std.ascii.toLower(c);
    return buf[0..n];
}

fn isBinaryContentType(ct: []const u8) bool {
    if (std.mem.startsWith(u8, ct, "image/")) return !std.mem.startsWith(u8, ct, "image/svg");
    if (std.mem.startsWith(u8, ct, "audio/")) return true;
    if (std.mem.startsWith(u8, ct, "video/")) return true;
    if (std.mem.startsWith(u8, ct, "font/")) return true;
    const binary_types = [_][]const u8{
        "application/pdf",   "application/octet-stream",
        "application/wasm",  "application/zip",
        "application/gzip",  "application/x-protobuf",
        "application/x-tar", "application/msword",
    };
    for (binary_types) |t| {
        if (std.mem.startsWith(u8, ct, t)) return true;
    }
    return false;
}

fn isTextContentType(ct: []const u8) bool {
    if (std.mem.startsWith(u8, ct, "text/")) return true;
    if (std.mem.startsWith(u8, ct, "image/svg")) return true;
    const text_markers = [_][]const u8{
        "application/json",       "application/xml",
        "application/javascript", "application/yaml",
        "application/x-yaml",     "application/x-www-form-urlencoded",
        "application/ld+json",    "+json",
        "+xml",
    };
    for (text_markers) |t| {
        if (std.mem.indexOf(u8, ct, t) != null) return true;
    }
    return false;
}

/// Write the `"body"` field. Text payloads ship verbatim; binary
/// payloads ship base64-encoded with a `body_base64` flag, or
/// `body_too_large` when over `MAX_BINARY_RAW`.
pub fn writeBodyJson(w: *std.Io.Writer, a: std.mem.Allocator, content_type: []const u8, body: []const u8) !void {
    if (!isBinaryBody(content_type, body)) {
        try w.writeAll(",\"body\":");
        try writeJsonString(w, body);
        return;
    }
    if (body.len > MAX_BINARY_RAW) {
        try w.writeAll(",\"body\":\"\",\"body_base64\":false,\"body_too_large\":true");
        return;
    }
    const enc = std.base64.standard.Encoder;
    const b64 = try a.alloc(u8, enc.calcSize(body.len));
    _ = enc.encode(b64, body);
    try w.writeAll(",\"body\":");
    try writeJsonString(w, b64);
    try w.writeAll(",\"body_base64\":true");
}

/// Build the curl argv slice from a parsed HttpRequest.
/// Pure: depends only on the input request and the allocator. No I/O.
/// Extracted from runRequest so the argv shape is unit-testable.
pub fn buildArgv(a: std.mem.Allocator, req: HttpRequest) ![]const []const u8 {
    var argv: std.ArrayList([]const u8) = .empty;
    try argv.append(a, "curl");
    try argv.append(a, "--silent");
    try argv.append(a, "--show-error");
    try argv.append(a, "--include"); // include response headers in stdout
    try argv.append(a, "--no-buffer");
    if (req.insecure) try argv.append(a, "--insecure");
    if (req.proxy.len > 0) {
        try argv.append(a, "--proxy");
        try argv.append(a, req.proxy);
        // `--noproxy` only makes sense paired with `--proxy`; curl
        // rejects the flag standalone. Gating here keeps the argv
        // tight and surfaces the same shape to the unit tests.
        if (req.proxy_bypass.len > 0) {
            try argv.append(a, "--noproxy");
            try argv.append(a, req.proxy_bypass);
        }
    }
    // mTLS client certificate — curl loads the PEM files by path.
    if (req.client_cert.len > 0) {
        try argv.append(a, "--cert");
        try argv.append(a, req.client_cert);
    }
    if (req.client_key.len > 0) {
        try argv.append(a, "--key");
        try argv.append(a, req.client_key);
    }
    if (req.client_key_pass.len > 0) {
        try argv.append(a, "--pass");
        try argv.append(a, req.client_key_pass);
    }
    // Cookie jar replay — `-b "name=value; name=value"`. The frontend
    // already filtered to cookies matching this request's URL, so the
    // string is hand-off-ready.
    if (req.cookies.len > 0) {
        try argv.append(a, "-b");
        try argv.append(a, req.cookies);
    }
    try argv.append(a, "--max-time");
    try argv.append(a, try std.fmt.allocPrint(a, "{d}", .{@max(req.timeout_ms / 1000, 1)}));
    if (req.follow_redirects > 0) {
        try argv.append(a, "--location");
        try argv.append(a, "--max-redirs");
        try argv.append(a, try std.fmt.allocPrint(a, "{d}", .{req.follow_redirects}));
    }
    try argv.append(a, "--write-out");
    try argv.append(a, SEPARATOR ++ "%{json}");
    try argv.append(a, "--request");
    try argv.append(a, req.method);
    for (req.headers) |h| {
        try argv.append(a, "--header");
        try argv.append(a, try std.fmt.allocPrint(a, "{s}: {s}", .{ h.name, h.value }));
    }
    // Body precedence: binary file > multipart fields > raw body
    // string. curl reads `@path` files itself, so a 10 MB upload never
    // crosses the 1 MB bridge buffer — only the path does.
    if (req.binary_path.len > 0) {
        try argv.append(a, "--data-binary");
        try argv.append(a, try std.fmt.allocPrint(a, "@{s}", .{req.binary_path}));
    } else if (req.multipart.len > 0) {
        for (req.multipart) |part| {
            try argv.append(a, "--form");
            if (part.is_file) {
                try argv.append(a, try std.fmt.allocPrint(a, "{s}=@{s}", .{ part.name, part.value }));
            } else {
                try argv.append(a, try std.fmt.allocPrint(a, "{s}={s}", .{ part.name, part.value }));
            }
        }
    } else if (req.body) |b| if (b.len > 0) {
        try argv.append(a, "--data-binary");
        try argv.append(a, b);
    };
    try argv.append(a, "--url");
    try argv.append(a, req.url);
    return argv.items;
}

pub fn findLastHeaderBoundary(data: []const u8) usize {
    // Walk through, find each \r\n\r\n boundary. The header block ENDS at the
    // boundary AFTER which non-HTTP/* content begins (the actual body).
    // For curl --include --location, redirect chains produce multiple
    // HTTP/1.1 ... \r\n\r\n preludes; the LAST one is the real headers.
    var i: usize = 0;
    var last_split: usize = 0;
    while (i + 3 < data.len) : (i += 1) {
        if (data[i] == '\r' and data[i + 1] == '\n' and data[i + 2] == '\r' and data[i + 3] == '\n') {
            last_split = i + 4;
            // If what comes after is "HTTP/" then this was a redirect header,
            // continue; otherwise this is the body start.
            if (last_split + 5 <= data.len and std.mem.startsWith(u8, data[last_split..], "HTTP/")) {
                continue;
            } else {
                return last_split;
            }
        }
    }
    return last_split;
}

pub fn writeHeadersJson(w: *std.Io.Writer, headers_block: []const u8) !void {
    // Take only LAST HTTP block
    var start: usize = 0;
    var search: usize = 0;
    while (search < headers_block.len) {
        const idx = std.mem.indexOfPos(u8, headers_block, search, "HTTP/") orelse break;
        if (idx == 0 or headers_block[idx - 1] == '\n') {
            start = idx;
            search = idx + 5;
        } else {
            search = idx + 5;
        }
    }
    const block = headers_block[start..];

    try w.writeAll("[");
    var first = true;
    var lines_iter = std.mem.splitSequence(u8, block, "\r\n");
    var skipped_status = false;
    while (lines_iter.next()) |line_raw| {
        const line = std.mem.trim(u8, line_raw, " \t");
        if (line.len == 0) continue;
        if (!skipped_status and std.mem.startsWith(u8, line, "HTTP/")) {
            skipped_status = true;
            continue;
        }
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse continue;
        const name = std.mem.trim(u8, line[0..colon], " \t");
        const value = std.mem.trim(u8, line[colon + 1 ..], " \t");
        if (!first) try w.writeAll(",");
        first = false;
        try w.writeAll("{\"name\":");
        try writeJsonString(w, name);
        try w.writeAll(",\"value\":");
        try writeJsonString(w, value);
        try w.writeAll("}");
    }
    try w.writeAll("]");
}

pub fn writeJsonString(w: *std.Io.Writer, s: []const u8) !void {
    try w.writeAll("\"");
    for (s) |c| {
        switch (c) {
            '"' => try w.writeAll("\\\""),
            '\\' => try w.writeAll("\\\\"),
            '\n' => try w.writeAll("\\n"),
            '\r' => try w.writeAll("\\r"),
            '\t' => try w.writeAll("\\t"),
            0...0x08, 0x0b, 0x0c, 0x0e...0x1f => try w.print("\\u{x:0>4}", .{c}),
            else => try w.writeByte(c),
        }
    }
    try w.writeAll("\"");
}

pub fn formatError(output: []u8, msg: []const u8) []const u8 {
    var w = std.Io.Writer.fixed(output);
    w.print("{{\"error\":\"{s}\"}}", .{msg}) catch {};
    return output[0..w.end];
}

pub fn formatTransportError(output: []u8, msg: []const u8, exit_code: i32, stderr: []const u8, elapsed_ms: u64) []const u8 {
    var w = std.Io.Writer.fixed(output);
    w.print("{{\"error\":\"{s}\",\"exit_code\":{d},\"timing_ms\":{d},\"stderr\":", .{ msg, exit_code, elapsed_ms }) catch {};
    writeJsonString(&w, std.mem.trim(u8, stderr, " \t\r\n")) catch {};
    w.writeAll("}") catch {};
    return output[0..w.end];
}

// Tests live in `http_test.zig` to keep this file under the 400-line cap
// (CLAUDE.md "Hard rules"). The reference below ensures `zig build test`
// picks them up via this module's import graph.
test {
    _ = @import("http_test.zig");
}
