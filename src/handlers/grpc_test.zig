// Unit tests for `handlers/grpc.zig` — Phase J.1.
//
// Run with: `zig build test`. Covers the pure helpers: argv construction,
// verbose-stderr parsing, status-code mapping, missing-binary error format.
// The full runRequest path is integration-only (requires grpcurl + a live
// gRPC server); not tested here.

const std = @import("std");
const testing = std.testing;
const grpc = @import("grpc.zig");

// ---------------------------------------------------------------------------
// buildArgv
// ---------------------------------------------------------------------------

test "buildArgv: minimal request includes core flags + target + method" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "grpcb.in:9001",
        .full_method = "hello.HelloService/SayHello",
    };
    const argv = try grpc.buildArgv(a, req);

    try testing.expectEqualStrings("grpcurl", argv[0]);
    try testing.expectEqualStrings("-format", argv[1]);
    try testing.expectEqualStrings("json", argv[2]);
    try testing.expectEqualStrings("-format-error", argv[3]);
    try testing.expectEqualStrings("-vv", argv[4]);
    // Last three: -d {} <target> <fullMethod>
    try testing.expectEqualStrings("hello.HelloService/SayHello", argv[argv.len - 1]);
    try testing.expectEqualStrings("grpcb.in:9001", argv[argv.len - 2]);
    try testing.expectEqualStrings("{}", argv[argv.len - 3]);
    try testing.expectEqualStrings("-d", argv[argv.len - 4]);
}

test "buildArgv: plaintext=true includes -plaintext" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "x:50051",
        .full_method = "p.S/M",
        .plaintext = true,
    };
    const argv = try grpc.buildArgv(a, req);

    var saw_plaintext = false;
    for (argv) |arg| if (std.mem.eql(u8, arg, "-plaintext")) {
        saw_plaintext = true;
    };
    try testing.expect(saw_plaintext);
}

test "buildArgv: plaintext=false omits -plaintext" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "x:50051",
        .full_method = "p.S/M",
        .plaintext = false,
    };
    const argv = try grpc.buildArgv(a, req);

    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "-plaintext"));
}

test "buildArgv: metadata serialized as -rpc-header 'Name: Value'" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const md = [_]grpc.GrpcMetadata{
        .{ .name = "authorization", .value = "Bearer abc" },
        .{ .name = "x-request-id", .value = "42" },
    };
    const req = grpc.GrpcRequest{
        .target = "x:50051",
        .full_method = "p.S/M",
        .metadata = &md,
    };
    const argv = try grpc.buildArgv(a, req);

    var auth_idx: ?usize = null;
    var rid_idx: ?usize = null;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "authorization: Bearer abc")) auth_idx = i;
        if (std.mem.eql(u8, arg, "x-request-id: 42")) rid_idx = i;
    }
    try testing.expect(auth_idx != null);
    try testing.expect(rid_idx != null);
    try testing.expectEqualStrings("-rpc-header", argv[auth_idx.? - 1]);
    try testing.expectEqualStrings("-rpc-header", argv[rid_idx.? - 1]);
}

test "buildArgv: empty metadata array emits no -rpc-header flags" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{ .target = "x", .full_method = "p.S/M" };
    const argv = try grpc.buildArgv(a, req);
    for (argv) |arg| try testing.expect(!std.mem.eql(u8, arg, "-rpc-header"));
}

test "buildArgv: useReflection=false adds -import-path + -proto for each entry" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const ips = [_][]const u8{ "/p1", "/p2" };
    const protos = [_][]const u8{ "x.proto", "y.proto" };
    const req = grpc.GrpcRequest{
        .target = "x",
        .full_method = "p.S/M",
        .use_reflection = false,
        .import_paths = &ips,
        .proto_files = &protos,
    };
    const argv = try grpc.buildArgv(a, req);

    var ip_count: usize = 0;
    var proto_count: usize = 0;
    for (argv) |arg| {
        if (std.mem.eql(u8, arg, "-import-path")) ip_count += 1;
        if (std.mem.eql(u8, arg, "-proto")) proto_count += 1;
    }
    try testing.expectEqual(@as(usize, 2), ip_count);
    try testing.expectEqual(@as(usize, 2), proto_count);
}

test "buildArgv: useReflection=true (default) omits -import-path and -proto even if arrays populated" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const ips = [_][]const u8{"/p1"};
    const req = grpc.GrpcRequest{
        .target = "x",
        .full_method = "p.S/M",
        .use_reflection = true,
        .import_paths = &ips,
    };
    const argv = try grpc.buildArgv(a, req);

    for (argv) |arg| {
        try testing.expect(!std.mem.eql(u8, arg, "-import-path"));
        try testing.expect(!std.mem.eql(u8, arg, "-proto"));
    }
}

test "buildArgv: empty message becomes -d {}" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{ .target = "x", .full_method = "p.S/M", .message = "" };
    const argv = try grpc.buildArgv(a, req);

    // -d must precede the empty-message sentinel "{}"
    var saw = false;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-d") and i + 1 < argv.len and std.mem.eql(u8, argv[i + 1], "{}")) {
            saw = true;
        }
    }
    try testing.expect(saw);
}

test "buildArgv: non-empty message passed verbatim after -d" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "x",
        .full_method = "p.S/M",
        .message = "{\"greeting\":\"world\"}",
    };
    const argv = try grpc.buildArgv(a, req);

    var saw = false;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-d") and i + 1 < argv.len and std.mem.eql(u8, argv[i + 1], "{\"greeting\":\"world\"}")) {
            saw = true;
        }
    }
    try testing.expect(saw);
}

test "buildArgv: timeout_ms=30000 yields -max-time 30" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "x",
        .full_method = "p.S/M",
        .timeout_ms = 30000,
    };
    const argv = try grpc.buildArgv(a, req);

    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-max-time") and i + 1 < argv.len) {
            try testing.expectEqualStrings("30", argv[i + 1]);
            return;
        }
    }
    try testing.expect(false); // -max-time not found
}

test "buildArgv: sub-second timeout still emits at least 1 second" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "x",
        .full_method = "p.S/M",
        .timeout_ms = 500,
    };
    const argv = try grpc.buildArgv(a, req);

    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-max-time") and i + 1 < argv.len) {
            try testing.expectEqualStrings("1", argv[i + 1]);
            return;
        }
    }
    try testing.expect(false);
}

// ---------------------------------------------------------------------------
// parseVerboseStderr
// ---------------------------------------------------------------------------

test "parseVerboseStderr: success case parses headers + trailers + status OK" {
    const stderr =
        "Resolved method descriptor:\n" ++
        "rpc SayHello ( .helloworld.HelloRequest ) returns ( .helloworld.HelloReply );\n" ++
        "\n" ++
        "Request metadata to send:\n" ++
        "(empty)\n" ++
        "\n" ++
        "Response headers received:\n" ++
        "content-type: application/grpc\n" ++
        "date: Mon, 01 Jan 2026 00:00:00 GMT\n" ++
        "\n" ++
        "Estimated response size: 14 bytes\n" ++
        "\n" ++
        "Response contents:\n" ++
        "{\n  \"message\": \"Hello world\"\n}\n" ++
        "\n" ++
        "Response trailers received:\n" ++
        "x-trace: abc123\n" ++
        "\n" ++
        "Sent 1 request and received 1 response\n";

    const parsed = grpc.parseVerboseStderr(stderr);
    try testing.expectEqualStrings("OK", parsed.status);
    try testing.expectEqual(@as(i32, 0), parsed.status_code_num);
    try testing.expectEqual(@as(usize, 2), parsed.headers.len);
    try testing.expectEqualStrings("content-type", parsed.headers[0].name);
    try testing.expectEqualStrings("application/grpc", parsed.headers[0].value);
    try testing.expectEqualStrings("date", parsed.headers[1].name);
    try testing.expectEqual(@as(usize, 1), parsed.trailers.len);
    try testing.expectEqualStrings("x-trace", parsed.trailers[0].name);
    try testing.expectEqualStrings("abc123", parsed.trailers[0].value);
}

test "parseVerboseStderr: ERROR block extracts code + message" {
    const stderr =
        "Response headers received:\n" ++
        "content-type: application/grpc\n" ++
        "\n" ++
        "ERROR:\n" ++
        "  Code: NotFound\n" ++
        "  Message: target service not registered\n";

    const parsed = grpc.parseVerboseStderr(stderr);
    try testing.expectEqualStrings("NotFound", parsed.status);
    try testing.expectEqual(@as(i32, 5), parsed.status_code_num);
    try testing.expectEqualStrings("target service not registered", parsed.status_message);
}

test "parseVerboseStderr: empty input returns OK + empty arrays (defensive)" {
    const parsed = grpc.parseVerboseStderr("");
    try testing.expectEqualStrings("OK", parsed.status);
    try testing.expectEqual(@as(i32, 0), parsed.status_code_num);
    try testing.expectEqual(@as(usize, 0), parsed.headers.len);
    try testing.expectEqual(@as(usize, 0), parsed.trailers.len);
}

test "parseVerboseStderr: missing trailers section returns empty trailers" {
    const stderr =
        "Response headers received:\n" ++
        "content-type: application/grpc\n";

    const parsed = grpc.parseVerboseStderr(stderr);
    try testing.expectEqual(@as(usize, 1), parsed.headers.len);
    try testing.expectEqual(@as(usize, 0), parsed.trailers.len);
}

test "parseVerboseStderr: malformed line without colon is skipped, not crashed" {
    const stderr =
        "Response headers received:\n" ++
        "garbage-no-colon-here\n" ++
        "x-real: value\n";

    const parsed = grpc.parseVerboseStderr(stderr);
    try testing.expectEqual(@as(usize, 1), parsed.headers.len);
    try testing.expectEqualStrings("x-real", parsed.headers[0].name);
}

test "parseVerboseStderr: ERROR block uses Status: alternate form" {
    const stderr =
        "ERROR:\n" ++
        "  Status: Unavailable\n" ++
        "  Message: connection refused\n";

    const parsed = grpc.parseVerboseStderr(stderr);
    try testing.expectEqualStrings("Unavailable", parsed.status);
    try testing.expectEqual(@as(i32, 14), parsed.status_code_num);
}

// ---------------------------------------------------------------------------
// grpcStatusToNumber
// ---------------------------------------------------------------------------

test "grpcStatusToNumber: canonical names map to RFC numbers" {
    try testing.expectEqual(@as(i32, 0), grpc.grpcStatusToNumber("OK"));
    try testing.expectEqual(@as(i32, 5), grpc.grpcStatusToNumber("NotFound"));
    try testing.expectEqual(@as(i32, 14), grpc.grpcStatusToNumber("Unavailable"));
    try testing.expectEqual(@as(i32, 16), grpc.grpcStatusToNumber("Unauthenticated"));
}

test "grpcStatusToNumber: case-insensitive" {
    try testing.expectEqual(@as(i32, 0), grpc.grpcStatusToNumber("ok"));
    try testing.expectEqual(@as(i32, 5), grpc.grpcStatusToNumber("notfound"));
    try testing.expectEqual(@as(i32, 14), grpc.grpcStatusToNumber("UNAVAILABLE"));
}

test "grpcStatusToNumber: Cancelled and CANCELLED both map to 1" {
    try testing.expectEqual(@as(i32, 1), grpc.grpcStatusToNumber("Canceled"));
    try testing.expectEqual(@as(i32, 1), grpc.grpcStatusToNumber("CANCELLED"));
}

test "grpcStatusToNumber: unknown code yields -1" {
    try testing.expectEqual(@as(i32, -1), grpc.grpcStatusToNumber("Bogus"));
    try testing.expectEqual(@as(i32, -1), grpc.grpcStatusToNumber(""));
}

// ---------------------------------------------------------------------------
// formatMissingBinaryError
// ---------------------------------------------------------------------------

test "formatMissingBinaryError: includes grpcurl_missing tag + install hint" {
    var buf: [256]u8 = undefined;
    const out = grpc.formatMissingBinaryError(&buf);
    try testing.expect(std.mem.indexOf(u8, out, "grpcurl_missing") != null);
    try testing.expect(std.mem.indexOf(u8, out, "brew install grpcurl") != null);
}

test "formatMissingBinaryError: well-formed JSON" {
    var buf: [256]u8 = undefined;
    const out = grpc.formatMissingBinaryError(&buf);
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const parsed = try std.json.parseFromSlice(struct {
        @"error": []const u8,
        install_hint: []const u8,
        docs: []const u8,
    }, arena.allocator(), out, .{ .ignore_unknown_fields = true });
    try testing.expectEqualStrings("grpcurl_missing", parsed.value.@"error");
    try testing.expectEqualStrings("brew install grpcurl", parsed.value.install_hint);
}
