// Pure parsers for `grpcurl <target> list` + `grpcurl describe …`
// stdout. State-machine line walks — no regex dependency.
//
// Design constraints:
//   * Pure: text in, structured out. No I/O, no allocation beyond what
//     callers explicitly pass.
//   * Defensive: malformed input never panics. Bad lines are skipped;
//     the resulting structures may be partial but well-formed.
//   * Stable: stays parseable across grpcurl versions where whitespace
//     varies but keywords are the same.

const std = @import("std");

/// One method extracted from `grpcurl describe <service>` stdout.
pub const ParsedMethod = struct {
    name: []const u8,
    request_type: []const u8,
    response_type: []const u8,
    client_stream: bool = false,
    server_stream: bool = false,
};

/// One field extracted from `grpcurl describe <message>` stdout.
pub const ParsedField = struct {
    name: []const u8,
    type_name: []const u8, // canonical proto type ("string", ".ns.X", "int32", "repeated string", etc.)
    repeated: bool = false,
    optional: bool = false,
    map_key: []const u8 = "", // populated when type_name starts with "map<"
    map_value: []const u8 = "",
};

/// Iterate service names from `grpcurl <target> list` stdout. Each
/// non-empty line is a fully-qualified service. The grpcurl-internal
/// reflection service is filtered (it's an implementation detail of
/// the protocol, never something the user wants to call).
pub const ServiceIter = struct {
    lines: std.mem.SplitIterator(u8, .scalar),

    pub fn next(self: *ServiceIter) ?[]const u8 {
        while (self.lines.next()) |raw| {
            const line = std.mem.trim(u8, raw, " \t\r");
            if (line.len == 0) continue;
            if (std.mem.startsWith(u8, line, "grpc.reflection.")) continue;
            if (line[0] == '#') continue; // grpcurl shouldn't emit but be tolerant
            return line;
        }
        return null;
    }
};

pub fn iterServices(stdout: []const u8) ServiceIter {
    return .{ .lines = std.mem.splitScalar(u8, stdout, '\n') };
}

/// Walk every `rpc <Name> ( [stream] <Req> ) returns ( [stream] <Resp> );`
/// line in stdout, collect ParsedMethod entries up to `out_buf.len`.
/// Returns the count actually filled. Slices reference the input buffer
/// — caller owns the stdout bytes for the lifetime of the result.
pub fn parseServiceMethods(stdout: []const u8, out_buf: []ParsedMethod) usize {
    var lines = std.mem.splitScalar(u8, stdout, '\n');
    var count: usize = 0;
    while (lines.next()) |raw| {
        if (count >= out_buf.len) break;
        const line = std.mem.trim(u8, raw, " \t\r");
        if (!std.mem.startsWith(u8, line, "rpc ")) continue;
        if (parseRpcLine(line)) |m| {
            out_buf[count] = m;
            count += 1;
        }
    }
    return count;
}

fn parseRpcLine(line: []const u8) ?ParsedMethod {
    // Shape: rpc Name ( [stream] type ) returns ( [stream] type );
    const after_rpc = line["rpc ".len..];
    const open_paren = std.mem.indexOfScalar(u8, after_rpc, '(') orelse return null;
    const name = std.mem.trim(u8, after_rpc[0..open_paren], " \t");
    if (name.len == 0) return null;

    const arg_start = open_paren + 1;
    const close_paren = std.mem.indexOfScalarPos(u8, after_rpc, arg_start, ')') orelse return null;
    const arg = std.mem.trim(u8, after_rpc[arg_start..close_paren], " \t");

    const after_args = after_rpc[close_paren + 1 ..];
    const returns_kw = "returns";
    const returns_idx = std.mem.indexOf(u8, after_args, returns_kw) orelse return null;
    const after_returns = after_args[returns_idx + returns_kw.len ..];
    const ret_open = std.mem.indexOfScalar(u8, after_returns, '(') orelse return null;
    const ret_close = std.mem.indexOfScalarPos(u8, after_returns, ret_open, ')') orelse return null;
    const ret = std.mem.trim(u8, after_returns[ret_open + 1 .. ret_close], " \t");

    const arg_parsed = stripStream(arg);
    const ret_parsed = stripStream(ret);

    return .{
        .name = name,
        .request_type = arg_parsed.type_name,
        .response_type = ret_parsed.type_name,
        .client_stream = arg_parsed.is_stream,
        .server_stream = ret_parsed.is_stream,
    };
}

const StreamSplit = struct { is_stream: bool, type_name: []const u8 };

fn stripStream(s: []const u8) StreamSplit {
    const trimmed = std.mem.trim(u8, s, " \t");
    if (std.mem.startsWith(u8, trimmed, "stream ")) {
        return .{ .is_stream = true, .type_name = std.mem.trim(u8, trimmed["stream ".len..], " \t") };
    }
    return .{ .is_stream = false, .type_name = trimmed };
}

/// Walk every field line from `grpcurl describe <message>` stdout.
/// Lines look like:
///   string greeting = 1;
///   optional int32 reps = 2;
///   repeated .ns.User contributors = 3;
///   map<string, int32> counts = 4;
/// Lines outside the message body (the `message X {` header, the
/// closing `}`, blank lines) are skipped.
pub fn parseMessageFields(stdout: []const u8, out_buf: []ParsedField) usize {
    var lines = std.mem.splitScalar(u8, stdout, '\n');
    var inside = false;
    var count: usize = 0;
    while (lines.next()) |raw| {
        if (count >= out_buf.len) break;
        const line = std.mem.trim(u8, raw, " \t\r");
        if (line.len == 0) continue;
        if (std.mem.startsWith(u8, line, "message ")) {
            inside = true;
            continue;
        }
        if (line[0] == '}') {
            inside = false;
            continue;
        }
        if (!inside) continue;
        if (line[0] == '/' or line[0] == '#') continue; // comments
        if (parseFieldLine(line)) |f| {
            out_buf[count] = f;
            count += 1;
        }
    }
    return count;
}

fn parseFieldLine(line: []const u8) ?ParsedField {
    // Strip trailing `;` and whatever follows.
    var trimmed = line;
    if (std.mem.indexOfScalar(u8, trimmed, ';')) |i| trimmed = trimmed[0..i];
    trimmed = std.mem.trim(u8, trimmed, " \t");
    if (trimmed.len == 0) return null;

    var rest = trimmed;
    var optional = false;
    var repeated = false;
    if (std.mem.startsWith(u8, rest, "optional ")) {
        optional = true;
        rest = std.mem.trim(u8, rest["optional ".len..], " \t");
    } else if (std.mem.startsWith(u8, rest, "repeated ")) {
        repeated = true;
        rest = std.mem.trim(u8, rest["repeated ".len..], " \t");
    }

    // map<K, V> name = N — keep the angle-bracket type intact.
    if (std.mem.startsWith(u8, rest, "map<")) {
        const close = std.mem.indexOfScalar(u8, rest, '>') orelse return null;
        const map_decl = rest[0 .. close + 1];
        const after_decl = std.mem.trim(u8, rest[close + 1 ..], " \t");
        const eq_idx = std.mem.indexOfScalar(u8, after_decl, '=') orelse after_decl.len;
        const name = std.mem.trim(u8, after_decl[0..eq_idx], " \t");
        if (name.len == 0) return null;
        const inner = std.mem.trim(u8, map_decl["map<".len..close], " \t");
        const comma = std.mem.indexOfScalar(u8, inner, ',') orelse return null;
        return .{
            .name = name,
            .type_name = map_decl,
            .repeated = false,
            .optional = false,
            .map_key = std.mem.trim(u8, inner[0..comma], " \t"),
            .map_value = std.mem.trim(u8, inner[comma + 1 ..], " \t"),
        };
    }

    // type name = N
    const space = std.mem.indexOfScalar(u8, rest, ' ') orelse return null;
    const type_name = std.mem.trim(u8, rest[0..space], " \t");
    const after_type = std.mem.trim(u8, rest[space + 1 ..], " \t");
    const eq_idx = std.mem.indexOfScalar(u8, after_type, '=') orelse after_type.len;
    const name = std.mem.trim(u8, after_type[0..eq_idx], " \t");
    if (name.len == 0 or type_name.len == 0) return null;
    return .{
        .name = name,
        .type_name = type_name,
        .repeated = repeated,
        .optional = optional,
    };
}

/// Generate a JSON skeleton from a list of message fields with
/// type-appropriate defaults. Output is written to `w`. Scalars get
/// concrete defaults; repeated → []; map → {}; nested message → null
/// (caller can recursively descend if it wants — v1 punts).
pub fn writeSkeleton(w: *std.Io.Writer, fields: []const ParsedField) !void {
    try w.writeAll("{");
    for (fields, 0..) |f, i| {
        if (i > 0) try w.writeAll(",");
        try w.writeAll("\"");
        try writeJsonEscaped(w, f.name);
        try w.writeAll("\":");
        if (f.repeated) {
            try w.writeAll("[]");
        } else if (std.mem.startsWith(u8, f.type_name, "map<")) {
            try w.writeAll("{}");
        } else {
            try writeScalarDefault(w, f.type_name);
        }
    }
    try w.writeAll("}");
}

fn writeScalarDefault(w: *std.Io.Writer, type_name: []const u8) !void {
    if (isStringLike(type_name)) {
        try w.writeAll("\"\"");
    } else if (isNumericLike(type_name)) {
        try w.writeAll("0");
    } else if (std.mem.eql(u8, type_name, "bool")) {
        try w.writeAll("false");
    } else {
        // Nested message, enum, or unknown — null is the safe punt.
        try w.writeAll("null");
    }
}

fn isStringLike(t: []const u8) bool {
    return std.mem.eql(u8, t, "string") or std.mem.eql(u8, t, "bytes");
}

fn isNumericLike(t: []const u8) bool {
    const numeric = [_][]const u8{
        "int32",    "int64",    "uint32",  "uint64",
        "sint32",   "sint64",   "fixed32", "fixed64",
        "sfixed32", "sfixed64", "float",   "double",
    };
    for (numeric) |n| if (std.mem.eql(u8, t, n)) return true;
    return false;
}

fn writeJsonEscaped(w: *std.Io.Writer, s: []const u8) !void {
    for (s) |c| {
        switch (c) {
            '"' => try w.writeAll("\\\""),
            '\\' => try w.writeAll("\\\\"),
            '\n' => try w.writeAll("\\n"),
            '\r' => try w.writeAll("\\r"),
            '\t' => try w.writeAll("\\t"),
            else => try w.writeByte(c),
        }
    }
}

test {
    _ = @import("grpc_reflect_parsers_test.zig");
}
