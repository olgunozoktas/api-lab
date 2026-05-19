/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { rowsToCsv } from "../vizExport";
import type { VizColumn, VizRow } from "../chartable";

const cols = (keys: string[]): VizColumn[] => keys.map((key) => ({ key, numeric: false }));

describe("rowsToCsv", () => {
  it("emits a header row followed by one line per data row", () => {
    const csv = rowsToCsv(cols(["id", "name"]), [
      { id: 1, name: "Ada" },
      { id: 2, name: "Linus" },
    ]);
    expect(csv).toBe("id,name\r\n1,Ada\r\n2,Linus");
  });

  it("uses CRLF line endings (RFC 4180 / Excel)", () => {
    const csv = rowsToCsv(cols(["a"]), [{ a: 1 }]);
    expect(csv.split("\r\n")).toEqual(["a", "1"]);
  });

  it("quotes cells containing a comma and leaves clean cells bare", () => {
    const csv = rowsToCsv(cols(["city", "pop"]), [{ city: "Paris, FR", pop: 2 }]);
    expect(csv).toBe('city,pop\r\n"Paris, FR",2');
  });

  it("doubles embedded quotes inside a quoted cell", () => {
    const csv = rowsToCsv(cols(["q"]), [{ q: 'she said "hi"' }]);
    expect(csv).toBe('q\r\n"she said ""hi"""');
  });

  it("quotes cells containing a newline so the row stays intact", () => {
    const csv = rowsToCsv(cols(["note"]), [{ note: "line1\nline2" }]);
    expect(csv).toBe('note\r\n"line1\nline2"');
  });

  it("follows the column order given, not the row's key order", () => {
    const csv = rowsToCsv(cols(["b", "a"]), [{ a: "first", b: "second" }]);
    expect(csv).toBe("b,a\r\nsecond,first");
  });

  it("preserves the row order as passed (caller pre-sorts)", () => {
    const rows: VizRow[] = [{ n: 3 }, { n: 1 }, { n: 2 }];
    expect(rowsToCsv(cols(["n"]), rows)).toBe("n\r\n3\r\n1\r\n2");
  });

  it("renders null as `null`, undefined/missing as empty, objects as JSON", () => {
    const csv = rowsToCsv(cols(["a", "b", "c"]), [{ a: null, c: { x: 1 } }]);
    expect(csv).toBe('a,b,c\r\nnull,,"{""x"":1}"');
  });

  it("emits a header-only string when there are no rows", () => {
    expect(rowsToCsv(cols(["id", "name"]), [])).toBe("id,name");
  });
});
