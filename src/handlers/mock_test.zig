// Olgun Özoktaş geliştirdi · API Lab
// Unit + integration tests for the mock-server sidecar.
//
// The pure tests (request-line parse, matcher, response formatting)
// run on every `zig build test`. The socket integration test is
// gated behind `-Dmock-it=true` — it binds a real loopback port,
// which some restricted CI/test sandboxes disallow. Run it locally
// with:
//     zig build test -Dmock-it=true
// (and `-Dzero-native-path=...` when building inside a worktree).

const std = @import("std");
const testing = std.testing;
const build_options = @import("build_options");
const mock = @import("mock.zig");
const mock_http = @import("mock_http.zig");
const mock_socket = @import("mock_socket.zig");

// ── parseRequestLine ────────────────────────────────────────────────

test "parseRequestLine: extracts method + path" {
    const r = mock_http.parseRequestLine("GET /api/users HTTP/1.1").?;
    try testing.expectEqualStrings("GET", r.method);
    try testing.expectEqualStrings("/api/users", r.path);
}

test "parseRequestLine: strips the query string" {
    const r = mock_http.parseRequestLine("POST /search?q=zig&p=2 HTTP/1.1").?;
    try testing.expectEqualStrings("POST", r.method);
    try testing.expectEqualStrings("/search", r.path);
}

test "parseRequestLine: tolerates a trailing CRLF" {
    const r = mock_http.parseRequestLine("GET / HTTP/1.1\r\n").?;
    try testing.expectEqualStrings("/", r.path);
}

test "parseRequestLine: rejects a malformed line" {
    try testing.expect(mock_http.parseRequestLine("GET") == null);
    try testing.expect(mock_http.parseRequestLine("") == null);
    try testing.expect(mock_http.parseRequestLine("GET /only-two-fields") == null);
}

// ── findHeaderEnd ───────────────────────────────────────────────────

test "findHeaderEnd: locates the blank line" {
    const buf = "GET / HTTP/1.1\r\nHost: x\r\n\r\nbody";
    const end = mock_http.findHeaderEnd(buf).?;
    try testing.expectEqualStrings("body", buf[end..]);
}

test "findHeaderEnd: null when the terminator is absent" {
    try testing.expect(mock_http.findHeaderEnd("GET / HTTP/1.1\r\nHost: x\r\n") == null);
}

// ── matchExample ────────────────────────────────────────────────────

const sample_examples = [_]mock_http.Example{
    .{ .path = "/api/users", .method = "GET", .body = "users", .status = 200 },
    .{ .path = "/api/users", .method = "POST", .body = "created", .status = 201 },
    .{ .path = "/api/users", .method = "GET", .body = "shadowed", .status = 200 },
};

test "matchExample: matches on method + path" {
    const idx = mock_http.matchExample(&sample_examples, "POST", "/api/users").?;
    try testing.expectEqual(@as(usize, 1), idx);
}

test "matchExample: method compare is case-insensitive" {
    const idx = mock_http.matchExample(&sample_examples, "get", "/api/users").?;
    try testing.expectEqual(@as(usize, 0), idx);
}

test "matchExample: first matching example wins" {
    // Two GET /api/users entries — index 0 must win, not index 2.
    const idx = mock_http.matchExample(&sample_examples, "GET", "/api/users").?;
    try testing.expectEqual(@as(usize, 0), idx);
}

test "matchExample: no match returns null" {
    try testing.expect(mock_http.matchExample(&sample_examples, "GET", "/missing") == null);
    try testing.expect(mock_http.matchExample(&sample_examples, "DELETE", "/api/users") == null);
    try testing.expect(mock_http.matchExample(&.{}, "GET", "/") == null);
}

// ── statusReason ────────────────────────────────────────────────────

test "statusReason: known + unknown codes" {
    try testing.expectEqualStrings("OK", mock_http.statusReason(200));
    try testing.expectEqualStrings("Not Found", mock_http.statusReason(404));
    try testing.expectEqualStrings("", mock_http.statusReason(799));
}

// ── writeHttpResponse ───────────────────────────────────────────────

test "writeHttpResponse: status line, headers, recomputed Content-Length" {
    const ex = mock_http.Example{
        .status = 200,
        .body = "hello",
        .headers = &.{.{ .k = "X-Test", .v = "yes" }},
    };
    var buf: [512]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try mock_http.writeHttpResponse(&w, ex);
    const out = buf[0..w.end];
    try testing.expect(std.mem.startsWith(u8, out, "HTTP/1.1 200 OK\r\n"));
    try testing.expect(std.mem.indexOf(u8, out, "X-Test: yes\r\n") != null);
    try testing.expect(std.mem.indexOf(u8, out, "Content-Length: 5\r\n") != null);
    try testing.expect(std.mem.indexOf(u8, out, "Connection: close\r\n") != null);
    try testing.expect(std.mem.endsWith(u8, out, "\r\n\r\nhello"));
}

test "writeHttpResponse: drops a stale Content-Length from the example" {
    const ex = mock_http.Example{
        .status = 200,
        .body = "abc",
        .headers = &.{.{ .k = "Content-Length", .v = "999" }},
    };
    var buf: [256]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try mock_http.writeHttpResponse(&w, ex);
    const out = buf[0..w.end];
    try testing.expect(std.mem.indexOf(u8, out, "999") == null);
    try testing.expect(std.mem.indexOf(u8, out, "Content-Length: 3\r\n") != null);
}

test "writeHttpResponse: contentType fills in when no header is present" {
    const ex = mock_http.Example{ .status = 200, .body = "{}", .contentType = "application/json" };
    var buf: [256]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try mock_http.writeHttpResponse(&w, ex);
    try testing.expect(std.mem.indexOf(u8, buf[0..w.end], "Content-Type: application/json\r\n") != null);
}

test "writeNoMatchResponse: 404 with a descriptive body" {
    var buf: [512]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try mock_http.writeNoMatchResponse(&w, "GET", "/nope");
    const out = buf[0..w.end];
    try testing.expect(std.mem.startsWith(u8, out, "HTTP/1.1 404 Not Found\r\n"));
    try testing.expect(std.mem.indexOf(u8, out, "GET /nope") != null);
}

// ── socket integration (flag-gated) ─────────────────────────────────

fn readAll(fd: mock_socket.Socket, buf: []u8) []const u8 {
    var len: usize = 0;
    while (len < buf.len) {
        const n = mock_socket.readSocket(fd, buf[len..]);
        if (n == 0) break;
        len += n;
    }
    return buf[0..len];
}

const PortResult = struct { id: u32 = 0, port: u16 = 0 };

test "integration: mock server serves a saved example over a real socket" {
    if (!build_options.mock_it) return error.SkipZigTest;
    const gpa = testing.allocator;

    var ctx = mock.Context{ .gpa = gpa };
    defer ctx.deinit();

    var out: [4096]u8 = undefined;
    const payload =
        \\{"collectionId":"c1","examples":[
        \\{"id":"e1","name":"users","status":200,
        \\ "headers":[{"k":"X-Test","v":"yes"}],
        \\ "body":"{\"ok\":true}","contentType":"application/json",
        \\ "path":"/api/users","method":"GET","savedAt":0}]}
    ;
    const start_res = mock.runStart(&ctx, payload, &out) catch return error.SkipZigTest;
    const parsed = try std.json.parseFromSlice(PortResult, gpa, start_res, .{
        .ignore_unknown_fields = true,
    });
    defer parsed.deinit();
    try testing.expect(parsed.value.port != 0);

    const client = mock_socket.connectLoopback(parsed.value.port, 3000) catch return error.SkipZigTest;
    defer mock_socket.closeSocket(client);
    mock_socket.writeAll(client, "GET /api/users?cache=0 HTTP/1.1\r\nHost: x\r\n\r\n");

    var rbuf: [4096]u8 = undefined;
    const resp = readAll(client, &rbuf);
    try testing.expect(std.mem.indexOf(u8, resp, "HTTP/1.1 200 OK") != null);
    try testing.expect(std.mem.indexOf(u8, resp, "X-Test: yes") != null);
    try testing.expect(std.mem.indexOf(u8, resp, "Content-Type: application/json") != null);
    try testing.expect(std.mem.indexOf(u8, resp, "{\"ok\":true}") != null);
}

test "integration: unmatched route gets a 404 from the mock" {
    if (!build_options.mock_it) return error.SkipZigTest;
    const gpa = testing.allocator;

    var ctx = mock.Context{ .gpa = gpa };
    defer ctx.deinit();

    var out: [2048]u8 = undefined;
    const payload =
        \\{"collectionId":"c1","examples":[
        \\{"id":"e1","name":"root","status":200,"headers":[],
        \\ "body":"home","contentType":"text/plain",
        \\ "path":"/","method":"GET","savedAt":0}]}
    ;
    const start_res = mock.runStart(&ctx, payload, &out) catch return error.SkipZigTest;
    const parsed = try std.json.parseFromSlice(PortResult, gpa, start_res, .{
        .ignore_unknown_fields = true,
    });
    defer parsed.deinit();

    const client = mock_socket.connectLoopback(parsed.value.port, 3000) catch return error.SkipZigTest;
    defer mock_socket.closeSocket(client);
    mock_socket.writeAll(client, "GET /does-not-exist HTTP/1.1\r\nHost: x\r\n\r\n");

    var rbuf: [2048]u8 = undefined;
    const resp = readAll(client, &rbuf);
    try testing.expect(std.mem.indexOf(u8, resp, "HTTP/1.1 404 Not Found") != null);

    // mock.list reflects the running server; mock.stop tears it down.
    const list_res = try mock.runList(&ctx, "{}", &out);
    try testing.expect(std.mem.indexOf(u8, list_res, "\"status\":\"running\"") != null);
    try testing.expect(std.mem.indexOf(u8, list_res, "\"exampleCount\":1") != null);

    var stop_buf: [128]u8 = undefined;
    var id_buf: [64]u8 = undefined;
    const stop_payload = try std.fmt.bufPrint(&id_buf, "{{\"id\":{d}}}", .{parsed.value.id});
    const stop_res = try mock.runStop(&ctx, stop_payload, &stop_buf);
    try testing.expectEqualStrings("{\"ok\":true}", stop_res);

    // Stopping an unknown id is a clean {ok:false}, not a crash.
    const miss_res = try mock.runStop(&ctx, "{\"id\":999999}", &stop_buf);
    try testing.expectEqualStrings("{\"ok\":false}", miss_res);
}
