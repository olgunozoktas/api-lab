// Olgun Özoktaş geliştirdi · API Lab
// Tests for grpc_reflect_parsers.zig — pure helpers that turn
// `grpcurl list` and `grpcurl describe …` stdout into structured
// {service, methods}, {message, fields} shapes + JSON skeletons.

const std = @import("std");
const testing = std.testing;
const parsers = @import("grpc_reflect_parsers.zig");

// ---------------------------------------------------------------------------
// iterServices — `grpcurl <target> list` output
// ---------------------------------------------------------------------------

test "iterServices: yields each non-empty line as a service name" {
    const stdout =
        "helloworld.Greeter\n" ++
        "grpc.health.v1.Health\n" ++
        "chat.ChatService\n";

    var iter = parsers.iterServices(stdout);
    try testing.expectEqualStrings("helloworld.Greeter", iter.next().?);
    try testing.expectEqualStrings("grpc.health.v1.Health", iter.next().?);
    try testing.expectEqualStrings("chat.ChatService", iter.next().?);
    try testing.expect(iter.next() == null);
}

test "iterServices: filters out grpc.reflection.* (grpcurl-internal)" {
    const stdout =
        "helloworld.Greeter\n" ++
        "grpc.reflection.v1alpha.ServerReflection\n" ++
        "grpc.reflection.v1.ServerReflection\n" ++
        "chat.ChatService\n";

    var iter = parsers.iterServices(stdout);
    try testing.expectEqualStrings("helloworld.Greeter", iter.next().?);
    try testing.expectEqualStrings("chat.ChatService", iter.next().?);
    try testing.expect(iter.next() == null);
}

test "iterServices: skips blank + whitespace-only lines" {
    const stdout = "\n\n  \nhelloworld.Greeter\n\n   \t  \nchat.ChatService\n\n";
    var iter = parsers.iterServices(stdout);
    try testing.expectEqualStrings("helloworld.Greeter", iter.next().?);
    try testing.expectEqualStrings("chat.ChatService", iter.next().?);
    try testing.expect(iter.next() == null);
}

test "iterServices: empty input yields no services" {
    var iter = parsers.iterServices("");
    try testing.expect(iter.next() == null);
}

// ---------------------------------------------------------------------------
// parseServiceMethods — `grpcurl describe <service>` output
// ---------------------------------------------------------------------------

test "parseServiceMethods: simple service with two unary methods" {
    const stdout =
        "helloworld.Greeter is a service:\n" ++
        "service Greeter {\n" ++
        "  rpc SayHello ( .helloworld.HelloRequest ) returns ( .helloworld.HelloReply );\n" ++
        "  rpc Goodbye ( .helloworld.GoodbyeRequest ) returns ( .helloworld.GoodbyeReply );\n" ++
        "}\n";

    var buf: [16]parsers.ParsedMethod = undefined;
    const n = parsers.parseServiceMethods(stdout, &buf);
    try testing.expectEqual(@as(usize, 2), n);

    try testing.expectEqualStrings("SayHello", buf[0].name);
    try testing.expectEqualStrings(".helloworld.HelloRequest", buf[0].request_type);
    try testing.expectEqualStrings(".helloworld.HelloReply", buf[0].response_type);
    try testing.expect(!buf[0].client_stream);
    try testing.expect(!buf[0].server_stream);

    try testing.expectEqualStrings("Goodbye", buf[1].name);
}

test "parseServiceMethods: detects client+server streaming" {
    const stdout =
        "service ChatService {\n" ++
        "  rpc SendMessage ( stream .chat.Message ) returns ( stream .chat.Reply );\n" ++
        "  rpc Subscribe ( .chat.Sub ) returns ( stream .chat.Event );\n" ++
        "  rpc UploadFile ( stream .chat.Chunk ) returns ( .chat.Result );\n" ++
        "  rpc Login ( .chat.LoginReq ) returns ( .chat.LoginResp );\n" ++
        "}\n";

    var buf: [16]parsers.ParsedMethod = undefined;
    const n = parsers.parseServiceMethods(stdout, &buf);
    try testing.expectEqual(@as(usize, 4), n);

    try testing.expectEqualStrings("SendMessage", buf[0].name);
    try testing.expect(buf[0].client_stream);
    try testing.expect(buf[0].server_stream);

    try testing.expectEqualStrings("Subscribe", buf[1].name);
    try testing.expect(!buf[1].client_stream);
    try testing.expect(buf[1].server_stream);

    try testing.expectEqualStrings("UploadFile", buf[2].name);
    try testing.expect(buf[2].client_stream);
    try testing.expect(!buf[2].server_stream);

    try testing.expectEqualStrings("Login", buf[3].name);
    try testing.expect(!buf[3].client_stream);
    try testing.expect(!buf[3].server_stream);
}

test "parseServiceMethods: empty service returns zero methods" {
    const stdout =
        "service Empty {\n" ++
        "}\n";
    var buf: [4]parsers.ParsedMethod = undefined;
    const n = parsers.parseServiceMethods(stdout, &buf);
    try testing.expectEqual(@as(usize, 0), n);
}

test "parseServiceMethods: malformed rpc lines are skipped, not crashed" {
    const stdout =
        "service Broken {\n" ++
        "  rpc Garbage line without parens\n" ++
        "  rpc Good ( .ns.Req ) returns ( .ns.Resp );\n" ++
        "  rpc AlsoBroken ( missing-close\n" ++
        "}\n";
    var buf: [4]parsers.ParsedMethod = undefined;
    const n = parsers.parseServiceMethods(stdout, &buf);
    try testing.expectEqual(@as(usize, 1), n);
    try testing.expectEqualStrings("Good", buf[0].name);
}

test "parseServiceMethods: respects the buf cap" {
    const stdout =
        "service Big {\n" ++
        "  rpc M1 ( .ns.A ) returns ( .ns.B );\n" ++
        "  rpc M2 ( .ns.A ) returns ( .ns.B );\n" ++
        "  rpc M3 ( .ns.A ) returns ( .ns.B );\n" ++
        "}\n";
    var buf: [2]parsers.ParsedMethod = undefined;
    const n = parsers.parseServiceMethods(stdout, &buf);
    try testing.expectEqual(@as(usize, 2), n);
    try testing.expectEqualStrings("M1", buf[0].name);
    try testing.expectEqualStrings("M2", buf[1].name);
}

// ---------------------------------------------------------------------------
// parseMessageFields — `grpcurl describe <message>` output
// ---------------------------------------------------------------------------

test "parseMessageFields: scalar + optional + repeated + nested" {
    const stdout =
        ".helloworld.HelloRequest is a message:\n" ++
        "message HelloRequest {\n" ++
        "  string greeting = 1;\n" ++
        "  optional int32 reps = 2;\n" ++
        "  repeated string tags = 3;\n" ++
        "  .helloworld.User author = 4;\n" ++
        "}\n";

    var buf: [16]parsers.ParsedField = undefined;
    const n = parsers.parseMessageFields(stdout, &buf);
    try testing.expectEqual(@as(usize, 4), n);

    try testing.expectEqualStrings("greeting", buf[0].name);
    try testing.expectEqualStrings("string", buf[0].type_name);
    try testing.expect(!buf[0].repeated);
    try testing.expect(!buf[0].optional);

    try testing.expectEqualStrings("reps", buf[1].name);
    try testing.expectEqualStrings("int32", buf[1].type_name);
    try testing.expect(buf[1].optional);

    try testing.expectEqualStrings("tags", buf[2].name);
    try testing.expectEqualStrings("string", buf[2].type_name);
    try testing.expect(buf[2].repeated);

    try testing.expectEqualStrings("author", buf[3].name);
    try testing.expectEqualStrings(".helloworld.User", buf[3].type_name);
}

test "parseMessageFields: map<K, V> populates map_key + map_value" {
    const stdout =
        "message Counts {\n" ++
        "  map<string, int32> counts = 1;\n" ++
        "  map<int64, .ns.Item> items = 2;\n" ++
        "}\n";

    var buf: [4]parsers.ParsedField = undefined;
    const n = parsers.parseMessageFields(stdout, &buf);
    try testing.expectEqual(@as(usize, 2), n);

    try testing.expectEqualStrings("counts", buf[0].name);
    try testing.expectEqualStrings("string", buf[0].map_key);
    try testing.expectEqualStrings("int32", buf[0].map_value);

    try testing.expectEqualStrings("items", buf[1].name);
    try testing.expectEqualStrings("int64", buf[1].map_key);
    try testing.expectEqualStrings(".ns.Item", buf[1].map_value);
}

test "parseMessageFields: skips header + braces + comments + blanks" {
    const stdout =
        "// some comment\n" ++
        "\n" ++
        ".ns.M is a message:\n" ++
        "message M {\n" ++
        "  // an inline comment\n" ++
        "\n" ++
        "  string only_field = 1;\n" ++
        "}\n";

    var buf: [4]parsers.ParsedField = undefined;
    const n = parsers.parseMessageFields(stdout, &buf);
    try testing.expectEqual(@as(usize, 1), n);
    try testing.expectEqualStrings("only_field", buf[0].name);
}

test "parseMessageFields: empty message returns zero fields" {
    const stdout = "message Empty {\n}\n";
    var buf: [4]parsers.ParsedField = undefined;
    const n = parsers.parseMessageFields(stdout, &buf);
    try testing.expectEqual(@as(usize, 0), n);
}

// ---------------------------------------------------------------------------
// writeSkeleton — JSON skeleton from a list of fields
// ---------------------------------------------------------------------------

test "writeSkeleton: empty fields → {}" {
    var buf: [64]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try parsers.writeSkeleton(&w, &.{});
    try testing.expectEqualStrings("{}", buf[0..w.end]);
}

test "writeSkeleton: scalar defaults" {
    const fields = [_]parsers.ParsedField{
        .{ .name = "name", .type_name = "string" },
        .{ .name = "age", .type_name = "int32" },
        .{ .name = "active", .type_name = "bool" },
        .{ .name = "score", .type_name = "double" },
    };
    var buf: [256]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try parsers.writeSkeleton(&w, &fields);
    try testing.expectEqualStrings(
        "{\"name\":\"\",\"age\":0,\"active\":false,\"score\":0}",
        buf[0..w.end],
    );
}

test "writeSkeleton: repeated → [], map<…> → {}, nested → null" {
    const fields = [_]parsers.ParsedField{
        .{ .name = "tags", .type_name = "string", .repeated = true },
        .{ .name = "counts", .type_name = "map<string, int32>", .map_key = "string", .map_value = "int32" },
        .{ .name = "author", .type_name = ".ns.User" },
    };
    var buf: [256]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try parsers.writeSkeleton(&w, &fields);
    try testing.expectEqualStrings(
        "{\"tags\":[],\"counts\":{},\"author\":null}",
        buf[0..w.end],
    );
}

test "writeSkeleton: bytes → empty string" {
    const fields = [_]parsers.ParsedField{
        .{ .name = "payload", .type_name = "bytes" },
    };
    var buf: [64]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try parsers.writeSkeleton(&w, &fields);
    try testing.expectEqualStrings("{\"payload\":\"\"}", buf[0..w.end]);
}

test "writeSkeleton: every numeric proto type maps to 0" {
    const numerics = [_][]const u8{
        "int32",    "int64",    "uint32",  "uint64",
        "sint32",   "sint64",   "fixed32", "fixed64",
        "sfixed32", "sfixed64", "float",   "double",
    };
    for (numerics) |t| {
        var fbuf: [1]parsers.ParsedField = .{.{ .name = "n", .type_name = t }};
        var buf: [64]u8 = undefined;
        var w = std.Io.Writer.fixed(&buf);
        try parsers.writeSkeleton(&w, &fbuf);
        try testing.expectEqualStrings("{\"n\":0}", buf[0..w.end]);
    }
}
