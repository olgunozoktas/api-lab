// Olgun Özoktaş geliştirdi · API Lab
//
// shell.zig — bridge handlers for opening URLs in the system default
// browser (`shell.open`) and staging short-lived files under the app's
// cache directory so `shell.open` can hand them to the browser
// (`shell.writeTempFile`). Together these power flows like the
// OpenAPI editor's "Export HTML" — generate the Redoc bundle, write
// it under `~/Library/Caches/API Lab/exports/<rand>/`, then ask the
// OS to open the `file://…` URL.
//
// Capability model:
//   - shell.open accepts http(s):// URLs unconditionally AND file://
//     URLs whose path is under the cache-exports root (and never
//     contains a `..` segment). Anything else — javascript:, raw
//     paths, mailto:, vscode://, paths outside the exports root —
//     gets `invalid_url_scheme`.
//   - shell.writeTempFile writes a single file under
//     `<HOME>/Library/Caches/API Lab/exports/<random>/<name>`. The
//     name MUST be a plain basename (no `/`, no `\`, no `..`); the
//     handler picks the random subdir. Content is capped at
//     `MAX_TEMP_FILE_BYTES`. Returns `{ok: true, path}`.

const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
    env_map: *std.process.Environ.Map,
};

// 8 MB ceiling on a single staged file. Big enough for a generous
// Redoc HTML bundle (which is the docs-export use case); small enough
// that a JS-side mistake can't fill the user's disk via a runaway
// loop.
const MAX_TEMP_FILE_BYTES: usize = 8 * 1024 * 1024;

pub fn handler(ctx: *Context) bridge.Handler {
    return .{
        .name = "shell.open",
        .context = ctx,
        .invoke_fn = invokeOpen,
    };
}

pub fn writeTempFileHandler(ctx: *Context) bridge.Handler {
    return .{
        .name = "shell.writeTempFile",
        .context = ctx,
        .invoke_fn = invokeWriteTempFile,
    };
}

pub const ShellOpenRequest = struct {
    url: []const u8,
};

pub const ShellWriteTempFileRequest = struct {
    name: []const u8,
    contents: []const u8,
};

fn invokeOpen(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runOpen(ctx, invocation.request.payload, output) catch |err| {
        return formatError(output, @errorName(err));
    };
}

fn invokeWriteTempFile(
    context: *anyopaque,
    invocation: bridge.Invocation,
    output: []u8,
) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runWriteTempFile(ctx, invocation.request.payload, output) catch |err| {
        return formatError(output, @errorName(err));
    };
}

/// Parse `{url}` from the bridge payload, validate the scheme, then
/// shell `open <url>`. On success returns `{ok: true}`; on rejection
/// returns `{error: "<reason>"}`. Never propagates `open`'s stderr —
/// it can leak system paths the JS caller has no business seeing.
fn runOpen(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(ShellOpenRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const url = parsed.value.url;
    const exports_root = cacheExportsRoot(ctx, a) catch null;
    if (!isAllowedUrl(url, exports_root)) return formatError(output, "invalid_url_scheme");

    const argv = [_][]const u8{ "open", url };
    const result = std.process.run(ctx.gpa, ctx.io, .{
        .argv = &argv,
        .stdout_limit = .limited(1024),
        .stderr_limit = .limited(1024),
    }) catch |err| {
        return formatError(output, @errorName(err));
    };
    defer ctx.gpa.free(result.stdout);
    defer ctx.gpa.free(result.stderr);

    if (result.term != .exited or result.term.exited != 0) {
        return formatError(output, "open_failed");
    }

    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"ok\":true}");
    return output[0..w.end];
}

/// Write `{name, contents}` to `<cache>/exports/<random>/<name>`.
/// Returns `{ok: true, path}` with the absolute path on success.
fn runWriteTempFile(ctx: *Context, payload: []const u8, output: []u8) ![]const u8 {
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = try std.json.parseFromSlice(ShellWriteTempFileRequest, a, payload, .{
        .ignore_unknown_fields = true,
    });
    const name = parsed.value.name;
    const contents = parsed.value.contents;

    if (!isSafeBasename(name)) return formatError(output, "invalid_name");
    if (contents.len > MAX_TEMP_FILE_BYTES) return formatError(output, "contents_too_large");

    const exports_root = cacheExportsRoot(ctx, a) catch {
        return formatError(output, "no_cache_root");
    };

    // Random subdirectory so concurrent exports don't collide AND a
    // stale stage left by a previous run doesn't get overwritten.
    // 64-bit random is overkill for collision avoidance but cheap.
    var prng = std.Random.DefaultPrng.init(std.crypto.random.int(u64));
    const subdir_name = try std.fmt.allocPrint(a, "{x:0>16}", .{prng.random().int(u64)});

    const subdir = try std.fs.path.join(a, &.{ exports_root, subdir_name });
    var cwd = std.Io.Dir.cwd();
    cwd.createDirPath(ctx.io, subdir) catch |err| {
        return formatError(output, @errorName(err));
    };

    const abs_path = try std.fs.path.join(a, &.{ subdir, name });
    cwd.writeFile(ctx.io, .{ .sub_path = abs_path, .data = contents }) catch |err| {
        return formatError(output, @errorName(err));
    };

    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"ok\":true,\"path\":");
    try writeJsonString(&w, abs_path);
    try w.writeAll("}");
    return output[0..w.end];
}

/// Resolve `<HOME>/Library/Caches/API Lab/exports` — the only
/// directory writeTempFile is allowed to write to. Returns
/// `error.NoHome` when `HOME` is unset (an unusual environment that
/// the handler would refuse anyway).
fn cacheExportsRoot(ctx: *Context, a: std.mem.Allocator) ![]const u8 {
    const home = ctx.env_map.get("HOME") orelse return error.NoHome;
    return std.fs.path.join(a, &.{ home, "Library", "Caches", "API Lab", "exports" });
}

/// True when `name` is a single path component safe to land inside a
/// directory the handler owns. Rejects empty, `/`, `\`, `..`, and any
/// embedded NUL. Doesn't enforce a length cap — the `MAX_TEMP_FILE_BYTES`
/// guard catches runaway payloads; long-but-real filenames like
/// `my-very-long-export-name.html` should land fine.
pub fn isSafeBasename(name: []const u8) bool {
    if (name.len == 0) return false;
    if (std.mem.eql(u8, name, "..")) return false;
    if (std.mem.eql(u8, name, ".")) return false;
    for (name) |c| {
        if (c == '/' or c == '\\' or c == 0) return false;
    }
    return true;
}

/// True when `url` is `http://…`, `https://…`, OR a `file://` URL
/// whose path is under `exports_root` and contains no `..` segments.
/// `exports_root` is null when the handler couldn't resolve the
/// cache root (no HOME) — in that case file:// URLs always reject.
pub fn isAllowedUrl(url: []const u8, exports_root: ?[]const u8) bool {
    if (std.mem.startsWith(u8, url, "https://")) return url.len > "https://".len;
    if (std.mem.startsWith(u8, url, "http://")) return url.len > "http://".len;
    if (std.mem.startsWith(u8, url, "file://")) {
        const root = exports_root orelse return false;
        const path = url["file://".len..];
        if (path.len == 0) return false;
        // No `..` segments — defense against any cleverness that
        // tries to walk out of the exports tree via the URL.
        if (std.mem.indexOf(u8, path, "/..") != null) return false;
        if (std.mem.indexOf(u8, path, "../") != null) return false;
        if (std.mem.eql(u8, path, "..")) return false;
        // Must sit under the canonical exports root.
        if (!std.mem.startsWith(u8, path, root)) return false;
        // The next character after the prefix must be '/' so
        // `<root>foo` doesn't slip through next to `<root>/foo`.
        if (path.len == root.len) return false;
        return path[root.len] == '/';
    }
    return false;
}

fn formatError(output: []u8, code: []const u8) ![]const u8 {
    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"error\":\"");
    try w.writeAll(code);
    try w.writeAll("\"}");
    return output[0..w.end];
}

// JSON-string encoder for a single path. Backslash + double-quote get
// escaped; everything else is passed through (paths under `~/Library`
// won't carry control chars in practice).
fn writeJsonString(w: *std.Io.Writer, s: []const u8) !void {
    try w.writeAll("\"");
    for (s) |c| {
        if (c == '"' or c == '\\') {
            try w.writeAll("\\");
            try w.writeByte(c);
        } else {
            try w.writeByte(c);
        }
    }
    try w.writeAll("\"");
}

test {
    _ = @import("shell_test.zig");
}
