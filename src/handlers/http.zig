const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;

const SEPARATOR = "\n----APILAB-METRICS----";

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

const HttpRequest = struct {
    method: []const u8 = "GET",
    url: []const u8,
    headers: []const Header = &.{},
    body: ?[]const u8 = null,
    timeout_ms: u32 = 60000,
    follow_redirects: u32 = 10,
    insecure: bool = false,

    pub const Header = struct {
        name: []const u8,
        value: []const u8,
    };
};

fn invoke(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runRequest(ctx, invocation.request.payload, output) catch |err| {
        return formatError(output, @errorName(err));
    };
}

fn runRequest(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(HttpRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const req = parsed.value;

    var argv: std.ArrayList([]const u8) = .empty;
    try argv.append(a, "curl");
    try argv.append(a, "--silent");
    try argv.append(a, "--show-error");
    try argv.append(a, "--include"); // include response headers in stdout
    try argv.append(a, "--no-buffer");
    if (req.insecure) try argv.append(a, "--insecure");
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
    if (req.body) |b| if (b.len > 0) {
        try argv.append(a, "--data-binary");
        try argv.append(a, b);
    };
    try argv.append(a, "--url");
    try argv.append(a, req.url);

    const result = std.process.run(ctx.gpa, ctx.io, .{
        .argv = argv.items,
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
    try w.writeAll(",\"body\":");
    try writeJsonString(&w, body_bytes);
    try w.writeAll("}");
    return output[0..w.end];
}

fn findLastHeaderBoundary(data: []const u8) usize {
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

fn writeHeadersJson(w: *std.Io.Writer, headers_block: []const u8) !void {
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

fn writeJsonString(w: *std.Io.Writer, s: []const u8) !void {
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

fn formatError(output: []u8, msg: []const u8) []const u8 {
    var w = std.Io.Writer.fixed(output);
    w.print("{{\"error\":\"{s}\"}}", .{msg}) catch {};
    return output[0..w.end];
}

fn formatTransportError(output: []u8, msg: []const u8, exit_code: i32, stderr: []const u8, elapsed_ms: u64) []const u8 {
    var w = std.Io.Writer.fixed(output);
    w.print("{{\"error\":\"{s}\",\"exit_code\":{d},\"timing_ms\":{d},\"stderr\":", .{ msg, exit_code, elapsed_ms }) catch {};
    writeJsonString(&w, std.mem.trim(u8, stderr, " \t\r\n")) catch {};
    w.writeAll("}") catch {};
    return output[0..w.end];
}
