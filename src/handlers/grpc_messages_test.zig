// Unit tests for `handlers/grpc_messages.zig` — the brace-balanced
// JSON splitter that breaks grpcurl stdout into individual messages.
// Pulled in via `grpc_messages.zig`'s `test {}` block at the bottom.

const std = @import("std");
const testing = std.testing;
const gm = @import("grpc_messages.zig");

test "parseMessages: empty input yields no messages" {
    var iter = gm.parseMessages("");
    try testing.expect(iter.next() == null);
}

test "parseMessages: whitespace-only input yields no messages" {
    var iter = gm.parseMessages("   \n\t\r\n  ");
    try testing.expect(iter.next() == null);
}

test "parseMessages: single unary message" {
    var iter = gm.parseMessages("{\"message\": \"hello\"}");
    const m = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings("{\"message\": \"hello\"}", m);
    try testing.expect(iter.next() == null);
}

test "parseMessages: pretty-printed unary message spans multiple lines" {
    const stdout =
        "{\n" ++
        "  \"message\": \"Hello world\",\n" ++
        "  \"id\": 42\n" ++
        "}\n";
    var iter = gm.parseMessages(stdout);
    const m = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expect(std.mem.startsWith(u8, m, "{"));
    try testing.expect(std.mem.endsWith(u8, m, "}"));
    try testing.expect(iter.next() == null);
}

test "parseMessages: server-streaming yields N messages" {
    const stdout =
        "{\"event\": 1}\n" ++
        "{\"event\": 2}\n" ++
        "{\"event\": 3}\n";
    var iter = gm.parseMessages(stdout);
    const m1 = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings("{\"event\": 1}", m1);
    const m2 = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings("{\"event\": 2}", m2);
    const m3 = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings("{\"event\": 3}", m3);
    try testing.expect(iter.next() == null);
}

test "parseMessages: brace inside string doesn't terminate object" {
    const stdout = "{\"text\": \"this { is } not a brace\"}";
    var iter = gm.parseMessages(stdout);
    const m = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings(stdout, m);
    try testing.expect(iter.next() == null);
}

test "parseMessages: escaped quote inside string" {
    const stdout = "{\"text\": \"she said \\\"hi\\\"\"}";
    var iter = gm.parseMessages(stdout);
    const m = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings(stdout, m);
    try testing.expect(iter.next() == null);
}

test "parseMessages: nested objects keep their depth" {
    const stdout = "{\"outer\": {\"inner\": {\"deep\": 1}}}";
    var iter = gm.parseMessages(stdout);
    const m = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings(stdout, m);
    try testing.expect(iter.next() == null);
}

test "parseMessages: top-level array is one message too" {
    const stdout = "[1,2,3]";
    var iter = gm.parseMessages(stdout);
    const m = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings("[1,2,3]", m);
    try testing.expect(iter.next() == null);
}

test "parseMessages: ignores leading garbage when not JSON-shaped" {
    var iter = gm.parseMessages("garbage");
    try testing.expect(iter.next() == null);
}

test "parseMessages: pretty-printed server-stream (4 multi-line messages)" {
    const stdout =
        "{\n  \"event\": \"a\"\n}\n" ++
        "{\n  \"event\": \"b\"\n}\n" ++
        "{\n  \"event\": \"c\"\n}\n" ++
        "{\n  \"event\": \"d\"\n}\n";
    var iter = gm.parseMessages(stdout);
    var count: usize = 0;
    while (iter.next()) |_| : (count += 1) {}
    try testing.expectEqual(@as(usize, 4), count);
}

test "parseMessages: unterminated tail emitted as partial (defensive)" {
    var iter = gm.parseMessages("{\"a\": 1, \"b\":");
    const m = iter.next() orelse return error.TestUnexpectedNull;
    try testing.expectEqualStrings("{\"a\": 1, \"b\":", m);
    try testing.expect(iter.next() == null);
}
