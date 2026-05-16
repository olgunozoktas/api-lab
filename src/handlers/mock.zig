// Olgun Özoktaş geliştirdi · API Lab
// mock.zig — local mock-server sidecar. Serves saved response
// `Example`s over a real loopback HTTP listener so external tools
// (curl, a browser, another service) can hit them.
//
// ── Zig 0.16 net-API decision (backlog Item 1) ──────────────────────
// Zig 0.16 *does* ship a server-side socket API — `std.Io.net`'s
// `IpAddress.listen` → `Server.accept`. But every call threads the
// runtime event-loop `io: std.Io`, and a blocking `accept` driven from
// a spawned worker thread that shares the main-loop `Io` is a data
// race. Worse, Zig 0.16 stripped the blocking socket syscalls out of
// `std.posix` entirely (only `read` + `setsockopt` survive) and
// deleted `std.net`. So this sidecar binds the **raw libc socket
// entry points via `std.c`** (see `mock_socket.zig`): thin blocking
// syscalls with no `Io` dependency, correct + safe for a worker-thread
// accept loop. The loop stays responsive to shutdown via a 200 ms
// `SO_RCVTIMEO` on the listener: `accept` returns on a timeout, the
// loop re-checks the atomic `running` flag, and exits so the thread
// can be joined.
//
// Three bridge commands, all sharing one `Context`:
//   mock.start({collectionId, examples, port?}) → {id, port}
//   mock.stop({id})                             → {ok}
//   mock.list()                                 → [{id, port, exampleCount, status}]
//
// Pure request-line parsing / matching / response formatting lives in
// `mock_http.zig`; the libc TCP wrapper in `mock_socket.zig` — keeps
// every file under the 400-line cap.

const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const http = @import("http.zig");
const mock_http = @import("mock_http.zig");
const mock_socket = @import("mock_socket.zig");

const Example = mock_http.Example;
const StartRequest = mock_http.StartRequest;
const Socket = mock_socket.Socket;

/// Accept-loop poll interval — the listener `poll` wakes this often so
/// the loop can re-check the shutdown flag.
const ACCEPT_POLL_MS: u32 = 200;
/// Per-connection read timeout — a slow/incomplete client can't wedge
/// the single-threaded accept loop longer than this.
const CONN_TIMEOUT_MS: u32 = 5000;
const REQUEST_BUF_BYTES: usize = 16 * 1024;

// ── one running mock server ─────────────────────────────────────────

pub const MockServer = struct {
    id: u32,
    port: u16,
    listener: Socket,
    thread: ?std.Thread = null,
    running: std.atomic.Value(bool),
    /// Owns every byte the examples point at — kept alive for the
    /// server's lifetime, freed by `stopServer`.
    parsed: std.json.Parsed(StartRequest),
    examples: []const Example,
    gpa: std.mem.Allocator,

    /// Worker-thread entry point: blocking accept loop.
    fn acceptLoop(self: *MockServer) void {
        while (self.running.load(.acquire)) {
            const conn = mock_socket.acceptConn(self.listener, ACCEPT_POLL_MS) orelse continue;
            self.handleConnection(conn);
            mock_socket.closeSocket(conn);
        }
    }

    /// Read one request off the socket, match it, write the response.
    fn handleConnection(self: *MockServer, conn: Socket) void {
        mock_socket.setRecvTimeoutMs(conn, CONN_TIMEOUT_MS);
        var buf: [REQUEST_BUF_BYTES]u8 = undefined;
        var len: usize = 0;
        while (len < buf.len) {
            const n = mock_socket.readSocket(conn, buf[len..]);
            if (n == 0) break;
            len += n;
            if (mock_http.findHeaderEnd(buf[0..len]) != null) break;
        }
        const data = buf[0..len];
        const line_end = std.mem.indexOf(u8, data, "\r\n") orelse data.len;
        self.respond(conn, mock_http.parseRequestLine(data[0..line_end]));
    }

    fn respond(self: *MockServer, conn: Socket, req: ?mock_http.RequestLine) void {
        if (req) |r| {
            if (mock_http.matchExample(self.examples, r.method, r.path)) |idx| {
                const ex = self.examples[idx];
                var cap: usize = ex.body.len + 1024;
                for (ex.headers) |h| cap += h.k.len + h.v.len + 4;
                const out = self.gpa.alloc(u8, cap) catch return;
                defer self.gpa.free(out);
                var w = std.Io.Writer.fixed(out);
                mock_http.writeHttpResponse(&w, ex) catch return;
                mock_socket.writeAll(conn, out[0..w.end]);
                return;
            }
        }
        var out: [1024]u8 = undefined;
        var w = std.Io.Writer.fixed(&out);
        const m = if (req) |r| r.method else "?";
        const p = if (req) |r| r.path else "?";
        mock_http.writeNoMatchResponse(&w, m, p) catch return;
        mock_socket.writeAll(conn, out[0..w.end]);
    }
};

/// Stop a server: flip the flag, join the accept thread, close the
/// listener, free the example arena. The thread is joined *before*
/// the listener closes, so no `accept` races a `close`.
fn stopServer(srv: *MockServer) void {
    srv.running.store(false, .release);
    if (srv.thread) |t| {
        t.join();
        srv.thread = null;
    }
    mock_socket.closeSocket(srv.listener);
    srv.parsed.deinit();
}

// ── shared bridge context ───────────────────────────────────────────

pub const Context = struct {
    gpa: std.mem.Allocator,
    /// `servers` + `next_id` are touched only from the bridge-dispatch
    /// thread — `Dispatcher.dispatch` invokes handlers synchronously,
    /// one at a time, so no two `mock.*` handlers ever overlap. The
    /// spawned accept threads never read this map; they only touch
    /// their own `MockServer.running` (atomic) and `examples`
    /// (immutable after start). So the map needs no lock.
    servers: std.AutoHashMapUnmanaged(u32, *MockServer) = .empty,
    next_id: u32 = 1,

    /// App-lifecycle shutdown hook: `main` defers this, so closing API
    /// Lab stops every active mock and joins its thread cleanly.
    pub fn deinit(self: *Context) void {
        var it = self.servers.valueIterator();
        while (it.next()) |srv| {
            stopServer(srv.*);
            self.gpa.destroy(srv.*);
        }
        self.servers.deinit(self.gpa);
    }
};

// ── bridge handlers ─────────────────────────────────────────────────

pub fn startHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "mock.start", .context = ctx, .invoke_fn = invokeStart };
}

pub fn stopHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "mock.stop", .context = ctx, .invoke_fn = invokeStop };
}

pub fn listHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "mock.list", .context = ctx, .invoke_fn = invokeList };
}

fn invokeStart(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runStart(ctx, invocation.request.payload, output) catch |err|
        http.formatError(output, @errorName(err));
}

fn invokeStop(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runStop(ctx, invocation.request.payload, output) catch |err|
        http.formatError(output, @errorName(err));
}

fn invokeList(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runList(ctx, invocation.request.payload, output) catch |err|
        http.formatError(output, @errorName(err));
}

/// `mock.start` — bind a listener, spawn the accept thread, register
/// the server. Returns `{id, port}`. Pub for the integration test.
pub fn runStart(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    const parsed = std.json.parseFromSlice(StartRequest, ctx.gpa, payload, .{
        .ignore_unknown_fields = true,
    }) catch |err| return http.formatError(output, @errorName(err));

    const listener = mock_socket.listenLoopback(parsed.value.port) catch |err| {
        parsed.deinit();
        return http.formatError(output, @errorName(err));
    };

    const srv = ctx.gpa.create(MockServer) catch |err| {
        mock_socket.closeSocket(listener.fd);
        parsed.deinit();
        return http.formatError(output, @errorName(err));
    };

    const id = ctx.next_id;
    ctx.next_id += 1;
    srv.* = .{
        .id = id,
        .port = listener.port,
        .listener = listener.fd,
        .running = std.atomic.Value(bool).init(true),
        .parsed = parsed,
        .examples = parsed.value.examples,
        .gpa = ctx.gpa,
    };
    ctx.servers.put(ctx.gpa, id, srv) catch |err| {
        mock_socket.closeSocket(listener.fd);
        parsed.deinit();
        ctx.gpa.destroy(srv);
        return http.formatError(output, @errorName(err));
    };

    srv.thread = std.Thread.spawn(.{}, MockServer.acceptLoop, .{srv}) catch |err| {
        _ = ctx.servers.remove(id);
        mock_socket.closeSocket(listener.fd);
        parsed.deinit();
        ctx.gpa.destroy(srv);
        return http.formatError(output, @errorName(err));
    };

    var w = std.Io.Writer.fixed(output);
    try w.print("{{\"id\":{d},\"port\":{d}}}", .{ id, listener.port });
    return output[0..w.end];
}

const StopRequest = struct { id: u32 = 0 };

/// `mock.stop` — stop + remove a server by id. Unknown id → `{ok:false}`.
pub fn runStop(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const parsed = std.json.parseFromSlice(StopRequest, arena.allocator(), payload, .{
        .ignore_unknown_fields = true,
    }) catch |err| return http.formatError(output, @errorName(err));

    if (ctx.servers.fetchRemove(parsed.value.id)) |kv| {
        stopServer(kv.value);
        ctx.gpa.destroy(kv.value);
        return constJson(output, "{\"ok\":true}");
    }
    return constJson(output, "{\"ok\":false}");
}

/// `mock.list` — every active server as `[{id, port, exampleCount, status}]`.
pub fn runList(ctx: *Context, _: []const u8, output: []u8) ![]const u8 {
    var w = std.Io.Writer.fixed(output);
    try w.writeAll("[");
    var it = ctx.servers.valueIterator();
    var first = true;
    while (it.next()) |srv_ptr| {
        const srv = srv_ptr.*;
        if (!first) try w.writeAll(",");
        first = false;
        try w.print(
            "{{\"id\":{d},\"port\":{d},\"exampleCount\":{d},\"status\":\"running\"}}",
            .{ srv.id, srv.port, srv.examples.len },
        );
    }
    try w.writeAll("]");
    return output[0..w.end];
}

fn constJson(output: []u8, comptime body: []const u8) []const u8 {
    @memcpy(output[0..body.len], body);
    return output[0..body.len];
}

test {
    _ = @import("mock_test.zig");
}
