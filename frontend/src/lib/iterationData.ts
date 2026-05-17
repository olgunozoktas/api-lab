/** Olgun Özoktaş geliştirdi · API Lab */
//
// Iteration-data parsing for the collection runner. Turns a CSV or
// JSON-array file into a list of rows, each row a flat string map the
// runner merges into the request env (and exposes as
// `pm.iterationData`). One row → one iteration of the whole collection.
//
// CSV follows RFC 4180: a quoted field may contain commas, newlines,
// and doubled `""` quotes. JSON is an array of flat objects (or a
// single object, treated as a one-row array). No Excel — by design.

// Parse CSV text into a grid of string cells. Handles quoted fields
// with embedded commas / newlines / escaped `""`, and CRLF or LF or
// bare-CR line endings outside quotes.
function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ",") {
      endField();
      i++;
    } else if (c === "\n") {
      endRow();
      i++;
    } else if (c === "\r") {
      endRow();
      i += text[i + 1] === "\n" ? 2 : 1;
    } else {
      field += c;
      i++;
    }
  }
  // Trailing field/row — only if there's anything pending.
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

// Parse an iteration-data file. Auto-detects JSON (leading `[` or `{`)
// vs CSV. Returns one flat string map per iteration row. Throws with a
// human-readable message on malformed input — the caller surfaces it.
export function parseIterationData(text: string): Record<string, string>[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed[0] === "[" || trimmed[0] === "{") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      throw new Error(`Invalid JSON: ${(e as Error).message}`);
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((row, idx) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`Row ${idx + 1} is not an object`);
      }
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        out[k] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      }
      return out;
    });
  }

  const grid = parseCsvGrid(trimmed);
  if (grid.length === 0) return [];
  const headers = grid[0].map((h) => h.trim());
  return grid.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) out[h] = cells[i] ?? "";
    });
    return out;
  });
}
