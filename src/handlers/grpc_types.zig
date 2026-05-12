// Olgun Özoktaş geliştirdi · API Lab
// Shared types for the gRPC bridge. Extracted so `grpc.zig` and the
// argv builder (`grpc_argv.zig`) can both reference them without
// circular import — the unidirectional shape is
// `grpc_types ← grpc_argv ← grpc`. Re-exported from `grpc.zig` for
// backwards compat with existing call sites and tests.

pub const GrpcMetadata = struct {
    name: []const u8,
    value: []const u8,
};

pub const GrpcRequest = struct {
    target: []const u8,
    full_method: []const u8,
    message: []const u8 = "{}",
    metadata: []const GrpcMetadata = &.{},
    plaintext: bool = false,
    use_reflection: bool = true,
    import_paths: []const []const u8 = &.{},
    proto_files: []const []const u8 = &.{},
    timeout_ms: u32 = 60000,
    // TLS overrides — see grpc_tls.zig for the lifecycle of the
    // pasted-PEM blobs that grpcurl needs as on-disk paths.
    ca_cert: []const u8 = "",
    client_cert: []const u8 = "",
    client_key: []const u8 = "",
    server_name: []const u8 = "",
    authority: []const u8 = "",
};
