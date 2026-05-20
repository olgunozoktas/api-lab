// Olgun Özoktaş geliştirdi · API Lab
// Unit tests for `handlers/mcp.zig`. Only `joinFrames` is pure and
// unit-testable; `runStdio` is subprocess orchestration (it spawns an
// MCP server, redirects stdio through temp files) and — like
// git_sync.zig's handlers — is exercised end-to-end against a real
// MCP server, not here. The frontend `lib/mcp.ts` carries and tests
// the JSON-RPC protocol logic.

const std = @import("std");
const testing = std.testing;
const mcp = @import("mcp.zig");

test "joinFrames: each frame lands on its own newline-terminated line" {
    const out = try mcp.joinFrames(testing.allocator, &.{ "{\"a\":1}", "{\"b\":2}" });
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("{\"a\":1}\n{\"b\":2}\n", out);
}

test "joinFrames: a single frame is still newline-terminated" {
    const out = try mcp.joinFrames(testing.allocator, &.{"{\"id\":1}"});
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("{\"id\":1}\n", out);
}

test "joinFrames: no frames yields an empty payload" {
    const out = try mcp.joinFrames(testing.allocator, &.{});
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("", out);
}

test "joinFrames: round-trips — splitting on newline recovers every frame" {
    const frames = [_][]const u8{ "frame-one", "frame-two", "frame-three" };
    const joined = try mcp.joinFrames(testing.allocator, &frames);
    defer testing.allocator.free(joined);

    var it = std.mem.splitScalar(u8, joined, '\n');
    var i: usize = 0;
    while (it.next()) |part| {
        if (part.len == 0) continue; // trailing newline produces a final empty
        try testing.expectEqualStrings(frames[i], part);
        i += 1;
    }
    try testing.expectEqual(frames.len, i);
}

// One integration test: a sleeper command that never exits on stdin
// EOF gets killed after its (tiny) deadline and the response carries
// the `timeout` error sentinel. This is the only runtime-spawning
// test in this file — the rest of runStdio's I/O surface is exercised
// end-to-end against a real MCP server, matching the git_sync.zig
// precedent.
test "runStdio: a hung server is killed after timeout_ms" {
    var env = std.process.Environ.Map.init(testing.allocator);
    defer env.deinit();
    var ctx = mcp.Context{ .gpa = testing.allocator, .io = testing.io, .env_map = &env };

    // `/bin/sleep 60` ignores its stdin entirely — exactly the
    // "hung server" shape (stdin EOF doesn't make it exit). With a
    // 300 ms deadline the watchdog should kill it well inside the
    // test's own timeout.
    const payload =
        \\{"command":"/bin/sleep","args":["60"],"frames":[],"timeout_ms":300}
    ;
    var out: [4096]u8 = undefined;
    const resp = try mcp.runStdio(&ctx, payload, &out);

    // Should land an error envelope with the `timeout` sentinel,
    // never an `exit_code` field. If the watchdog hadn't fired the
    // test would take the full 60 seconds of `sleep` — the test
    // runner's default timeout would surface that as a separate
    // failure, so we don't bother re-asserting wall-clock here.
    try testing.expect(std.mem.indexOf(u8, resp, "\"error\":\"timeout\"") != null);
    try testing.expect(std.mem.indexOf(u8, resp, "\"exit_code\"") == null);
}
