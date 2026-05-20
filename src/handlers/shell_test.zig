// Olgun Özoktaş geliştirdi · API Lab
// Tests for `handlers/shell.zig` — capability-gate semantics. The
// happy-path subprocess invocation isn't unit-tested here (it would
// actually shell `open`, which is integration territory); we cover
// the URL-validator that every request runs through.

const std = @import("std");
const testing = std.testing;
const shell = @import("shell.zig");

test "isAllowedUrl: accepts https" {
    try testing.expect(shell.isAllowedUrl("https://example.com"));
    try testing.expect(shell.isAllowedUrl("https://api.github.com/users/olgunozoktas"));
}

test "isAllowedUrl: accepts http" {
    try testing.expect(shell.isAllowedUrl("http://127.0.0.1:8080"));
}

test "isAllowedUrl: rejects bare scheme with no host" {
    try testing.expect(!shell.isAllowedUrl("http://"));
    try testing.expect(!shell.isAllowedUrl("https://"));
}

test "isAllowedUrl: rejects file://" {
    // `open file:///etc/passwd` would happily render the file in the
    // user's default browser — refused since the JS caller is
    // untrusted as far as filesystem paths go.
    try testing.expect(!shell.isAllowedUrl("file:///etc/passwd"));
    try testing.expect(!shell.isAllowedUrl("file:///Users/me/secret.html"));
}

test "isAllowedUrl: rejects javascript / data / mailto / vscode" {
    try testing.expect(!shell.isAllowedUrl("javascript:alert(1)"));
    try testing.expect(!shell.isAllowedUrl("data:text/html,<script>alert(1)</script>"));
    try testing.expect(!shell.isAllowedUrl("mailto:user@example.com"));
    try testing.expect(!shell.isAllowedUrl("tel:+15551234567"));
    try testing.expect(!shell.isAllowedUrl("vscode://file/Users/me/code.ts"));
}

test "isAllowedUrl: rejects bare paths and empty input" {
    try testing.expect(!shell.isAllowedUrl(""));
    try testing.expect(!shell.isAllowedUrl("/Applications/Mail.app"));
    try testing.expect(!shell.isAllowedUrl("example.com"));
    try testing.expect(!shell.isAllowedUrl("//example.com"));
}

test "isAllowedUrl: rejects uppercase scheme (no normalization)" {
    // Case-sensitive on purpose: every real browser URL is lowercased
    // by the time it reaches the bridge. Uppercase is a red flag
    // worth refusing, not silently passing.
    try testing.expect(!shell.isAllowedUrl("HTTPS://example.com"));
    try testing.expect(!shell.isAllowedUrl("Http://example.com"));
}
