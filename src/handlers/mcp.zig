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

// Default deadline when the request doesn't supply one. A
// well-behaved MCP server exits within ms of receiving stdin EOF;
// 30 s is generous enough to cover the slowest cold-start (npx
// resolving a fresh package on a cold cache) without letting a
// genuinely hung server tie up the bridge thread indefinitely.
const DEFAULT_TIMEOUT_MS: u64 = 30_000;

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
    // Deadline on the spawned server's lifetime, in milliseconds. The
    // watchdog kills the child if `wait` hasn't returned by then. 0
    // (or absent) means "use the default" — the frontend rarely
    // overrides this. See DEFAULT_TIMEOUT_MS.
    timeout_ms: u64 = 0,
};

// Watchdog that kills the spawned child after `timeout_ms` if it
// hasn't exited on its own (e.g. an MCP server that ignores stdin
// EOF or wedges). Runs in its own thread; the main thread sets
// `done` once `child.wait` returns and joins the watchdog. `kill`
// from a different thread is safe — it's a libc-level signal send,
// and `Child.wait` reaps the resulting Term.signal cleanly.
const Watchdog = struct {
    child: *std.process.Child,
    io: std.Io,
    timeout_ms: u64,
    done: std.atomic.Value(bool),
    timed_out: std.atomic.Value(bool),

    fn run(self: *Watchdog) void {
        // Poll the done flag in 100 ms chunks so a fast normal exit
        // releases the thread quickly. `c.nanosleep` is a libc call
        // with no `Io` dependency, mirroring how mock_socket.zig
        // touches libc directly when worker-thread work must NOT
        // enter the main-loop event handler.
        const chunk_ts = std.c.timespec{ .sec = 0, .nsec = 100 * std.time.ns_per_ms };
        var elapsed_ms: u64 = 0;
        while (elapsed_ms < self.timeout_ms) {
            if (self.done.load(.acquire)) return;
            _ = std.c.nanosleep(&chunk_ts, null);
            elapsed_ms += 100;
        }
        if (self.done.load(.acquire)) return;
        // Snapshot the pid before sending the signal. If the main
        // thread's `child.wait` already reaped (child.id was set to
        // null by childCleanupPosix), skip — the kernel could have
        // recycled the pid and we'd SIGKILL an unrelated process.
        // The remaining race window between this read and the kill
        // call is microseconds wide; acceptable for a hardening pass.
        const pid = self.child.id orelse return;
        // Mark before kill so the main thread can label the result
        // "timeout" instead of the SIGKILL Term.signal that wait
        // would otherwise return on its own.
        self.timed_out.store(true, .release);
        // Send SIGKILL directly via libc. `Child.kill` reaps via
        // wait4 internally — calling that from here while the main
        // thread is already in `child.wait` causes a double-reap
        // panic ("Double-free" in Zig std). Direct kill leaves
        // reaping to the main thread, which is exactly the contract
        // `child.wait` expects.
        _ = std.c.kill(pid, .KILL);
    }
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
/// on failure `{"error":"..."}`. `pub` so the integration test in
/// `mcp_test.zig` can drive it directly.
pub fn runStdio(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
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

    // Bound the wait so a hung MCP server can't tie up the bridge
    // thread forever. The watchdog runs in its own thread; we signal
    // `done` before joining so a normal exit releases it promptly.
    const timeout_ms = if (req.timeout_ms > 0) req.timeout_ms else DEFAULT_TIMEOUT_MS;
    var watchdog = Watchdog{
        .child = &child,
        .io = io,
        .timeout_ms = timeout_ms,
        .done = .init(false),
        .timed_out = .init(false),
    };
    const wd_thread = try std.Thread.spawn(.{}, Watchdog.run, .{&watchdog});

    const term = child.wait(io) catch |err| {
        watchdog.done.store(true, .release);
        wd_thread.join();
        return http.formatError(output, @errorName(err));
    };
    watchdog.done.store(true, .release);
    wd_thread.join();

    if (watchdog.timed_out.load(.acquire)) {
        return http.formatError(output, "timeout");
    }
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
