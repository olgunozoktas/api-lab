// Olgun Özoktaş geliştirdi · API Lab
//
// shell.zig — the `shell.open` bridge handler. Shells out to macOS
// `open(1)` so the JS layer can ask the OS to open a URL in the
// user's default browser (the WKWebView host itself doesn't honor
// `<a target="_blank">`, so without this bridge external links in
// API Lab silently no-op).
//
// Capability gate: the input MUST be `http://` or `https://`. We
// refuse `file://`, `javascript:`, raw paths, and every other
// scheme — handing arbitrary paths to `open` is a code-execution
// surface (e.g. `open /Applications/Mail.app/Contents/MacOS/Mail`),
// so the handler stays narrowly scoped to web URLs. A future slice
// can broaden this with an allowlist for files under
// `~/Library/Caches/API Lab/` if the docs-export path needs it.

const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
    env_map: *std.process.Environ.Map,
};

pub fn handler(ctx: *Context) bridge.Handler {
    return .{
        .name = "shell.open",
        .context = ctx,
        .invoke_fn = invoke,
    };
}

pub const ShellOpenRequest = struct {
    url: []const u8,
};

fn invoke(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    return runOpen(ctx, invocation.request.payload, output) catch |err| {
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
    if (!isAllowedUrl(url)) return formatError(output, "invalid_url_scheme");

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

/// True when `url` is `http://…` or `https://…` (case-sensitive — every
/// real browser URL ships these in lowercase, and uppercase variants
/// are common in phishing-template tricks where the scheme is normalized
/// at parse time but eyed differently by code that grepped the raw
/// string). Anything else — `file://`, `javascript:`, bare paths,
/// `mailto:`, `tel:`, `vscode://` — returns false. Kept pub so the unit
/// test exercises the same code the handler runs.
pub fn isAllowedUrl(url: []const u8) bool {
    if (std.mem.startsWith(u8, url, "https://")) return url.len > "https://".len;
    if (std.mem.startsWith(u8, url, "http://")) return url.len > "http://".len;
    return false;
}

fn formatError(output: []u8, code: []const u8) ![]const u8 {
    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"error\":\"");
    try w.writeAll(code);
    try w.writeAll("\"}");
    return output[0..w.end];
}

test {
    _ = @import("shell_test.zig");
}
