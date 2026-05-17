// Olgun Özoktaş geliştirdi · API Lab
// git_sync.zig — optional git-based collection sync. Mirrors the
// frontend's collections + environments to a single JSON file in a
// local git clone, so a user can sync across machines through any git
// host with no vendor lock-in.
//
// Six bridge commands, all sharing one Context:
//   git.sync.status  ()                  → {configured}
//   git.sync.setup   ({url})             → {ok}            (git clone)
//   git.sync.pull    ()                  → {ok, conflict}
//   git.sync.read    ()                  → {ok, content}
//   git.sync.push    ({content,message}) → {ok, nothingToCommit}
//   git.sync.resolve ({side})            → {ok}            (ours|theirs)
//
// The clone lives at `<HOME>/.api-lab/git-sync` — the handler owns the
// path; the frontend only ever passes the repo URL + the JSON content.
// Every `git` invocation is wrapped in `env GIT_TERMINAL_PROMPT=0
// GIT_SSH_COMMAND='ssh -oBatchMode=yes -oConnectTimeout=10'` so a
// missing credential fails fast instead of hanging the bridge thread
// on an interactive prompt. v1 is SSH-only — an SSH remote uses the
// system agent, so no secret is ever stored by the app.

const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const http = @import("http.zig");

/// Filename of the single synced artifact inside the clone.
const SYNC_FILE = "api-lab-sync.json";

pub const Context = struct {
    gpa: std.mem.Allocator,
    io: std.Io,
    env_map: *std.process.Environ.Map,
};

pub fn statusHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "git.sync.status", .context = ctx, .invoke_fn = invokeStatus };
}
pub fn setupHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "git.sync.setup", .context = ctx, .invoke_fn = invokeSetup };
}
pub fn pullHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "git.sync.pull", .context = ctx, .invoke_fn = invokePull };
}
pub fn readHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "git.sync.read", .context = ctx, .invoke_fn = invokeRead };
}
pub fn pushHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "git.sync.push", .context = ctx, .invoke_fn = invokePush };
}
pub fn resolveHandler(ctx: *Context) bridge.Handler {
    return .{ .name = "git.sync.resolve", .context = ctx, .invoke_fn = invokeResolve };
}

// ── helpers ─────────────────────────────────────────────────────────

/// `<HOME>/.api-lab/git-sync` — the local clone directory.
fn cloneDir(ctx: *Context, a: std.mem.Allocator) ![]const u8 {
    const home = ctx.env_map.get("HOME") orelse return error.NoHome;
    return std.fmt.allocPrint(a, "{s}/.api-lab/git-sync", .{home});
}

const GitRun = struct { ok: bool, stdout: []const u8, stderr: []const u8 };

/// Run `git <args>` with credential prompts disabled. `a` should be an
/// arena — stdout/stderr are allocated from it and freed with it.
fn runGit(ctx: *Context, a: std.mem.Allocator, args: []const []const u8) !GitRun {
    var argv: std.ArrayList([]const u8) = .empty;
    try argv.append(a, "env");
    try argv.append(a, "GIT_TERMINAL_PROMPT=0");
    try argv.append(a, "GIT_SSH_COMMAND=ssh -oBatchMode=yes -oConnectTimeout=10");
    try argv.append(a, "git");
    for (args) |x| try argv.append(a, x);
    const r = try std.process.run(a, ctx.io, .{
        .argv = argv.items,
        .stdout_limit = .limited(4 * 1024 * 1024),
        .stderr_limit = .limited(64 * 1024),
        .environ_map = ctx.env_map,
    });
    return .{
        .ok = r.term == .exited and r.term.exited == 0,
        .stdout = r.stdout,
        .stderr = r.stderr,
    };
}

/// True when `dir` is inside a git work tree.
fn isRepo(ctx: *Context, a: std.mem.Allocator, dir: []const u8) bool {
    const r = runGit(ctx, a, &.{ "-C", dir, "rev-parse", "--is-inside-work-tree" }) catch return false;
    return r.ok;
}

/// `{"error":"...","stderr":"..."}` — a git failure with its stderr.
fn gitError(output: []u8, msg: []const u8, stderr: []const u8) []const u8 {
    var w = std.Io.Writer.fixed(output);
    w.writeAll("{\"error\":") catch return output[0..0];
    http.writeJsonString(&w, msg) catch return output[0..0];
    w.writeAll(",\"stderr\":") catch return output[0..0];
    http.writeJsonString(&w, std.mem.trim(u8, stderr, " \t\r\n")) catch return output[0..0];
    w.writeAll("}") catch return output[0..0];
    return output[0..w.end];
}

// ── git.sync.status ─────────────────────────────────────────────────

fn invokeStatus(context: *anyopaque, _: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();
    const dir = cloneDir(ctx, a) catch return http.formatError(output, "no HOME");
    const configured = isRepo(ctx, a, dir);
    var w = std.Io.Writer.fixed(output);
    try w.print("{{\"configured\":{}}}", .{configured});
    return output[0..w.end];
}

// ── git.sync.setup ──────────────────────────────────────────────────

const SetupRequest = struct { url: []const u8 };

fn invokeSetup(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = std.json.parseFromSlice(SetupRequest, a, invocation.request.payload, .{
        .ignore_unknown_fields = true,
    }) catch return http.formatError(output, "bad payload");
    const url = parsed.value.url;
    if (url.len == 0) return http.formatError(output, "repo URL is empty");

    const dir = cloneDir(ctx, a) catch return http.formatError(output, "no HOME");
    // Already a clone → idempotent success.
    if (isRepo(ctx, a, dir)) return constJson(output, "{\"ok\":true}");

    // Ensure the parent dir exists, then clone into `dir`.
    const home = ctx.env_map.get("HOME") orelse return http.formatError(output, "no HOME");
    const parent = std.fmt.allocPrint(a, "{s}/.api-lab", .{home}) catch
        return http.formatError(output, "oom");
    _ = std.Io.Dir.cwd().createDirPathStatus(ctx.io, parent, .fromMode(0o700)) catch {};

    const r = runGit(ctx, a, &.{ "clone", url, dir }) catch
        return http.formatError(output, "git clone failed to spawn");
    if (!r.ok) return gitError(output, "git clone failed", r.stderr);
    return constJson(output, "{\"ok\":true}");
}

// ── git.sync.pull ───────────────────────────────────────────────────

fn invokePull(context: *anyopaque, _: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const dir = cloneDir(ctx, a) catch return http.formatError(output, "no HOME");
    if (!isRepo(ctx, a, dir)) return http.formatError(output, "sync not configured");

    const r = runGit(ctx, a, &.{ "-C", dir, "pull", "--no-rebase" }) catch
        return http.formatError(output, "git pull failed to spawn");

    // Unmerged paths after the pull → a conflict needing resolution.
    const u = runGit(ctx, a, &.{ "-C", dir, "ls-files", "--unmerged" }) catch
        GitRun{ .ok = true, .stdout = "", .stderr = "" };
    const conflict = u.stdout.len > 0;

    if (!r.ok and !conflict) return gitError(output, "git pull failed", r.stderr);
    var w = std.Io.Writer.fixed(output);
    try w.print("{{\"ok\":{},\"conflict\":{}}}", .{ !conflict, conflict });
    return output[0..w.end];
}

// ── git.sync.read ───────────────────────────────────────────────────

fn invokeRead(context: *anyopaque, _: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const dir = cloneDir(ctx, a) catch return http.formatError(output, "no HOME");
    const path = std.fmt.allocPrint(a, "{s}/{s}", .{ dir, SYNC_FILE }) catch
        return http.formatError(output, "oom");

    // `cat` the file — a missing file (empty repo) is not an error,
    // it just means nothing has been synced yet.
    const r = std.process.run(a, ctx.io, .{
        .argv = &.{ "cat", path },
        .stdout_limit = .limited(4 * 1024 * 1024),
        .stderr_limit = .limited(8 * 1024),
        .environ_map = ctx.env_map,
    }) catch return http.formatError(output, "cat failed to spawn");
    const content = if (r.term == .exited and r.term.exited == 0) r.stdout else "";

    var w = std.Io.Writer.fixed(output);
    try w.writeAll("{\"ok\":true,\"content\":");
    try http.writeJsonString(&w, content);
    try w.writeAll("}");
    return output[0..w.end];
}

// ── git.sync.push ───────────────────────────────────────────────────

const PushRequest = struct {
    content: []const u8,
    message: []const u8 = "API Lab sync",
};

fn invokePush(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = std.json.parseFromSlice(PushRequest, a, invocation.request.payload, .{
        .ignore_unknown_fields = true,
    }) catch return http.formatError(output, "bad payload");

    const dir = cloneDir(ctx, a) catch return http.formatError(output, "no HOME");
    if (!isRepo(ctx, a, dir)) return http.formatError(output, "sync not configured");

    // Write the synced JSON into the working tree.
    const path = std.fmt.allocPrint(a, "{s}/{s}", .{ dir, SYNC_FILE }) catch
        return http.formatError(output, "oom");
    std.Io.Dir.cwd().writeFile(ctx.io, .{ .sub_path = path, .data = parsed.value.content }) catch
        return http.formatError(output, "could not write sync file");

    _ = runGit(ctx, a, &.{ "-C", dir, "add", SYNC_FILE }) catch
        return http.formatError(output, "git add failed");

    // Commit — identity pinned via -c so a fresh clone needs no config.
    const commit = runGit(ctx, a, &.{
        "-c",                 "user.name=API Lab", "-c",     "user.email=api-lab@localhost",
        "-C",                 dir,                 "commit", "-m",
        parsed.value.message,
    }) catch return http.formatError(output, "git commit failed to spawn");

    if (!commit.ok) {
        // "nothing to commit" is success — the working tree already
        // matches the last sync.
        const nothing = std.mem.indexOf(u8, commit.stdout, "nothing to commit") != null or
            std.mem.indexOf(u8, commit.stderr, "nothing to commit") != null;
        if (nothing) return constJson(output, "{\"ok\":true,\"nothingToCommit\":true}");
        return gitError(output, "git commit failed", commit.stderr);
    }

    const push = runGit(ctx, a, &.{ "-C", dir, "push", "-u", "origin", "HEAD" }) catch
        return http.formatError(output, "git push failed to spawn");
    if (!push.ok) return gitError(output, "git push failed", push.stderr);
    return constJson(output, "{\"ok\":true,\"nothingToCommit\":false}");
}

// ── git.sync.resolve ────────────────────────────────────────────────

const ResolveRequest = struct { side: []const u8 };

fn invokeResolve(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    const ctx: *Context = @ptrCast(@alignCast(context));
    var arena = std.heap.ArenaAllocator.init(ctx.gpa);
    defer arena.deinit();
    const a = arena.allocator();

    const parsed = std.json.parseFromSlice(ResolveRequest, a, invocation.request.payload, .{
        .ignore_unknown_fields = true,
    }) catch return http.formatError(output, "bad payload");
    // `local` keeps our version (--ours), `remote` takes theirs.
    const flag = if (std.mem.eql(u8, parsed.value.side, "remote")) "--theirs" else "--ours";

    const dir = cloneDir(ctx, a) catch return http.formatError(output, "no HOME");
    if (!isRepo(ctx, a, dir)) return http.formatError(output, "sync not configured");

    const co = runGit(ctx, a, &.{ "-C", dir, "checkout", flag, SYNC_FILE }) catch
        return http.formatError(output, "git checkout failed to spawn");
    if (!co.ok) return gitError(output, "conflict resolve failed", co.stderr);
    _ = runGit(ctx, a, &.{ "-C", dir, "add", SYNC_FILE }) catch {};
    _ = runGit(ctx, a, &.{
        "-c",                            "user.name=API Lab", "-c",     "user.email=api-lab@localhost",
        "-C",                            dir,                 "commit", "-m",
        "Resolve API Lab sync conflict",
    }) catch {};
    const push = runGit(ctx, a, &.{ "-C", dir, "push", "-u", "origin", "HEAD" }) catch
        return http.formatError(output, "git push failed to spawn");
    if (!push.ok) return gitError(output, "git push failed", push.stderr);
    return constJson(output, "{\"ok\":true}");
}

fn constJson(output: []u8, comptime body: []const u8) []const u8 {
    @memcpy(output[0..body.len], body);
    return output[0..body.len];
}

// No `test {}` block — git_sync.zig is pure subprocess orchestration
// with no unit-testable pure logic. It is exercised end-to-end against
// a scratch `git init --bare` repo (see the session doc). The pure
// sync-payload build/parse logic is unit-tested on the frontend side
// (frontend/src/lib/__tests__/gitSync.test.ts).
