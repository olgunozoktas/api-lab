// Olgun Özoktaş geliştirdi · API Lab
// mcp.zig — the `mcp.stdio` bridge handler. Most MCP servers speak
// JSON-RPC over a child process's stdin/stdout; the sandboxed
// WKWebView frontend cannot spawn processes, so — exactly as
// `http.request` shells out to curl for CORS-free HTTP — this handler
// spawns the MCP server natively and pipes one batch of JSON-RPC
// frames through it.
//
// One-shot model (mirrors http.zig's one-shot curl): the frontend
// hands over the full ordered frame list (initialize + initialized +
// the operation), the handler spawns the server once, feeds every
// frame, collects all stdout, and the process exits on stdin EOF. No
// persistent session — each gallery operation re-spawns. The MCP
// protocol logic (framing, the handshake sequence, response matching)
// lives in the frontend's lib/mcp.ts; this handler is a dumb pipe.
//
// stdin/stdout are redirected through temp files rather than live
// pipes: file I/O is the proven pattern in this codebase (grpc_tls.zig)
// and sidesteps the Zig 0.16 raw-pipe reader dance. The child reads a
// finite stdin file, hits EOF, and exits.
//
// Process-spawn is gated by the `network` permission in main.zig — an
// MCP server is a network-capable peer. The command path is untrusted
// input and only ever reaches `std.process.spawn`.
const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const http = @import("http.zig");

// Upper bound on collected stdout — keeps the result inside the
// bridge's ~1 MB JSON envelope (the same cap http.zig respects).
const MAX_STDOUT: usize = 900 * 1024;

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
    env_map: *std.process.Environ.Map,
};

pub fn handler(ctx: *Context) bridge.Handler {
    return .{
        .name = "mcp.stdio",
        .context = ctx,
        .invoke_fn = invoke,
    };
}

const McpStdioRequest = struct {
    command: []const u8,
    args: []const []const u8 = &.{},
    // JSON-RPC frames to write to the server's stdin, in order. Each
    // lands on its own line — newline-delimited JSON is the MCP stdio
    // framing.
    frames: []const []const u8 = &.{},
};

// Join JSON-RPC frames into the newline-delimited stdin payload: one
// frame per line, every line (including the last) newline-terminated
// so the server's line reader sees a complete final message. Pure —
// unit-tested in mcp_test.zig.
pub fn joinFrames(a: std.mem.Allocator, frames: []const []const u8) ![]u8 {
    var buf: std.ArrayList(u8) = .empty;
    errdefer buf.deinit(a);
    for (frames) |frame| {
        try buf.appendSlice(a, frame);
        try buf.append(a, '\n');
    }
    return buf.toOwnedSlice(a);
}

fn invoke(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runStdio(ctx, invocation.request.payload, output) catch |err| {
        return http.formatError(output, @errorName(err));
    };
}

/// Spawn an MCP server, feed it the request frames over stdin, and
/// return its stdout. Response JSON: `{"stdout":"<text>","exit_code":<n>}`;
/// on failure `{"error":"..."}`.
fn runStdio(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();
    const io = ctx.io;

    const parsed = try std.json.parseFromSlice(McpStdioRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const req = parsed.value;
    if (req.command.len == 0) return http.formatError(output, "empty command");

    // Per-invocation temp dir holding the stdin / stdout redirect
    // files. 0o700 — only this process's owner can traverse it.
    var rand_bytes: [4]u8 = undefined;
    io.random(&rand_bytes);
    const dir_path = try std.fmt.allocPrint(
        a,
        "/tmp/api-lab-mcp-{x:0>2}{x:0>2}{x:0>2}{x:0>2}",
        .{ rand_bytes[0], rand_bytes[1], rand_bytes[2], rand_bytes[3] },
    );
    var cwd = std.Io.Dir.cwd();
    _ = try cwd.createDirPathStatus(io, dir_path, .fromMode(0o700));
    defer cwd.deleteTree(io, dir_path) catch {};

    // stdin file — every frame newline-delimited.
    const in_path = try std.fmt.allocPrint(a, "{s}/in", .{dir_path});
    const stdin_bytes = try joinFrames(a, req.frames);
    try cwd.writeFile(io, .{ .sub_path = in_path, .data = stdin_bytes });
    const out_path = try std.fmt.allocPrint(a, "{s}/out", .{dir_path});

    // argv = command followed by its args.
    var argv: std.ArrayList([]const u8) = .empty;
    try argv.append(a, req.command);
    for (req.args) |arg| try argv.append(a, arg);

    var in_file = try cwd.openFile(io, in_path, .{});
    defer in_file.close(io);
    var out_file = try cwd.createFile(io, out_path, .{});
    defer out_file.close(io);

    var child = std.process.spawn(io, .{
        .argv = argv.items,
        .environ_map = ctx.env_map,
        .stdin = .{ .file = in_file },
        .stdout = .{ .file = out_file },
        .stderr = .ignore,
    }) catch |err| {
        return http.formatError(output, @errorName(err));
    };
    // Mirrors std.process.run — kill is idempotent after a reap, so a
    // deferred kill is the safety net for the error paths below.
    defer child.kill(io);

    const term = child.wait(io) catch |err| {
        return http.formatError(output, @errorName(err));
    };
    const exit_code: i32 = if (term == .exited) @intCast(term.exited) else -1;

    // Read the server's stdout back from the redirect file.
    const stdout = cwd.readFileAlloc(io, out_path, a, .limited(MAX_STDOUT)) catch |err| {
        return http.formatError(output, @errorName(err));
    };

    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"stdout\":");
    try http.writeJsonString(&w, stdout);
    try w.print(",\"exit_code\":{d}}}", .{exit_code});
    return output[0..w.end];
}

test {
    _ = @import("mcp_test.zig");
}
