// Olgun Özoktaş geliştirdi · API Lab
// Tests for `handlers/grpc_tls.zig` — tmpfile lifecycle for gRPC TLS PEMs.
// Run with: `zig build test`. Hits real /tmp via std.testing.io; the
// happy paths assert files exist after prepare and are gone after cleanup.

const std = @import("std");
const testing = std.testing;
const grpc_tls = @import("grpc_tls.zig");
const grpc = @import("grpc.zig");

test "prepareTlsTmpfiles: empty inputs short-circuit (no dir, no paths)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const prep = try grpc_tls.prepareTlsTmpfiles(a, testing.io, "", "", "");
    try testing.expectEqualStrings("", prep.tmpdir_path);
    try testing.expectEqualStrings("", prep.paths.ca_cert_path);
    try testing.expectEqualStrings("", prep.paths.client_cert_path);
    try testing.expectEqualStrings("", prep.paths.client_key_path);
}

test "prepareTlsTmpfiles: ca_cert only writes ca.pem; cleanup removes the dir" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const ca_pem = "-----BEGIN CERTIFICATE-----\nFAKE-CA-FOR-TEST\n-----END CERTIFICATE-----\n";
    const prep = try grpc_tls.prepareTlsTmpfiles(a, testing.io, ca_pem, "", "");
    defer grpc_tls.cleanupTlsTmpfiles(testing.io, prep.tmpdir_path);

    try testing.expect(prep.tmpdir_path.len > 0);
    try testing.expect(std.mem.startsWith(u8, prep.tmpdir_path, "/tmp/api-lab-grpc-"));
    try testing.expect(prep.paths.ca_cert_path.len > 0);
    try testing.expectEqualStrings("", prep.paths.client_cert_path);
    try testing.expectEqualStrings("", prep.paths.client_key_path);

    // ca.pem exists with the expected content. `readFileAlloc` matches
    // how mcp.zig reads its stdout redirect — `Io.File.readAll` was
    // removed in Zig 0.16, so cwd-level helpers are the supported path.
    var cwd = std.Io.Dir.cwd();
    const got = try cwd.readFileAlloc(testing.io, prep.paths.ca_cert_path, a, .limited(256));
    try testing.expectEqualStrings(ca_pem, got);
}

test "prepareTlsTmpfiles: all three PEMs present writes ca.pem + client.pem + client.key" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const ca = "CA-PEM";
    const cert = "CLIENT-PEM";
    const key = "CLIENT-KEY";
    const prep = try grpc_tls.prepareTlsTmpfiles(a, testing.io, ca, cert, key);
    defer grpc_tls.cleanupTlsTmpfiles(testing.io, prep.tmpdir_path);

    try testing.expect(std.mem.endsWith(u8, prep.paths.ca_cert_path, "/ca.pem"));
    try testing.expect(std.mem.endsWith(u8, prep.paths.client_cert_path, "/client.pem"));
    try testing.expect(std.mem.endsWith(u8, prep.paths.client_key_path, "/client.key"));

    var cwd = std.Io.Dir.cwd();
    try cwd.access(testing.io, prep.paths.ca_cert_path, .{});
    try cwd.access(testing.io, prep.paths.client_cert_path, .{});
    try cwd.access(testing.io, prep.paths.client_key_path, .{});
}

test "cleanupTlsTmpfiles: removes the dir and all PEMs inside" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const prep = try grpc_tls.prepareTlsTmpfiles(a, testing.io, "CA", "CERT", "KEY");
    const dir = prep.tmpdir_path;
    grpc_tls.cleanupTlsTmpfiles(testing.io, dir);

    // The dir should now be gone — accessing it should fail.
    var cwd = std.Io.Dir.cwd();
    const result = cwd.access(testing.io, dir, .{});
    try testing.expectError(error.FileNotFound, result);
}

test "cleanupTlsTmpfiles: empty path is a safe no-op" {
    grpc_tls.cleanupTlsTmpfiles(testing.io, "");
    // No assertion needed — must not crash, must not error.
}

test "prepareTlsTmpfiles: tmpdir lands at 0o700 and each PEM at 0o600" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const prep = try grpc_tls.prepareTlsTmpfiles(a, testing.io, "CA", "CERT", "KEY");
    defer grpc_tls.cleanupTlsTmpfiles(testing.io, prep.tmpdir_path);

    var cwd = std.Io.Dir.cwd();
    const dir_stat = try cwd.statFile(testing.io, prep.tmpdir_path, .{});
    try testing.expectEqual(@as(std.posix.mode_t, 0o700), dir_stat.permissions.toMode() & 0o777);

    for ([_][]const u8{
        prep.paths.ca_cert_path,
        prep.paths.client_cert_path,
        prep.paths.client_key_path,
    }) |path| {
        const st = try cwd.statFile(testing.io, path, .{});
        try testing.expectEqual(@as(std.posix.mode_t, 0o600), st.permissions.toMode() & 0o777);
    }
}

test "prepareTlsTmpfiles: two consecutive calls produce different dirs (random suffix)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const p1 = try grpc_tls.prepareTlsTmpfiles(a, testing.io, "X", "", "");
    defer grpc_tls.cleanupTlsTmpfiles(testing.io, p1.tmpdir_path);
    const p2 = try grpc_tls.prepareTlsTmpfiles(a, testing.io, "X", "", "");
    defer grpc_tls.cleanupTlsTmpfiles(testing.io, p2.tmpdir_path);

    try testing.expect(!std.mem.eql(u8, p1.tmpdir_path, p2.tmpdir_path));
}

// ---------------------------------------------------------------------------
// buildArgv — TLS flags (cacert, client cert+key, servername, authority).
// Pure argv-shape tests; no I/O. Lives here (not grpc_test.zig) to keep
// that file under the 400-LOC cap.
// ---------------------------------------------------------------------------

test "buildArgv: empty TlsPaths emits no -cacert/-cert/-key flags" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{ .target = "x", .full_method = "p.S/M" };
    const argv = try grpc.buildArgv(a, req, .{});
    for (argv) |arg| {
        try testing.expect(!std.mem.eql(u8, arg, "-cacert"));
        try testing.expect(!std.mem.eql(u8, arg, "-cert"));
        try testing.expect(!std.mem.eql(u8, arg, "-key"));
    }
}

test "buildArgv: ca_cert_path emits -cacert <path>" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{ .target = "x", .full_method = "p.S/M" };
    const tls: grpc.TlsPaths = .{ .ca_cert_path = "/tmp/api-lab-grpc-deadbeef/ca.pem" };
    const argv = try grpc.buildArgv(a, req, tls);

    var saw = false;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-cacert") and i + 1 < argv.len and
            std.mem.eql(u8, argv[i + 1], "/tmp/api-lab-grpc-deadbeef/ca.pem"))
        {
            saw = true;
        }
    }
    try testing.expect(saw);
}

test "buildArgv: client_cert_path + client_key_path emit -cert and -key together" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{ .target = "x", .full_method = "p.S/M" };
    const tls: grpc.TlsPaths = .{
        .client_cert_path = "/tmp/x/client.pem",
        .client_key_path = "/tmp/x/client.key",
    };
    const argv = try grpc.buildArgv(a, req, tls);

    var saw_cert = false;
    var saw_key = false;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-cert") and i + 1 < argv.len and
            std.mem.eql(u8, argv[i + 1], "/tmp/x/client.pem")) saw_cert = true;
        if (std.mem.eql(u8, arg, "-key") and i + 1 < argv.len and
            std.mem.eql(u8, argv[i + 1], "/tmp/x/client.key")) saw_key = true;
    }
    try testing.expect(saw_cert);
    try testing.expect(saw_key);
}

test "buildArgv: server_name emits -servername <name>" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "x",
        .full_method = "p.S/M",
        .server_name = "api.internal.example.com",
    };
    const argv = try grpc.buildArgv(a, req, .{});

    var saw = false;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-servername") and i + 1 < argv.len and
            std.mem.eql(u8, argv[i + 1], "api.internal.example.com")) saw = true;
    }
    try testing.expect(saw);
}

test "buildArgv: authority emits -authority <override>" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{
        .target = "lb.example.com:443",
        .full_method = "p.S/M",
        .authority = "actual-backend.internal",
    };
    const argv = try grpc.buildArgv(a, req, .{});

    var saw = false;
    for (argv, 0..) |arg, i| {
        if (std.mem.eql(u8, arg, "-authority") and i + 1 < argv.len and
            std.mem.eql(u8, argv[i + 1], "actual-backend.internal")) saw = true;
    }
    try testing.expect(saw);
}

test "buildArgv: empty server_name and authority emit no flags" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    const req = grpc.GrpcRequest{ .target = "x", .full_method = "p.S/M" };
    const argv = try grpc.buildArgv(a, req, .{});
    for (argv) |arg| {
        try testing.expect(!std.mem.eql(u8, arg, "-servername"));
        try testing.expect(!std.mem.eql(u8, arg, "-authority"));
    }
}
