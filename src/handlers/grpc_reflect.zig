// gRPC reflection bridge — exposes two commands:
//   `grpc.reflect.list({target, plaintext, timeout_ms})`
//      → {services: [{name, methods: [{name, request_type, response_type,
//          client_stream, server_stream}]}], error?, exit_code?}
//   `grpc.reflect.skeleton({target, message_type, plaintext, timeout_ms})`
//      → {skeleton: "<json>", error?, exit_code?}
//
// Both shell out to grpcurl. `list` fans out — one initial `grpcurl
// list` to enumerate services, then one `grpcurl describe <service>`
// per non-internal service to pull the method table. `skeleton` runs
// a single `grpcurl describe <message-type>` and folds the field list
// into a JSON object using the writeSkeleton helper.
//
// TLS overrides (cacert, client cert+key, servername) are NOT exposed
// here in v1 — reflection mostly runs against internal/dev servers
// where system trust roots + plaintext suffice. Adding the same shape
// as `grpc.invoke` is a follow-up if the need surfaces.

const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const http = @import("http.zig");
const parsers = @import("grpc_reflect_parsers.zig");

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
    env_map: *std.process.Environ.Map,
};

pub const ListRequest = struct {
    target: []const u8,
    plaintext: bool = false,
    timeout_ms: u32 = 30000,
};

pub const SkeletonRequest = struct {
    target: []const u8,
    message_type: []const u8,
    plaintext: bool = false,
    timeout_ms: u32 = 30000,
};

pub fn listHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "grpc.reflect.list", .context = ctx, .invoke_fn = invokeList };
}

pub fn skeletonHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "grpc.reflect.skeleton", .context = ctx, .invoke_fn = invokeSkeleton };
}

fn invokeList(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runList(ctx, invocation.request.payload, output) catch |err| {
        return http.formatError(output, @errorName(err));
    };
}

fn invokeSkeleton(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runSkeleton(ctx, invocation.request.payload, output) catch |err| {
        return http.formatError(output, @errorName(err));
    };
}

fn runList(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(ListRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const req = parsed.value;
    if (req.target.len == 0) return http.formatError(output, "target is empty");

    const list_argv = try buildBaseArgv(a, req.target, req.plaintext, req.timeout_ms, "list", "");
    const list_run = std.process.run(ctx.gpa, ctx.io, .{
        .argv = list_argv,
        .stdout_limit = .limited(256 * 1024),
        .stderr_limit = .limited(64 * 1024),
        .environ_map = ctx.env_map,
    }) catch |err| {
        if (err == error.FileNotFound) return formatMissingBinaryError(output);
        return http.formatError(output, @errorName(err));
    };
    defer ctx.gpa.free(list_run.stdout);
    defer ctx.gpa.free(list_run.stderr);

    if (list_run.term != .exited or list_run.term.exited != 0) {
        return formatRunError(output, list_run.stderr, exitCode(list_run.term));
    }

    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"services\":[");

    var iter = parsers.iterServices(list_run.stdout);
    var first = true;
    while (iter.next()) |service_name| {
        const desc_argv = try buildBaseArgv(a, req.target, req.plaintext, req.timeout_ms, "describe", service_name);
        const desc_run = std.process.run(ctx.gpa, ctx.io, .{
            .argv = desc_argv,
            .stdout_limit = .limited(256 * 1024),
            .stderr_limit = .limited(64 * 1024),
            .environ_map = ctx.env_map,
        }) catch |err| {
            // Per-service describe failure shouldn't blow up the whole
            // list — emit the service with empty methods + a per-service
            // error tag the frontend can surface.
            if (!first) try w.writeAll(",");
            first = false;
            try writeServiceErrorJson(&w, service_name, @errorName(err));
            continue;
        };
        defer ctx.gpa.free(desc_run.stdout);
        defer ctx.gpa.free(desc_run.stderr);

        if (!first) try w.writeAll(",");
        first = false;

        if (desc_run.term != .exited or desc_run.term.exited != 0) {
            try writeServiceErrorJson(&w, service_name, "describe_failed");
            continue;
        }

        var methods: [128]parsers.ParsedMethod = undefined;
        const n = parsers.parseServiceMethods(desc_run.stdout, &methods);
        try writeServiceJson(&w, service_name, methods[0..n]);
    }

    try w.writeAll("]}");
    return output[0..w.end];
}

fn runSkeleton(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(SkeletonRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const req = parsed.value;
    if (req.target.len == 0) return http.formatError(output, "target is empty");
    if (req.message_type.len == 0) return http.formatError(output, "message_type is empty");

    const argv = try buildBaseArgv(a, req.target, req.plaintext, req.timeout_ms, "describe", req.message_type);
    const run = std.process.run(ctx.gpa, ctx.io, .{
        .argv = argv,
        .stdout_limit = .limited(256 * 1024),
        .stderr_limit = .limited(64 * 1024),
        .environ_map = ctx.env_map,
    }) catch |err| {
        if (err == error.FileNotFound) return formatMissingBinaryError(output);
        return http.formatError(output, @errorName(err));
    };
    defer ctx.gpa.free(run.stdout);
    defer ctx.gpa.free(run.stderr);

    if (run.term != .exited or run.term.exited != 0) {
        return formatRunError(output, run.stderr, exitCode(run.term));
    }

    var fields: [128]parsers.ParsedField = undefined;
    const n = parsers.parseMessageFields(run.stdout, &fields);

    // Write into the second half of `output` first, then JSON-string-
    // escape that into the first half. Sized so even ~3 KB of skeleton
    // fits in the bridge's 1 MB output cap.
    var skel_buf: [16 * 1024]u8 = undefined;
    var skel_w = std.Io.Writer.fixed(&skel_buf);
    try parsers.writeSkeleton(&skel_w, fields[0..n]);
    const skel = skel_buf[0..skel_w.end];

    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"skeleton\":");
    try http.writeJsonString(&w, skel);
    try w.writeAll("}");
    return output[0..w.end];
}

/// Build `grpcurl [-plaintext] -max-time <s> <target> <subcmd> [arg]`.
/// Used for both `list` and `describe` subcommands. Pure: no I/O.
fn buildBaseArgv(
    a: std.mem.Allocator,
    target: []const u8,
    plaintext: bool,
    timeout_ms: u32,
    subcmd: []const u8,
    subarg: []const u8,
) ![]const []const u8 {
    var argv: std.ArrayList([]const u8) = .empty;
    try argv.append(a, "grpcurl");
    if (plaintext) try argv.append(a, "-plaintext");
    try argv.append(a, "-max-time");
    try argv.append(a, try std.fmt.allocPrint(a, "{d}", .{@max(timeout_ms / 1000, 1)}));
    try argv.append(a, target);
    try argv.append(a, subcmd);
    if (subarg.len > 0) try argv.append(a, subarg);
    return argv.items;
}

fn writeServiceJson(w: *std.Io.Writer, name: []const u8, methods: []const parsers.ParsedMethod) !void {
    try w.writeAll("{\"name\":");
    try http.writeJsonString(w, name);
    try w.writeAll(",\"methods\":[");
    for (methods, 0..) |m, i| {
        if (i > 0) try w.writeAll(",");
        try w.writeAll("{\"name\":");
        try http.writeJsonString(w, m.name);
        try w.writeAll(",\"request_type\":");
        try http.writeJsonString(w, m.request_type);
        try w.writeAll(",\"response_type\":");
        try http.writeJsonString(w, m.response_type);
        try w.print(",\"client_stream\":{},\"server_stream\":{}", .{ m.client_stream, m.server_stream });
        try w.writeAll("}");
    }
    try w.writeAll("]}");
}

fn writeServiceErrorJson(w: *std.Io.Writer, name: []const u8, err: []const u8) !void {
    try w.writeAll("{\"name\":");
    try http.writeJsonString(w, name);
    try w.writeAll(",\"methods\":[],\"error\":");
    try http.writeJsonString(w, err);
    try w.writeAll("}");
}

fn exitCode(term: std.process.Child.Term) i32 {
    return if (term == .exited) @intCast(term.exited) else -1;
}

fn formatRunError(output: []u8, stderr: []const u8, code: i32) []const u8 {
    var w = std.Io.Writer.fixed(output);
    w.writeAll("{\"error\":\"reflection_failed\",\"exit_code\":") catch return output[0..0];
    w.print("{d}", .{code}) catch return output[0..0];
    w.writeAll(",\"stderr\":") catch return output[0..0];
    http.writeJsonString(&w, std.mem.trim(u8, stderr, " \t\r\n")) catch return output[0..0];
    w.writeAll("}") catch return output[0..0];
    return output[0..w.end];
}

fn formatMissingBinaryError(output: []u8) []const u8 {
    const body =
        "{\"error\":\"grpcurl_missing\"," ++
        "\"install_hint\":\"brew install grpcurl\"," ++
        "\"docs\":\"https://github.com/fullstorydev/grpcurl#installation\"}";
    if (output.len < body.len) return output[0..0];
    @memcpy(output[0..body.len], body);
    return output[0..body.len];
}

test {
    _ = parsers;
}
