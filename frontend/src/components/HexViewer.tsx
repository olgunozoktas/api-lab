/** Olgun Özoktaş geliştirdi · API Lab */
// Hex viewer for response bodies with no richer viewer (binary /
// octet-stream payloads). Renders a `hexdump -C` style grid.

import { useMemo } from "react";
import { useT } from "../lib/i18n/useT";
import { hexDump, HEXDUMP_DEFAULT_LIMIT } from "../lib/hexDump";

export type HexViewerProps = { body: string | Uint8Array };

export function HexViewer({ body }: HexViewerProps) {
  const t = useT();
  const dump = useMemo(() => hexDump(body), [body]);
  const truncated = body.length > HEXDUMP_DEFAULT_LIMIT;
  return (
    <div className="flex-1 overflow-auto p-3">
      {truncated ? (
        <div className="mb-2 text-2xs text-[var(--color-fg-muted)]">
          {t("response.hex.truncated", { limit: String(HEXDUMP_DEFAULT_LIMIT) })}
        </div>
      ) : null}
      <pre className="m-0 font-mono text-2xs leading-5 whitespace-pre select-text text-[var(--color-fg)]">
        {dump}
      </pre>
    </div>
  );
}
