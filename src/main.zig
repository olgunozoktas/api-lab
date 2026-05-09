const std = @import("std");
const runner = @import("runner");
const zero_native = @import("zero-native");
const http_handler = @import("handlers/http.zig");

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
};

const policy_permissions = [_][]const u8{ "network", "filesystem" };

pub fn main(init: std.process.Init) !void {
    const gpa = std.heap.smp_allocator;

    var http_ctx = http_handler.Context{
        .gpa = gpa,
        .io = init.io,
        .env_map = init.environ_map,
    };

    var handler_list = [_]zero_native.BridgeHandler{
        http_handler.handler(&http_ctx),
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
        .security = .{
            .navigation = .{ .allowed_origins = &allowed_origins },
        },
    }, init);
}
