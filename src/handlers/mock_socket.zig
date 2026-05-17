// Olgun Özoktaş geliştirdi · API Lab
// mock_socket.zig — thin libc TCP wrapper for the mock-server sidecar.
//
// Zig 0.16 removed the blocking socket syscalls from `std.posix` (only
// `read` + `setsockopt` survive there) and deleted `std.net` outright;
// the modern socket API now routes through the event-loop `std.Io`,
// which the mock's worker-thread accept loop must NOT touch (data race
// — see mock.zig's header decision). So this file binds the raw libc
// socket entry points via `std.c` directly: thin blocking syscalls, no
// `Io` dependency, safe to drive from a spawned worker thread.

const std = @import("std");
const c = std.c;

pub const Socket = std.posix.fd_t;

pub const SocketError = error{
    SocketCreateFailed,
    BindFailed,
    ListenFailed,
    GetSockNameFailed,
    ConnectFailed,
};

/// 127.0.0.1 — the mock binds loopback only, never a routable address.
const LOOPBACK_ADDR: u32 = 0x7f000001;

fn loopbackSockaddr(port: u16) std.posix.sockaddr.in {
    return .{
        .port = std.mem.nativeToBig(u16, port),
        .addr = std.mem.nativeToBig(u32, LOOPBACK_ADDR),
    };
}

/// Apply SO_RCVTIMEO so a blocking `read` returns instead of wedging
/// the single-threaded accept loop forever on a slow client.
pub fn setRecvTimeoutMs(fd: Socket, ms: u32) void {
    const tv = std.posix.timeval{
        .sec = @intCast(ms / 1000),
        .usec = @intCast((ms % 1000) * 1000),
    };
    _ = c.setsockopt(fd, c.SOL.SOCKET, c.SO.RCVTIMEO, &tv, @sizeOf(std.posix.timeval));
}

/// O_NONBLOCK — stable POSIX/BSD value on macOS (`<sys/fcntl.h>`).
const O_NONBLOCK: c_int = 0x0004;

/// Flip a socket into non-blocking mode. The listener is made
/// non-blocking so `accept` can never wedge the accept loop: even if
/// `poll` and `accept` race (a pending connection is RST'd in
/// between), `accept` returns EWOULDBLOCK immediately instead of
/// blocking forever and starving the shutdown flag.
fn setNonBlocking(fd: Socket) void {
    const flags = c.fcntl(fd, c.F.GETFL);
    if (flags < 0) return;
    _ = c.fcntl(fd, c.F.SETFL, @as(c_int, flags | O_NONBLOCK));
}

/// Clear O_NONBLOCK — force a socket back to blocking mode. macOS/BSD
/// `accept` returns a socket that INHERITS the listener's
/// non-blocking flag; a non-blocking connection would make the
/// handler's first `read` return EWOULDBLOCK before the request even
/// arrives. The connection must be blocking so `read` (bounded by
/// SO_RCVTIMEO) waits for the request bytes.
fn setBlocking(fd: Socket) void {
    const flags = c.fcntl(fd, c.F.GETFL);
    if (flags < 0) return;
    _ = c.fcntl(fd, c.F.SETFL, @as(c_int, flags & ~O_NONBLOCK));
}

pub const Listener = struct { fd: Socket, port: u16 };

/// Bind a TCP listener to 127.0.0.1. `port == 0` picks an ephemeral
/// port, read back via `getsockname`.
pub fn listenLoopback(port: u16) SocketError!Listener {
    const fd = c.socket(c.AF.INET, c.SOCK.STREAM, c.IPPROTO.TCP);
    if (fd < 0) return error.SocketCreateFailed;
    errdefer _ = c.close(fd);

    const one: c_int = 1;
    _ = c.setsockopt(fd, c.SOL.SOCKET, c.SO.REUSEADDR, &one, @sizeOf(c_int));
    setNonBlocking(fd);

    var sa = loopbackSockaddr(port);
    if (c.bind(fd, @ptrCast(&sa), @sizeOf(std.posix.sockaddr.in)) != 0) return error.BindFailed;
    if (c.listen(fd, 16) != 0) return error.ListenFailed;

    var bound: std.posix.sockaddr.in = undefined;
    var slen: std.posix.socklen_t = @sizeOf(std.posix.sockaddr.in);
    if (c.getsockname(fd, @ptrCast(&bound), &slen) != 0) return error.GetSockNameFailed;
    return .{ .fd = fd, .port = std.mem.bigToNative(u16, bound.port) };
}

/// Accept the next connection, polling with `poll_timeout_ms` so the
/// caller can re-check its stop flag. Returns null on timeout (no
/// pending connection) or on a transient accept error.
///
/// `accept` blocks until a connection exists; `SO_RCVTIMEO` does NOT
/// reliably interrupt `accept` on macOS/BSD. So the loop is made
/// interruptible by `poll`-ing the listener first: poll wakes every
/// `poll_timeout_ms`, and `accept` only runs once poll reports the
/// listener readable — at which point a connection is already queued,
/// so the accept returns immediately rather than blocking.
pub fn acceptConn(listener: Socket, poll_timeout_ms: u32) ?Socket {
    var fds = [_]c.pollfd{.{ .fd = listener, .events = c.POLL.IN, .revents = 0 }};
    const pr = c.poll(&fds, 1, @intCast(poll_timeout_ms));
    if (pr <= 0) return null; // 0 = timeout, <0 = error → re-check stop flag
    if (fds[0].revents & c.POLL.IN == 0) return null;
    const fd = c.accept(listener, null, null);
    if (fd < 0) return null;
    // The accepted socket inherits the listener's non-blocking flag on
    // macOS/BSD — clear it so the handler's `read` blocks (bounded by
    // SO_RCVTIMEO) until the request bytes land.
    setBlocking(fd);
    return fd;
}

/// Open a loopback client connection — used by the integration test.
pub fn connectLoopback(port: u16, recv_timeout_ms: u32) SocketError!Socket {
    const fd = c.socket(c.AF.INET, c.SOCK.STREAM, c.IPPROTO.TCP);
    if (fd < 0) return error.SocketCreateFailed;
    errdefer _ = c.close(fd);
    setRecvTimeoutMs(fd, recv_timeout_ms);
    var sa = loopbackSockaddr(port);
    if (c.connect(fd, @ptrCast(&sa), @sizeOf(std.posix.sockaddr.in)) != 0) return error.ConnectFailed;
    return fd;
}

pub fn closeSocket(fd: Socket) void {
    _ = c.close(fd);
}

/// Read up to `buf.len` bytes. Returns 0 on EOF, timeout, or error —
/// the caller treats all three the same (stop reading).
pub fn readSocket(fd: Socket, buf: []u8) usize {
    const n = c.read(fd, buf.ptr, buf.len);
    if (n <= 0) return 0;
    return @intCast(n);
}

/// Write the whole slice, looping over short writes. Best-effort:
/// a write error just stops (the connection is about to be closed).
pub fn writeAll(fd: Socket, data: []const u8) void {
    var sent: usize = 0;
    while (sent < data.len) {
        const n = c.write(fd, data.ptr + sent, data.len - sent);
        if (n <= 0) return;
        sent += @intCast(n);
    }
}
