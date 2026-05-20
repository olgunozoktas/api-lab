// API Lab — native macOS Postman-style API tester.
//
// Author:  Olgun Özoktaş <https://github.com/olgunozoktas>
// Repo:    https://github.com/olgunozoktas/api-lab
// License: PolyForm Noncommercial 1.0.0 + attribution addendum (see LICENSE)
//
// main.zig — Zig entry point. Wires the zero-native runner with the
// `http.request` / `grpc.*` bridge handlers, then yields the WebView
// host. The `app.zon` manifest in this directory carries the runtime
// permissions + window config.
const std = @import("std");
const runner = @import("runner");
const zero_native = @import("zero-native");
// `http.request` — curl-via-bridge. Response shape (incl. the binary
// `body_base64` / `body_too_large` flags) is documented on
// `runRequest` in handlers/http.zig.
const http_handler = @import("handlers/http.zig");
const grpc_handler = @import("handlers/grpc.zig");
const grpc_reflect_handler = @import("handlers/grpc_reflect.zig");
// `mock.start` / `mock.stop` / `mock.list` — local mock-server sidecar
// that serves saved response examples over a loopback HTTP listener.
// See handlers/mock.zig for the Zig-net-API decision + protocol.
const mock_handler = @import("handlers/mock.zig");
// `git.sync.*` — optional git-based collection sync. Shells out to
// `git` against a local clone under `<HOME>/.api-lab/git-sync`.
const git_sync_handler = @import("handlers/git_sync.zig");
// `mcp.stdio` — spawns a stdio-transport MCP server and pipes one
// batch of JSON-RPC frames through it. See handlers/mcp.zig.
const mcp_handler = @import("handlers/mcp.zig");
// `shell.open` — shells `open <url>` so external links open in the
// system default browser. URL scheme is gated to http(s) only; see
// handlers/shell.zig.
const shell_handler = @import("handlers/shell.zig");

pub const panic = std.debug.FullPanic(zero_native.debug.capturePanic);

const App = struct {
    fn app(_: *@This()) zero_native.App {
        return .{
            .context = undefined,
            .name = "api-lab",
            // Resolved at runtime from cwd. `zig build run` sets cwd to the
            // project root, so "frontend/dist" finds the Vite output portably.
            .source = zero_native.WebViewSource.assets(.{
                .root_path = "frontend/dist",
                .entry = "index.html",
                .origin = "zero://app",
                .spa_fallback = true,
            }),
        };
    }
};

const allowed_origins = [_][]const u8{ "zero://app", "zero://inline" };

const command_policies = [_]zero_native.BridgeCommandPolicy{
    .{ .name = "http.request", .permissions = &.{"network"}, .origins = &allowed_origins },
    .{ .name = "grpc.invoke", .permissions = &.{"network"}, .origins = &allowed_origins },
    .{ .name = "grpc.reflect.list", .permissions = &.{"network"}, .origins = &allowed_origins },
    .{ .name = "grpc.reflect.skeleton", .permissions = &.{"network"}, .origins = &allowed_origins },
    // The mock sidecar binds a loopback port — a network capability,
    // so it reuses the existing `network` permission rather than
    // introducing a separate `mock-server` permission to app.zon.
    .{ .name = "mock.start", .permissions = &.{"network"}, .origins = &allowed_origins },
    .{ .name = "mock.stop", .permissions = &.{"network"}, .origins = &allowed_origins },
    .{ .name = "mock.list", .permissions = &.{"network"}, .origins = &allowed_origins },
    // git sync — shells out to `git` (network for clone/pull/push) and
    // reads/writes a clone under <HOME>/.api-lab/ (filesystem).
    .{ .name = "git.sync.status", .permissions = &.{"filesystem"}, .origins = &allowed_origins },
    .{ .name = "git.sync.setup", .permissions = &.{ "network", "filesystem" }, .origins = &allowed_origins },
    .{ .name = "git.sync.pull", .permissions = &.{ "network", "filesystem" }, .origins = &allowed_origins },
    .{ .name = "git.sync.read", .permissions = &.{"filesystem"}, .origins = &allowed_origins },
    .{ .name = "git.sync.push", .permissions = &.{ "network", "filesystem" }, .origins = &allowed_origins },
    .{ .name = "git.sync.resolve", .permissions = &.{ "network", "filesystem" }, .origins = &allowed_origins },
    // `mcp.stdio` spawns a local MCP server process. The capability is
    // network-equivalent (an MCP server is a peer the app talks to),
    // so it reuses `network` rather than introducing a new permission.
    .{ .name = "mcp.stdio", .permissions = &.{"network"}, .origins = &allowed_origins },
    // `shell.open` hands a URL to `open(1)`. The URL is validated as
    // http(s)-only at the handler, so this rides on `network` rather
    // than introducing a `shell` permission to app.zon — the net
    // capability is "ask the OS to navigate to this web URL".
    .{ .name = "shell.open", .permissions = &.{"network"}, .origins = &allowed_origins },
};

// Builtin-bridge commands provided by zero-native itself (not our
// handlers). `zero-native.dialog.openFile` powers the multipart /
// binary body file pickers; it stays denied unless the builtin-bridge
// policy is explicitly enabled below.
const builtin_command_policies = [_]zero_native.BridgeCommandPolicy{
    .{ .name = "zero-native.dialog.openFile", .permissions = &.{"filesystem"}, .origins = &allowed_origins },
};

const policy_permissions = [_][]const u8{ "network", "filesystem" };

pub fn main(init: std.process.Init) !void {
    const gpa = std.heap.smp_allocator;

    var http_ctx = http_handler.Context{
        .gpa = gpa,
        .io = init.io,
        .env_map = init.environ_map,
    };
    var grpc_ctx = grpc_handler.Context{
        .gpa = gpa,
        .io = init.io,
        .env_map = init.environ_map,
    };
    var grpc_reflect_ctx = grpc_reflect_handler.Context{
        .gpa = gpa,
        .io = init.io,
        .env_map = init.environ_map,
    };
    // Mock sidecar context. `deinit` stops every active mock + joins
    // its worker thread — deferred here so closing API Lab tears the
    // listeners down cleanly (backlog Item: app lifecycle).
    var mock_ctx = mock_handler.Context{ .gpa = gpa };
    defer mock_ctx.deinit();
    var git_sync_ctx = git_sync_handler.Context{
        .gpa = gpa,
        .io = init.io,
        .env_map = init.environ_map,
    };
    var mcp_ctx = mcp_handler.Context{
        .gpa = gpa,
        .io = init.io,
        .env_map = init.environ_map,
    };
    var shell_ctx = shell_handler.Context{
        .gpa = gpa,
        .io = init.io,
        .env_map = init.environ_map,
    };

    var handler_list = [_]zero_native.BridgeHandler{
        http_handler.handler(&http_ctx),
        grpc_handler.handler(&grpc_ctx),
        grpc_reflect_handler.listHandler(&grpc_reflect_ctx),
        grpc_reflect_handler.skeletonHandler(&grpc_reflect_ctx),
        mock_handler.startHandler(&mock_ctx),
        mock_handler.stopHandler(&mock_ctx),
        mock_handler.listHandler(&mock_ctx),
        git_sync_handler.statusHandler(&git_sync_ctx),
        git_sync_handler.setupHandler(&git_sync_ctx),
        git_sync_handler.pullHandler(&git_sync_ctx),
        git_sync_handler.readHandler(&git_sync_ctx),
        git_sync_handler.pushHandler(&git_sync_ctx),
        git_sync_handler.resolveHandler(&git_sync_ctx),
        mcp_handler.handler(&mcp_ctx),
        shell_handler.handler(&shell_ctx),
    };
    const registry = zero_native.BridgeRegistry{ .handlers = &handler_list };

    const policy = zero_native.BridgePolicy{
        .enabled = true,
        .permissions = &policy_permissions,
        .commands = &command_policies,
    };

    const dispatcher = zero_native.BridgeDispatcher{
        .policy = policy,
        .registry = registry,
    };

    var app_state = App{};
    try runner.runWithOptions(app_state.app(), .{
        .app_name = "API Lab",
        .window_title = "API Lab",
        .bundle_id = "dev.olgun.api-lab",
        .icon_path = "assets/icon.icns",
        .bridge = dispatcher,
        // Enable zero-native's builtin bridge so the file-picker dialog
        // (`zero-native.dialog.openFile`) is reachable from the webview.
        .builtin_bridge = .{
            .enabled = true,
            .permissions = &policy_permissions,
            .commands = &builtin_command_policies,
        },
        .security = .{
            .navigation = .{ .allowed_origins = &allowed_origins },
        },
    }, init);
}

// Test-discovery root. `zig build test` compiles `app_mod` with
// `main.zig` as its root; Zig only surfaces `test` blocks from files
// reachable through a `test` declaration in the root. Without this
// block the handler tests silently report "0 tests".
//
// `handlers/http.zig` and `handlers/mock.zig` are wired in (each
// chains its own `*_test.zig`). The grpc test files are still out —
// some have bit-rotted against the Zig 0.16 std API (e.g.
// grpc_tls_test.zig calls a removed `Io.File.readAll` overload);
// wiring them back is a separate cleanup, see the follow-up backlog
// item.
test {
    _ = @import("handlers/http.zig");
    _ = @import("handlers/mock.zig");
    _ = @import("handlers/mcp.zig");
    _ = @import("handlers/grpc.zig");
    _ = @import("handlers/grpc_reflect.zig");
    _ = @import("handlers/shell.zig");
}
