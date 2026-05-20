// Olgun Özoktaş geliştirdi · API Lab
// Tests for `handlers/shell.zig` — capability-gate semantics. The
// happy-path subprocess invocation isn't unit-tested here (it would
// actually shell `open`, which is integration territory); we cover
// the URL validator + the safe-basename gate + the write-temp-file
// surface end-to-end through std.Io.Dir.

const std = @import("std");
const testing = std.testing;
const shell = @import("shell.zig");

// Stable exports-root used across the file:// tests below — matches
// the shape `cacheExportsRoot` builds at runtime but pinned here so
// the tests don't depend on $HOME.
const TEST_EXPORTS_ROOT: []const u8 = "/Users/test/Library/Caches/API Lab/exports";

test "isAllowedUrl: accepts https" {
    try testing.expect(shell.isAllowedUrl("https://example.com", null));
    try testing.expect(shell.isAllowedUrl("https://api.github.com/users/olgunozoktas", null));
}

test "isAllowedUrl: accepts http" {
    try testing.expect(shell.isAllowedUrl("http://127.0.0.1:8080", null));
}

test "isAllowedUrl: rejects bare scheme with no host" {
    try testing.expect(!shell.isAllowedUrl("http://", null));
    try testing.expect(!shell.isAllowedUrl("https://", null));
}

test "isAllowedUrl: rejects file:// outside the exports root" {
    // `open file:///etc/passwd` would happily render the file in the
    // user's default browser — refused since the JS caller is
    // untrusted as far as arbitrary filesystem paths go.
    try testing.expect(!shell.isAllowedUrl("file:///etc/passwd", TEST_EXPORTS_ROOT));
    try testing.expect(!shell.isAllowedUrl("file:///Users/me/secret.html", TEST_EXPORTS_ROOT));
}

test "isAllowedUrl: accepts file:// under the exports root" {
    const url = "file://" ++ TEST_EXPORTS_ROOT ++ "/deadbeef/docs.html";
    try testing.expect(shell.isAllowedUrl(url, TEST_EXPORTS_ROOT));
}

test "isAllowedUrl: rejects file:// when exports_root is null" {
    // No HOME (rare environment) → file:// blanket-refuses even for
    // shapes that would have passed with a valid root.
    const url = "file://" ++ TEST_EXPORTS_ROOT ++ "/deadbeef/docs.html";
    try testing.expect(!shell.isAllowedUrl(url, null));
}

test "isAllowedUrl: rejects file:// path-traversal attempts" {
    // Any `..` segment kicks the URL out, even if the prefix looks
    // legitimate. Defense in depth against a malicious payload
    // trying to walk out of the exports tree.
    const traversal_a = "file://" ++ TEST_EXPORTS_ROOT ++ "/deadbeef/../../../etc/passwd";
    const traversal_b = "file://" ++ TEST_EXPORTS_ROOT ++ "/../escape";
    try testing.expect(!shell.isAllowedUrl(traversal_a, TEST_EXPORTS_ROOT));
    try testing.expect(!shell.isAllowedUrl(traversal_b, TEST_EXPORTS_ROOT));
}

test "isAllowedUrl: rejects file:// at the exports root with no trailing slash" {
    // `<root>foo` must not slip through — the next char after the
    // prefix has to be a `/` boundary, same logic as the cookie path
    // match. Catches `<root>../sibling-dir` patterns.
    const sneaky = "file://" ++ TEST_EXPORTS_ROOT ++ "-sneaky/escape.html";
    try testing.expect(!shell.isAllowedUrl(sneaky, TEST_EXPORTS_ROOT));
}

test "isAllowedUrl: rejects javascript / data / mailto / vscode" {
    try testing.expect(!shell.isAllowedUrl("javascript:alert(1)", null));
    try testing.expect(!shell.isAllowedUrl("data:text/html,<script>alert(1)</script>", null));
    try testing.expect(!shell.isAllowedUrl("mailto:user@example.com", null));
    try testing.expect(!shell.isAllowedUrl("tel:+15551234567", null));
    try testing.expect(!shell.isAllowedUrl("vscode://file/Users/me/code.ts", null));
}

test "isAllowedUrl: rejects bare paths and empty input" {
    try testing.expect(!shell.isAllowedUrl("", null));
    try testing.expect(!shell.isAllowedUrl("/Applications/Mail.app", null));
    try testing.expect(!shell.isAllowedUrl("example.com", null));
    try testing.expect(!shell.isAllowedUrl("//example.com", null));
}

test "isAllowedUrl: rejects uppercase scheme (no normalization)" {
    // Case-sensitive on purpose: every real browser URL is lowercased
    // by the time it reaches the bridge. Uppercase is a red flag
    // worth refusing, not silently passing.
    try testing.expect(!shell.isAllowedUrl("HTTPS://example.com", null));
    try testing.expect(!shell.isAllowedUrl("Http://example.com", null));
}

test "isSafeBasename: accepts plain names" {
    try testing.expect(shell.isSafeBasename("docs.html"));
    try testing.expect(shell.isSafeBasename("my-very-long-export-name.html"));
    try testing.expect(shell.isSafeBasename("a.b.c"));
}

test "isSafeBasename: rejects empty + dot variants" {
    try testing.expect(!shell.isSafeBasename(""));
    try testing.expect(!shell.isSafeBasename("."));
    try testing.expect(!shell.isSafeBasename(".."));
}

test "isSafeBasename: rejects path separators" {
    // The handler picks the random subdir; the user only supplies
    // the leaf name. Any path separator is a sign the caller is
    // trying to escape the directory and gets rejected.
    try testing.expect(!shell.isSafeBasename("subdir/file.html"));
    try testing.expect(!shell.isSafeBasename("/abs/path"));
    try testing.expect(!shell.isSafeBasename("..\\windows"));
    try testing.expect(!shell.isSafeBasename("../parent"));
    try testing.expect(!shell.isSafeBasename("with\u{0000}nul"));
}
