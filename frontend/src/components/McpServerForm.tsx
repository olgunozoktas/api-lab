/** Olgun Özoktaş geliştirdi · API Lab */
// Edit form for one MCP server config — name + transport kind +
// transport-specific fields + optional description. Pure presenter:
// the caller (`McpServersModal`) holds the local state and decides
// when to commit. Extracted from the modal so the modal stays under
// the 400-LOC cap.
import { useT } from "../lib/i18n/useT";
import type { McpTransport } from "../lib/types";
import { Button } from "./ui/button";

const inputCls =
  "w-full h-8 px-2 rounded text-xs bg-[var(--color-bg)] border border-[var(--color-border)] " +
  "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

export type McpServerFormValue = {
  name: string;
  transport: McpTransport;
  description?: string;
};

export interface McpServerFormProps {
  value: McpServerFormValue;
  onChange: (patch: Partial<McpServerFormValue>) => void;
  // When the bridge is absent (browser dev mode) the stdio kind can't
  // actually run; the button is disabled with a hint so the user
  // doesn't pick something that'll fail at call time.
  stdioAvailable: boolean;
}

export function McpServerForm({ value, onChange, stdioAvailable }: McpServerFormProps) {
  const t = useT();
  const kind = value.transport.kind;

  // Switching kind replaces the transport with a fresh default —
  // editing stdio fields then flipping to http shouldn't leave stale
  // command/args lying around inside an http transport.
  function setKind(k: McpTransport["kind"]) {
    onChange({
      transport:
        k === "stdio" ? { kind: "stdio", command: "npx", args: [] } : { kind: "http", url: "" },
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        className={inputCls}
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={t("mcp.servers.namePlaceholder")}
        aria-label={t("mcp.servers.nameLabel")}
      />
      <div className="flex items-center gap-1.5">
        <Button
          variant={kind === "stdio" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setKind("stdio")}
          disabled={!stdioAvailable}
          title={stdioAvailable ? undefined : t("mcp.stdioNativeOnly")}
          aria-pressed={kind === "stdio"}
        >
          {t("mcp.transport.stdio")}
        </Button>
        <Button
          variant={kind === "http" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setKind("http")}
          aria-pressed={kind === "http"}
        >
          {t("mcp.transport.http")}
        </Button>
      </div>
      {value.transport.kind === "stdio" ? (
        <>
          <input
            className={inputCls}
            value={value.transport.command}
            onChange={(e) =>
              onChange({
                transport: {
                  kind: "stdio",
                  command: e.target.value,
                  args: value.transport.kind === "stdio" ? value.transport.args : [],
                },
              })
            }
            placeholder={t("mcp.commandPlaceholder")}
            aria-label={t("mcp.command")}
          />
          <input
            className={inputCls}
            value={value.transport.args.join(" ")}
            onChange={(e) =>
              onChange({
                transport: {
                  kind: "stdio",
                  command: value.transport.kind === "stdio" ? value.transport.command : "",
                  args: e.target.value.split(/\s+/).filter(Boolean),
                },
              })
            }
            placeholder={t("mcp.argsPlaceholder")}
            aria-label={t("mcp.serverArgs")}
          />
        </>
      ) : (
        <input
          className={inputCls}
          value={value.transport.url}
          onChange={(e) =>
            onChange({
              transport: { kind: "http", url: e.target.value },
            })
          }
          placeholder={t("mcp.urlPlaceholder")}
          aria-label={t("mcp.url")}
        />
      )}
      <input
        className={inputCls}
        value={value.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder={t("mcp.servers.descriptionPlaceholder")}
        aria-label={t("mcp.servers.descriptionLabel")}
      />
    </div>
  );
}
