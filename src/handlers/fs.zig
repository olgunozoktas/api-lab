// Olgun Özoktaş geliştirdi · API Lab
//
// fs.zig — local-filesystem stat bridge. The first command is
// `fs.stat`: given an absolute path, return `{exists, size}` so the
// frontend can show a picked file's size next to its name and
// content-type without slurping the file into memory.
//
// Read-only by design — no read/write/delete commands here. The
// existing dialog flow already validated the path (the user picked
// it via the native file picker); we just look up the size.
//
// On unsupported scenarios (path not absolute, parse failure) we
// return `{error}` rather than throwing — same error-envelope shape
// `http.zig` uses so the bridge dispatcher serialises consistently.

const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
};

pub fn statHandler(ctx: *Context) bridge.Handler {
    return .{
        .name = "fs.stat",
        .context = ctx,
        .invoke_fn = invokeStat,
    };
}

pub const FsStatRequest = struct {
    path: []const u8,
};

fn invokeStat(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runStat(ctx, invocation.request.payload, output) catch |err| {
        return formatError(output, @errorName(err));
    };
}

fn runStat(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(FsStatRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const path = parsed.value.path;

    // Refuse relative paths — the bridge caller has no concept of a
    // working directory, so a relative path would resolve against
    // whatever the Zig process's cwd happens to be (assets root in
    // dev, the .app bundle dir in production). Cleaner to reject up
    // front than to silently lie about whether a "./foo" file exists.
    if (path.len == 0 or path[0] != '/') return formatError(output, "path_not_absolute");

    var cwd = std.Io.Dir.cwd();
    const stat = cwd.statFile(ctx.io, path, .{}) catch |err| switch (err) {
        // FileNotFound + IsDir are both expected outcomes the frontend
        // wants to render rather than treat as bridge errors. Map them
        // to `{exists: false}` (size is 0 — caller shouldn't read it).
        error.FileNotFound, error.NotDir, error.IsDir => return writeNotFound(output),
        else => return formatError(output, @errorName(err)),
    };

    return writeOk(output, stat.size);
}

fn writeOk(output: []u8, size: u64) ![]const u8 {
    var w = std.Io.Writer.fixed(output);
    try w.print("{{\"exists\":true,\"size\":{d}}}", .{size});
    return output[0..w.end];
}

fn writeNotFound(output: []u8) ![]const u8 {
    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"exists\":false,\"size\":0}");
    return output[0..w.end];
}

fn formatError(output: []u8, code: []const u8) ![]const u8 {
    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"error\":\"");
    try w.writeAll(code);
    try w.writeAll("\"}");
    return output[0..w.end];
}

test {
    _ = @import("fs_test.zig");
}
