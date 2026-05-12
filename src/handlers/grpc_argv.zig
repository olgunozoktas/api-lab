// Olgun Özoktaş geliştirdi · API Lab
// Pure argv builder for grpcurl. Extracted from grpc.zig to keep that
// file under the 400-LOC cap (CLAUDE.md hard rule) before the gRPC
// reflection slice expands the handler surface.
//
// `buildArgv` depends only on its inputs and the allocator; no I/O.
// `tls` carries pre-written tmp-file paths produced by
// `grpc_tls.prepareTlsTmpfiles` (PEM-content fields require on-disk
// paths for grpcurl's `-cacert` / `-cert` / `-key` flags). Pass `.{}`
// when no TLS overrides are needed.

const std = @import("std");
const grpc_types = @import("grpc_types.zig");
const grpc_tls = @import("grpc_tls.zig");

pub const GrpcRequest = grpc_types.GrpcRequest;
pub const TlsPaths = grpc_tls.TlsPaths;

pub fn buildArgv(a: std.mem.Allocator, req: GrpcRequest, tls: TlsPaths) ![]const []const u8 {
    var argv: std.ArrayList([]const u8) = .empty;
    try argv.append(a, "grpcurl");
    try argv.append(a, "-format");
    try argv.append(a, "json");
    try argv.append(a, "-format-error");
    try argv.append(a, "-vv");
    if (req.plaintext) try argv.append(a, "-plaintext");
    if (tls.ca_cert_path.len > 0) {
        try argv.append(a, "-cacert");
        try argv.append(a, tls.ca_cert_path);
    }
    if (tls.client_cert_path.len > 0) {
        try argv.append(a, "-cert");
        try argv.append(a, tls.client_cert_path);
    }
    if (tls.client_key_path.len > 0) {
        try argv.append(a, "-key");
        try argv.append(a, tls.client_key_path);
    }
    if (req.server_name.len > 0) {
        try argv.append(a, "-servername");
        try argv.append(a, req.server_name);
    }
    if (req.authority.len > 0) {
        try argv.append(a, "-authority");
        try argv.append(a, req.authority);
    }
    try argv.append(a, "-max-time");
    try argv.append(a, try std.fmt.allocPrint(a, "{d}", .{@max(req.timeout_ms / 1000, 1)}));
    for (req.metadata) |m| {
        try argv.append(a, "-rpc-header");
        try argv.append(a, try std.fmt.allocPrint(a, "{s}: {s}", .{ m.name, m.value }));
    }
    if (!req.use_reflection) {
        for (req.import_paths) |p| {
            try argv.append(a, "-import-path");
            try argv.append(a, p);
        }
        for (req.proto_files) |p| {
            try argv.append(a, "-proto");
            try argv.append(a, p);
        }
    }
    try argv.append(a, "-d");
    try argv.append(a, if (req.message.len == 0) "{}" else req.message);
    try argv.append(a, req.target);
    try argv.append(a, req.full_method);
    return argv.items;
}
