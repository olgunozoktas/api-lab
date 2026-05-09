// gRPC unary handler — shells out to `grpcurl` (the canonical gRPC CLI).
//
// Mirrors the http.zig pattern: pure `buildArgv` + parser helpers (testable),
// `runRequest` for the I/O entry, fixed `output: []u8` JSON encoder.
// JSON-string escaping + transport-error formatting are imported from
// http.zig — same logic, single source.
//
// grpcurl invocation shape (unary, JSON-format I/O):
//   grpcurl
//     -format json
//     -format-error
//     [-plaintext]                # for grpc:// (no TLS)
//     -vv                          # verbose: surfaces headers/trailers/status on stderr
//     -max-time <seconds>
//     [-rpc-header 'name: value']  # repeated for each metadata entry
//     [-import-path <dir>]         # repeated; only when useReflection=false
//     [-proto <file>]              # repeated; only when useReflection=false
//     -d '<message-json>'          # request body (defaults to '{}')
//     <target>                      # "host:port"
//     <fullMethod>                  # "package.Service/Method"
//
// Error model:
//   - grpcurl missing on PATH        → {error: "grpcurl_missing", install_hint}
//   - grpcurl exits non-zero          → formatTransportError (shape from http.zig)
//   - grpcurl exits zero               → parse stdout (response message JSON)
//                                         + stderr (headers, trailers, status)
//                                       → {status, status_code_num, message, headers, trailers, durationMs}

const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const http = @import("http.zig");

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
    env_map: *std.process.Environ.Map,
};

pub fn handler(ctx: *Context) bridge.Handler {
    return .{
        .name = "grpc.invoke",
        .context = ctx,
        .invoke_fn = invoke,
    };
}

pub const GrpcMetadata = struct {
    name: []const u8,
    value: []const u8,
};

pub const GrpcRequest = struct {
    target: []const u8,
    full_method: []const u8,
    message: []const u8 = "{}",
    metadata: []const GrpcMetadata = &.{},
    plaintext: bool = false,
    use_reflection: bool = true,
    import_paths: []const []const u8 = &.{},
    proto_files: []const []const u8 = &.{},
    timeout_ms: u32 = 60000,
};

fn invoke(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runRequest(ctx, invocation.request.payload, output) catch |err| {
        return http.formatError(output, @errorName(err));
    };
}

fn runRequest(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(GrpcRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const req = parsed.value;

    if (req.target.len == 0) return http.formatError(output, "target is empty");
    if (req.full_method.len == 0) return http.formatError(output, "full_method is empty");

    const argv = try buildArgv(a, req);

    const result = std.process.run(ctx.gpa, ctx.io, .{
        .argv = argv,
        .stdout_limit = .limited(8 * 1024 * 1024),
        .stderr_limit = .limited(256 * 1024),
        .environ_map = ctx.env_map,
    }) catch |err| {
        if (err == error.FileNotFound) return formatMissingBinaryError(output);
        return http.formatError(output, @errorName(err));
    };
    defer ctx.gpa.free(result.stdout);
    defer ctx.gpa.free(result.stderr);

    const parsed_stderr = parseVerboseStderr(result.stderr);

    // grpcurl's exit code: 0 on success (status OK or otherwise non-error
    // termination), non-zero for transport errors. gRPC application errors
    // (e.g. NotFound) exit non-zero too because grpcurl treats non-OK as
    // failure. We surface the exit code + stderr alongside the parsed
    // status so the frontend can render something sensible either way.
    const exit_code: i32 = if (result.term == .exited) @intCast(result.term.exited) else -1;

    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"status\":");
    try http.writeJsonString(&w, parsed_stderr.status);
    try w.print(",\"status_code_num\":{d}", .{parsed_stderr.status_code_num});
    try w.writeAll(",\"status_message\":");
    try http.writeJsonString(&w, parsed_stderr.status_message);
    try w.writeAll(",\"message\":");
    try http.writeJsonString(&w, std.mem.trim(u8, result.stdout, " \t\r\n"));
    try w.writeAll(",\"headers\":");
    try writeKvJson(&w, parsed_stderr.headers);
    try w.writeAll(",\"trailers\":");
    try writeKvJson(&w, parsed_stderr.trailers);
    try w.print(",\"exit_code\":{d}", .{exit_code});
    try w.writeAll(",\"stderr\":");
    try http.writeJsonString(&w, std.mem.trim(u8, result.stderr, " \t\r\n"));
    try w.writeAll("}");
    return output[0..w.end];
}

/// Build the grpcurl argv slice from a parsed GrpcRequest. Pure: depends
/// only on the input request and the allocator. No I/O. Extracted so the
/// argv shape is unit-testable without spinning up a subprocess.
pub fn buildArgv(a: std.mem.Allocator, req: GrpcRequest) ![]const []const u8 {
    var argv: std.ArrayList([]const u8) = .empty;
    try argv.append(a, "grpcurl");
    try argv.append(a, "-format");
    try argv.append(a, "json");
    try argv.append(a, "-format-error");
    try argv.append(a, "-vv");
    if (req.plaintext) try argv.append(a, "-plaintext");
    try argv.append(a, "-max-time");
    try argv.append(a, try std.fmt.allocPrint(a, "{d}", .{@max(req.timeout_ms / 1000, 1)}));
    for (req.metadata) |m| {
        try argv.append(a, "-rpc-header");
        try argv.append(a, try std.fmt.allocPrint(a, "{s}: {s}", .{ m.name, m.value }));
    }
    if (!req.use_reflection) {
        for (req.import_paths) |p| {
            try argv.append(a, "-import-path");
            try argv.append(a, p);
        }
        for (req.proto_files) |p| {
            try argv.append(a, "-proto");
            try argv.append(a, p);
        }
    }
    try argv.append(a, "-d");
    try argv.append(a, if (req.message.len == 0) "{}" else req.message);
    try argv.append(a, req.target);
    try argv.append(a, req.full_method);
    return argv.items;
}

pub const ParsedStderr = struct {
    status: []const u8,
    status_code_num: i32,
    status_message: []const u8,
    headers: []const GrpcMetadata,
    trailers: []const GrpcMetadata,
};

/// Parse grpcurl's `-vv` stderr output into headers, trailers, and status.
///
/// Expected sections (lines start at column 0, contents indent with two spaces
/// or are flush-left depending on grpcurl version — this parser tolerates both):
///
///   Response headers received:
///   key: value
///   key: value
///
///   Response trailers received:
///   key: value
///
///   Response contents:
///   ...    (this section is ignored — message comes from stdout)
///
/// On error, grpcurl emits an `ERROR:\n  Code: <code>\n  Message: <msg>` block
/// instead of trailers/contents — we extract code + message from there.
///
/// Defensive: missing sections return empty arrays; bad input never crashes.
/// All extracted slices reference the input — caller owns the stderr buffer.
pub fn parseVerboseStderr(stderr: []const u8) ParsedStderr {
    var headers_buf: [64]GrpcMetadata = undefined;
    var trailers_buf: [64]GrpcMetadata = undefined;
    var headers_len: usize = 0;
    var trailers_len: usize = 0;

    var status_code: []const u8 = "OK";
    var status_msg: []const u8 = "";
    var status_num: i32 = 0;

    var section: enum { none, headers, trailers, error_block } = .none;
    var lines = std.mem.splitScalar(u8, stderr, '\n');
    while (lines.next()) |line_raw| {
        const line = std.mem.trim(u8, line_raw, " \t\r");
        if (line.len == 0) {
            section = .none;
            continue;
        }
        if (std.mem.startsWith(u8, line, "Response headers received:")) {
            section = .headers;
            continue;
        }
        if (std.mem.startsWith(u8, line, "Response trailers received:")) {
            section = .trailers;
            continue;
        }
        if (std.mem.startsWith(u8, line, "Response contents:") or
            std.mem.startsWith(u8, line, "Estimated response size") or
            std.mem.startsWith(u8, line, "Resolved method descriptor:") or
            std.mem.startsWith(u8, line, "Request metadata to send:") or
            std.mem.startsWith(u8, line, "Sent ") or
            std.mem.startsWith(u8, line, "rpc "))
        {
            section = .none;
            continue;
        }
        if (std.mem.eql(u8, line, "ERROR:")) {
            section = .error_block;
            continue;
        }
        if (section == .error_block) {
            if (std.mem.startsWith(u8, line, "Code:")) {
                status_code = std.mem.trim(u8, line["Code:".len..], " \t");
                status_num = grpcStatusToNumber(status_code);
            } else if (std.mem.startsWith(u8, line, "Message:")) {
                status_msg = std.mem.trim(u8, line["Message:".len..], " \t");
            } else if (std.mem.startsWith(u8, line, "Status:")) {
                // grpcurl sometimes uses "Status:" instead of "Code:"
                status_code = std.mem.trim(u8, line["Status:".len..], " \t");
                status_num = grpcStatusToNumber(status_code);
            }
            continue;
        }
        if (section == .headers or section == .trailers) {
            const colon = std.mem.indexOfScalar(u8, line, ':') orelse continue;
            const name = std.mem.trim(u8, line[0..colon], " \t");
            const value = std.mem.trim(u8, line[colon + 1 ..], " \t");
            if (name.len == 0) continue;
            if (section == .headers and headers_len < headers_buf.len) {
                headers_buf[headers_len] = .{ .name = name, .value = value };
                headers_len += 1;
            } else if (section == .trailers and trailers_len < trailers_buf.len) {
                trailers_buf[trailers_len] = .{ .name = name, .value = value };
                trailers_len += 1;
            }
        }
    }

    return .{
        .status = status_code,
        .status_code_num = status_num,
        .status_message = status_msg,
        .headers = headers_buf[0..headers_len],
        .trailers = trailers_buf[0..trailers_len],
    };
}

/// Map grpcurl's textual status codes (UPPER_SNAKE or PascalCase variants)
/// to the canonical gRPC status numbers (RFC: 0..16). Returns -1 for
/// unknown / unrecognized codes so the frontend can surface "unknown".
pub fn grpcStatusToNumber(code: []const u8) i32 {
    const Pair = struct { name: []const u8, num: i32 };
    const table = [_]Pair{
        .{ .name = "OK", .num = 0 },
        .{ .name = "Canceled", .num = 1 },
        .{ .name = "CANCELLED", .num = 1 },
        .{ .name = "Unknown", .num = 2 },
        .{ .name = "InvalidArgument", .num = 3 },
        .{ .name = "DeadlineExceeded", .num = 4 },
        .{ .name = "NotFound", .num = 5 },
        .{ .name = "AlreadyExists", .num = 6 },
        .{ .name = "PermissionDenied", .num = 7 },
        .{ .name = "ResourceExhausted", .num = 8 },
        .{ .name = "FailedPrecondition", .num = 9 },
        .{ .name = "Aborted", .num = 10 },
        .{ .name = "OutOfRange", .num = 11 },
        .{ .name = "Unimplemented", .num = 12 },
        .{ .name = "Internal", .num = 13 },
        .{ .name = "Unavailable", .num = 14 },
        .{ .name = "DataLoss", .num = 15 },
        .{ .name = "Unauthenticated", .num = 16 },
    };
    for (table) |p| if (std.ascii.eqlIgnoreCase(p.name, code)) return p.num;
    return -1;
}

fn writeKvJson(w: *std.Io.Writer, kv: []const GrpcMetadata) !void {
    try w.writeAll("[");
    for (kv, 0..) |entry, i| {
        if (i > 0) try w.writeAll(",");
        try w.writeAll("{\"name\":");
        try http.writeJsonString(w, entry.name);
        try w.writeAll(",\"value\":");
        try http.writeJsonString(w, entry.value);
        try w.writeAll("}");
    }
    try w.writeAll("]");
}

/// Specific error path for "grpcurl binary not on PATH". Distinct from the
/// generic transport error so the frontend can render an install-hint card
/// instead of a stack trace. Matches the shape the GrpcPanel viewer checks
/// for: `{ error: "grpcurl_missing", install_hint: "brew install grpcurl" }`.
pub fn formatMissingBinaryError(output: []u8) []const u8 {
    const body =
        "{\"error\":\"grpcurl_missing\"," ++
        "\"install_hint\":\"brew install grpcurl\"," ++
        "\"docs\":\"https://github.com/fullstorydev/grpcurl#installation\"}";
    if (output.len < body.len) return output[0..0];
    @memcpy(output[0..body.len], body);
    return output[0..body.len];
}

// Tests live in `grpc_test.zig` to keep this file under the 400-line cap
// (CLAUDE.md "Hard rules"). The reference below ensures `zig build test`
// picks them up via this module's import graph.
test {
    _ = @import("grpc_test.zig");
}
