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
