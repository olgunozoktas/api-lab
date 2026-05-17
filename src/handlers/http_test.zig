// Olgun Özoktaş geliştirdi · API Lab
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

test "findContentType: extracts value case-insensitively" {
    const block = "HTTP/1.1 200 OK\r\ncontent-type: image/png\r\nX-Foo: bar\r\n";
    try testing.expectEqualStrings("image/png", http.findContentType(block));
}

test "findContentType: absent returns empty" {
    try testing.expectEqualStrings("", http.findContentType("HTTP/1.1 200 OK\r\n"));
}

test "isBinaryBody: json content type stays on the text path" {
    try testing.expect(!http.isBinaryBody("application/json", "{}"));
}

test "isBinaryBody: png content type is binary" {
    try testing.expect(http.isBinaryBody("image/png", "ignored"));
}

test "isBinaryBody: svg stays on the text path" {
    try testing.expect(!http.isBinaryBody("image/svg+xml", "<svg/>"));
}

test "isBinaryBody: invalid utf-8 with unknown type is binary" {
    const bad = [_]u8{ 0xff, 0xfe, 0x00, 0x80 };
    try testing.expect(http.isBinaryBody("", &bad));
}

test "isBinaryBody: valid utf-8 with unknown type stays text" {
    try testing.expect(!http.isBinaryBody("application/x-custom", "hello world"));
}

test "writeBodyJson: text body ships verbatim, no flag" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var buf: [128]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try http.writeBodyJson(&w, arena.allocator(), "application/json", "{\"ok\":true}");
    try testing.expectEqualStrings(",\"body\":\"{\\\"ok\\\":true}\"", buf[0..w.end]);
}

test "writeBodyJson: binary body is base64-encoded with body_base64 flag" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var buf: [256]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    const body = [_]u8{ 0xff, 0xd8, 0xff, 0x00, 0x10 };
    try http.writeBodyJson(&w, arena.allocator(), "image/jpeg", &body);
    const out = buf[0..w.end];
    try testing.expect(std.mem.indexOf(u8, out, "\"body_base64\":true") != null);

    // Round-trip: the base64 between `"body":"` and `","body_base64"`
    // must decode back to the exact input bytes.
    const prefix = ",\"body\":\"";
    const start = std.mem.indexOf(u8, out, prefix).? + prefix.len;
    const end = std.mem.indexOf(u8, out, "\",\"body_base64\"").?;
    const b64 = out[start..end];
    const dec = std.base64.standard.Decoder;
    var decoded: [16]u8 = undefined;
    const n = try dec.calcSizeForSlice(b64);
    try dec.decode(decoded[0..n], b64);
    try testing.expectEqualSlices(u8, &body, decoded[0..n]);
}

test "writeBodyJson: oversize binary body reports body_too_large" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const big = try a.alloc(u8, 700 * 1024 + 1);
    @memset(big, 0xff);
    var buf: [128]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try http.writeBodyJson(&w, a, "application/octet-stream", big);
    try testing.expectEqualStrings(
        ",\"body\":\"\",\"body_base64\":false,\"body_too_large\":true",
        buf[0..w.end],
    );
}

fn argvHas(argv: []const []const u8, want: []const u8) bool {
    for (argv) |arg| if (std.mem.eql(u8, arg, want)) return true;
    return false;
}

test "buildArgv: binary_path emits --data-binary @path" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://x.test", .binary_path = "/tmp/photo.png" };
    const argv = try http.buildArgv(a, req);

    try testing.expect(argvHas(argv, "--data-binary"));
    try testing.expect(argvHas(argv, "@/tmp/photo.png"));
}

test "buildArgv: binary_path wins over a body string" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{
        .url = "https://x.test",
        .body = "ignored body",
        .binary_path = "/tmp/data.bin",
    };
    const argv = try http.buildArgv(a, req);

    try testing.expect(argvHas(argv, "@/tmp/data.bin"));
    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "ignored body"));
}

test "buildArgv: multipart text + file parts emit --form name=value / name=@path" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const parts = [_]http.HttpRequest.MultipartPart{
        .{ .name = "caption", .value = "hello", .is_file = false },
        .{ .name = "photo", .value = "/tmp/cat.jpg", .is_file = true },
    };
    const req = http.HttpRequest{ .url = "https://x.test", .method = "POST", .multipart = &parts };
    const argv = try http.buildArgv(a, req);

    try testing.expect(argvHas(argv, "--form"));
    try testing.expect(argvHas(argv, "caption=hello"));
    try testing.expect(argvHas(argv, "photo=@/tmp/cat.jpg"));
}

test "buildArgv: no multipart / binary_path keeps the plain body path" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://x.test", .method = "POST", .body = "{\"k\":1}" };
    const argv = try http.buildArgv(a, req);

    try testing.expect(argvHas(argv, "--data-binary"));
    try testing.expect(argvHas(argv, "{\"k\":1}"));
    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "--form"));
}

fn argvPairAfter(argv: []const []const u8, flag: []const u8) ?[]const u8 {
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, flag) and i + 1 < argv.len) return argv[i + 1];
    }
    return null;
}

test "buildArgv: proxy emits --proxy <url>" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{ .url = "https://x.test", .proxy = "socks5://127.0.0.1:1080" };
    const argv = try http.buildArgv(a, req);

    try testing.expectEqualStrings("socks5://127.0.0.1:1080", argvPairAfter(argv, "--proxy").?);
}

test "buildArgv: no proxy omits --proxy" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const argv = try http.buildArgv(a, .{ .url = "https://x.test" });
    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "--proxy"));
}

test "buildArgv: mTLS emits --cert / --key / --pass" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = http.HttpRequest{
        .url = "https://x.test",
        .client_cert = "/c/cert.pem",
        .client_key = "/c/key.pem",
        .client_key_pass = "s3cret",
    };
    const argv = try http.buildArgv(a, req);

    try testing.expectEqualStrings("/c/cert.pem", argvPairAfter(argv, "--cert").?);
    try testing.expectEqualStrings("/c/key.pem", argvPairAfter(argv, "--key").?);
    try testing.expectEqualStrings("s3cret", argvPairAfter(argv, "--pass").?);
}

test "buildArgv: no mTLS fields omit --cert / --key" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const argv = try http.buildArgv(a, .{ .url = "https://x.test" });
    for (argv) |arg| {
        try testing.expect(!std.mem.eql(u8, arg, "--cert"));
        try testing.expect(!std.mem.eql(u8, arg, "--key"));
    }
}
