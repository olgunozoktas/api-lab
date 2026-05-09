// Unit tests for `handlers/http.zig` — Phase F (tests + CI/CD).
//
// Run with: `zig build test` (test step in build.zig drives `app_mod` which
// imports http.zig via main.zig; http.zig in turn `@import("http_test.zig")`s
// inside a `test {}` block, surfacing this file to the test runner).
// Covers the pure helpers: argv construction, header parsing, JSON encoding,
// error formatting. The full runRequest path is integration-only (requires
// curl + network) and is exercised by the E2E suite, not unit tests.

const std = @import("std");
const testing = std.testing;
const http = @import("http.zig");

test "buildArgv: GET request includes core curl flags + URL" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://example.com" };
    const argv = try http.buildArgv(a, req);

    try testing.expectEqualStrings("curl", argv[0]);
    try testing.expectEqualStrings("--silent", argv[1]);
    try testing.expectEqualStrings("--show-error", argv[2]);
    try testing.expectEqualStrings("--include", argv[3]);
    try testing.expectEqualStrings("--no-buffer", argv[4]);
    try testing.expectEqualStrings("--url", argv[argv.len - 2]);
    try testing.expectEqualStrings("https://example.com", argv[argv.len - 1]);
}

test "buildArgv: insecure flag honored" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://example.com", .insecure = true };
    const argv = try http.buildArgv(a, req);

    var saw_insecure = false;
    for (argv) |arg| if (std.mem.eql(u8, arg, "--insecure")) {
        saw_insecure = true;
    };
    try testing.expect(saw_insecure);
}

test "buildArgv: insecure=false omits --insecure" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://example.com", .insecure = false };
    const argv = try http.buildArgv(a, req);

    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "--insecure"));
}

test "buildArgv: headers serialized as 'Name: Value'" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const headers = [_]http.HttpRequest.Header{
        .{ .name = "X-Test", .value = "abc" },
        .{ .name = "Content-Type", .value = "application/json" },
    };
    const req = http.HttpRequest{ .url = "https://x.test", .headers = &headers };
    const argv = try http.buildArgv(a, req);

    var saw_first = false;
    var saw_second = false;
    for (argv) |arg| {
        if (std.mem.eql(u8, arg, "X-Test: abc")) saw_first = true;
        if (std.mem.eql(u8, arg, "Content-Type: application/json")) saw_second = true;
    }
    try testing.expect(saw_first);
    try testing.expect(saw_second);
}

test "buildArgv: body included with --data-binary when non-empty" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{
        .url = "https://x.test",
        .method = "POST",
        .body = "{\"k\":\"v\"}",
    };
    const argv = try http.buildArgv(a, req);

    var saw_body_flag = false;
    var saw_body_value = false;
    for (argv) |arg| {
        if (std.mem.eql(u8, arg, "--data-binary")) saw_body_flag = true;
        if (std.mem.eql(u8, arg, "{\"k\":\"v\"}")) saw_body_value = true;
    }
    try testing.expect(saw_body_flag);
    try testing.expect(saw_body_value);
}

test "buildArgv: empty body string skipped" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://x.test", .body = "" };
    const argv = try http.buildArgv(a, req);

    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "--data-binary"));
}

test "buildArgv: follow_redirects=0 omits --location" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://x.test", .follow_redirects = 0 };
    const argv = try http.buildArgv(a, req);

    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "--location"));
}

test "buildArgv: follow_redirects>0 emits --location and --max-redirs" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://x.test", .follow_redirects = 5 };
    const argv = try http.buildArgv(a, req);

    var saw_location = false;
    var saw_max = false;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "--location")) saw_location = true;
        if (std.mem.eql(u8, arg, "--max-redirs") and i + 1 < argv.len) {
            try testing.expectEqualStrings("5", argv[i + 1]);
            saw_max = true;
        }
    }
    try testing.expect(saw_location);
    try testing.expect(saw_max);
}

test "writeJsonString: escapes quotes, backslashes, newlines" {
    var buf: [256]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try http.writeJsonString(&w, "hi\"\\\n");
    try testing.expectEqualStrings("\"hi\\\"\\\\\\n\"", buf[0..w.end]);
}

test "writeJsonString: empty string" {
    var buf: [16]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try http.writeJsonString(&w, "");
    try testing.expectEqualStrings("\"\"", buf[0..w.end]);
}

test "writeJsonString: control characters use \\u escape" {
    var buf: [64]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    const input = [_]u8{ 'a', 0x01, 'b', 0x1f, 'c' };
    try http.writeJsonString(&w, &input);
    try testing.expectEqualStrings("\"a\\u0001b\\u001fc\"", buf[0..w.end]);
}

test "writeJsonString: passes ASCII printable through" {
    var buf: [64]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try http.writeJsonString(&w, "hello world 123");
    try testing.expectEqualStrings("\"hello world 123\"", buf[0..w.end]);
}

test "writeHeadersJson: parses single response block" {
    var buf: [512]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    const block = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nX-Foo: bar\r\n";
    try http.writeHeadersJson(&w, block);
    try testing.expectEqualStrings(
        "[{\"name\":\"Content-Type\",\"value\":\"application/json\"},{\"name\":\"X-Foo\",\"value\":\"bar\"}]",
        buf[0..w.end],
    );
}

test "writeHeadersJson: empty block emits []" {
    var buf: [16]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try http.writeHeadersJson(&w, "");
    try testing.expectEqualStrings("[]", buf[0..w.end]);
}

test "writeHeadersJson: redirect chain takes the LAST HTTP block" {
    var buf: [512]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    const block =
        "HTTP/1.1 301 Moved\r\nLocation: /next\r\n\r\n" ++
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n";
    try http.writeHeadersJson(&w, block);
    try testing.expectEqualStrings(
        "[{\"name\":\"Content-Type\",\"value\":\"text/html\"}]",
        buf[0..w.end],
    );
}

test "findLastHeaderBoundary: returns index after \\r\\n\\r\\n" {
    const data = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nhello";
    const idx = http.findLastHeaderBoundary(data);
    try testing.expectEqualStrings("hello", data[idx..]);
}

test "findLastHeaderBoundary: skips redirect block" {
    const data =
        "HTTP/1.1 301 Moved\r\nLocation: /next\r\n\r\n" ++
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>body</html>";
    const idx = http.findLastHeaderBoundary(data);
    try testing.expectEqualStrings("<html>body</html>", data[idx..]);
}

test "formatError: produces well-formed JSON error" {
    var buf: [128]u8 = undefined;
    const out = http.formatError(&buf, "boom");
    try testing.expectEqualStrings("{\"error\":\"boom\"}", out);
}

test "formatTransportError: includes exit_code, timing_ms, escaped stderr" {
    var buf: [256]u8 = undefined;
    const out = http.formatTransportError(&buf, "curl failed", 7, "  some err\n", 1234);
    // stderr is trimmed of leading/trailing whitespace before being JSON-escaped
    try testing.expectEqualStrings(
        "{\"error\":\"curl failed\",\"exit_code\":7,\"timing_ms\":1234,\"stderr\":\"some err\"}",
        out,
    );
}
