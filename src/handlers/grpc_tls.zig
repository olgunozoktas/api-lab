// gRPC TLS helpers — tmpfile lifecycle for the cert PEMs that grpcurl
// needs as on-disk paths (`-cacert`, `-cert`, `-key`). Extracted from
// `grpc.zig` to keep that file under the 400-LOC cap (CLAUDE.md hard rule).
//
// Lifecycle: `prepareTlsTmpfiles` mkdir's a per-request directory under
// /tmp (random hex suffix) and writes each non-empty PEM to a file in
// it; `cleanupTlsTmpfiles` deleteTree's the dir on the way out. The
// caller defers cleanup so it fires on every exit — success, error,
// JSON-encode failure, or panic. Empty `tmpdir_path` is the sentinel
// for "no TLS files were written" and short-circuits cleanup.

const std = @import("std");

/// Filesystem paths for the PEM blobs that grpcurl needs as files.
/// `runRequest` populates this struct after writing the request's PEM
/// contents to a per-request tmp directory. `buildArgv` consumes it,
/// emitting `-cacert <path>` / `-cert <path>` / `-key <path>` only for
/// non-empty paths.
pub const TlsPaths = struct {
    ca_cert_path: []const u8 = "",
    client_cert_path: []const u8 = "",
    client_key_path: []const u8 = "",
};

/// Result of preparing the TLS tmp files. `tmpdir_path` is empty when
/// no PEM contents were provided (caller skips cleanup); otherwise it
/// names the per-request directory the caller must `cleanupTlsTmpfiles`
/// on exit.
pub const Prepared = struct {
    paths: TlsPaths = .{},
    tmpdir_path: []const u8 = "",
};

/// Write each non-empty PEM blob to a file in a fresh /tmp/api-lab-grpc-<hex>/
/// directory and return the resulting paths. Allocates path strings with
/// `a` — those live as long as the caller's arena. The directory itself
/// is created via the IO context's `Dir.cwd().createDirPath` (recursive,
/// idempotent on macOS); files are written via `Dir.writeFile`.
///
/// Returns `Prepared{}` (all empty) when none of the three PEM blobs is
/// set — short-circuits the disk hit entirely.
pub fn prepareTlsTmpfiles(
    a: std.mem.Allocator,
    io: std.Io,
    ca_cert: []const u8,
    client_cert: []const u8,
    client_key: []const u8,
) !Prepared {
    if (ca_cert.len == 0 and client_cert.len == 0 and client_key.len == 0) {
        return .{};
    }

    var rand_bytes: [4]u8 = undefined;
    std.crypto.random.bytes(&rand_bytes);
    const tmpdir_path = try std.fmt.allocPrint(
        a,
        "/tmp/api-lab-grpc-{x:0>2}{x:0>2}{x:0>2}{x:0>2}",
        .{ rand_bytes[0], rand_bytes[1], rand_bytes[2], rand_bytes[3] },
    );
    var cwd = std.Io.Dir.cwd();
    try cwd.createDirPath(io, tmpdir_path);

    var prep: Prepared = .{ .tmpdir_path = tmpdir_path };
    if (ca_cert.len > 0) {
        const p = try std.fmt.allocPrint(a, "{s}/ca.pem", .{tmpdir_path});
        try cwd.writeFile(io, .{ .sub_path = p, .data = ca_cert });
        prep.paths.ca_cert_path = p;
    }
    if (client_cert.len > 0) {
        const p = try std.fmt.allocPrint(a, "{s}/client.pem", .{tmpdir_path});
        try cwd.writeFile(io, .{ .sub_path = p, .data = client_cert });
        prep.paths.client_cert_path = p;
    }
    if (client_key.len > 0) {
        const p = try std.fmt.allocPrint(a, "{s}/client.key", .{tmpdir_path});
        try cwd.writeFile(io, .{ .sub_path = p, .data = client_key });
        prep.paths.client_key_path = p;
    }
    return prep;
}

/// Best-effort delete of the tmp dir created by `prepareTlsTmpfiles`.
/// Empty `tmpdir_path` is the no-op sentinel. Any deletion error is
/// swallowed — leaking a few KB in `/tmp` is preferable to crashing
/// the bridge call after grpcurl already returned.
pub fn cleanupTlsTmpfiles(io: std.Io, tmpdir_path: []const u8) void {
    if (tmpdir_path.len == 0) return;
    std.Io.Dir.cwd().deleteTree(io, tmpdir_path) catch {};
}

test {
    _ = @import("grpc_tls_test.zig");
}
