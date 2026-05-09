// MessageIter — brace-balanced JSON splitter used by grpc.zig to break
// grpcurl's stdout into individual top-level messages. Extracted into
// its own file to keep grpc.zig under the 400-LOC project cap
// (CLAUDE.md hard rule). Pure / I/O-free / unit-testable.
//
// grpcurl pretty-prints each message across multiple lines AND for
// server-streaming methods can emit N messages. A naive newline-split
// would break multi-line objects, so the iterator is character-driven:
// track JSON nesting depth and emit a slice every time depth returns
// to zero on a closing brace/bracket. String-aware (`{` inside a JSON
// string doesn't open a new level).

const std = @import("std");

pub const MessageIter = struct {
    src: []const u8,
    pos: usize = 0,

    pub fn next(self: *MessageIter) ?[]const u8 {
        // Skip whitespace + stray separators between top-level objects.
        while (self.pos < self.src.len) : (self.pos += 1) {
            const c = self.src[self.pos];
            if (c == ' ' or c == '\t' or c == '\r' or c == '\n' or c == ',') continue;
            break;
        }
        if (self.pos >= self.src.len) return null;
        if (self.src[self.pos] != '{' and self.src[self.pos] != '[') return null;

        const start = self.pos;
        var depth: i32 = 0;
        var in_string: bool = false;
        var escape: bool = false;
        while (self.pos < self.src.len) : (self.pos += 1) {
            const c = self.src[self.pos];
            if (in_string) {
                if (escape) {
                    escape = false;
                } else if (c == '\\') {
                    escape = true;
                } else if (c == '"') {
                    in_string = false;
                }
                continue;
            }
            switch (c) {
                '"' => in_string = true,
                '{', '[' => depth += 1,
                '}', ']' => {
                    depth -= 1;
                    if (depth == 0) {
                        const end = self.pos + 1;
                        self.pos = end;
                        return self.src[start..end];
                    }
                },
                else => {},
            }
        }
        // Unterminated object — grpcurl truncated mid-message. Emit
        // what we have so the user at least sees the partial.
        const tail = self.src[start..self.pos];
        return if (tail.len > 0) tail else null;
    }
};

pub fn parseMessages(stdout: []const u8) MessageIter {
    return .{ .src = stdout };
}

// Tests live in `grpc_messages_test.zig`; surfaced to the test runner
// via this import-graph reference (same pattern as http.zig + grpc.zig).
test {
    _ = @import("grpc_messages_test.zig");
}
