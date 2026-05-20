/** Olgun Özoktaş geliştirdi · API Lab */
// Sidebar "Import" button — sniffs the dropped file (Postman v2,
// Insomnia v4, HAR, Bruno, OpenAPI JSON/YAML) and routes it to the
// matching importer. Extracted from Sidebar.tsx so the sidebar shell
// stays under the 400-LOC cap and the loading state below has room
// to land without pushing it over.
import { useRef, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import { parsePostmanV2 } from "../lib/importers/postmanV2";
import { isInsomniaExport, parseInsomniaV4 } from "../lib/importers/insomnia";
import { isHarFile, parseHar } from "../lib/importers/har";
import { isBrunoFile, parseBruno } from "../lib/importers/bruno";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

export function ImportPostmanButton() {
  const importItems = useStore((s) => s.importItems);
  const importHistory = useStore((s) => s.importHistory);
  const setUi = useStore((s) => s.setUi);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const fileRef = useRef<HTMLInputElement | null>(null);
  // `importing` flips true around the async parse; the delayed flag
  // gates the spinner so a small / instant import doesn't flicker one.
  const [importing, setImporting] = useState(false);
  const showSpinner = useDelayedFlag(importing);

  const onFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      // Bruno `.bru` files are plain text, not JSON — sniff + route
      // them before the JSON-shape dispatch below.
      if (isBrunoFile(text)) {
        const r = parseBruno(text);
        if (r.items.length === 0) {
          showToast(t("import.empty"), { severity: "warning" });
          return;
        }
        importItems(r.items, r.envVars, r.collectionName);
        showToast(
          t("import.success", {
            name: r.collectionName,
            folders: String(r.folderCount),
            requests: String(r.requestCount),
          }),
          { severity: "success" }
        );
        if (r.warnings.length > 0) {
          showToast(t("import.warnings", { count: String(r.warnings.length) }), {
            severity: "warning",
          });
          // eslint-disable-next-line no-console
          console.warn("Bruno import warnings:", r.warnings);
        }
        return;
      }
      // OpenAPI 3.x — JSON or YAML. Detected before the JSON-only
      // branches since a YAML spec won't survive a JSON.parse. The
      // importer (and its ~100 KB yaml parser) is dynamically imported
      // so it stays out of the main bundle.
      const oas = await import("../lib/importers/openapi");
      let specDoc: unknown = null;
      try {
        specDoc = oas.parseSpecText(text);
      } catch {
        // Not a parseable spec — fall through to the JSON dispatch.
      }
      if (oas.isOpenApiSpec(specDoc)) {
        const r = oas.parseOpenApi(text);
        if (r.items.length === 0) {
          showToast(t("import.empty"), { severity: "warning" });
          return;
        }
        importItems(r.items, r.envVars, r.collectionName);
        showToast(
          t("import.success", {
            name: r.collectionName,
            folders: String(r.folderCount),
            requests: String(r.requestCount),
          }),
          { severity: "success" }
        );
        if (r.warnings.length > 0) {
          showToast(t("import.warnings", { count: String(r.warnings.length) }), {
            severity: "warning",
          });
          // eslint-disable-next-line no-console
          console.warn("OpenAPI import warnings:", r.warnings);
        }
        return;
      }
      // Format detection: peek the JSON shape and route to the right
      // parser. Postman v2 / Insomnia v4 / HAR all share .json, so
      // filename-based dispatch isn't enough.
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Leave parsed null — parsePostmanV2 will re-throw with its
        // own JSON-error message; preserves the existing UX.
      }
      if (isHarFile(parsed)) {
        const r = parseHar(text);
        if (r.items.length === 0) {
          showToast(t("import.empty"), { severity: "warning" });
          return;
        }
        importHistory(r.items);
        // HAR populates History, so flip the sidebar tab so the user
        // sees their imported entries immediately.
        setUi({ sidebarTab: "history" });
        const summary = t("import.har.success", {
          creator: r.collectionName,
          count: String(r.requestCount),
        });
        showToast(summary, { severity: "success" });
        if (r.warnings.length > 0) {
          showToast(t("import.warnings", { count: String(r.warnings.length) }), {
            severity: "warning",
          });
          // eslint-disable-next-line no-console
          console.warn("HAR import warnings:", r.warnings);
        }
        return;
      }
      const useInsomnia = isInsomniaExport(parsed);
      const result = useInsomnia ? parseInsomniaV4(text) : parsePostmanV2(text);
      const sourceLabel = useInsomnia ? "Insomnia" : "Postman";
      if (result.items.length === 0) {
        showToast(t("import.empty"), { severity: "warning" });
        return;
      }
      importItems(result.items, result.envVars, result.collectionName);
      const summary = t("import.success", {
        name: result.collectionName,
        folders: String(result.folderCount),
        requests: String(result.requestCount),
      });
      showToast(summary, { severity: "success" });
      if (result.warnings.length > 0) {
        showToast(t("import.warnings", { count: String(result.warnings.length) }), {
          severity: "warning",
        });
        // eslint-disable-next-line no-console
        console.warn(`${sourceLabel} import warnings:`, result.warnings);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(t("import.failed", { error: msg }), { severity: "error" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.bru,.yaml,.yml,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          // Reset so re-importing the same file re-fires onChange.
          e.target.value = "";
        }}
        disabled={importing}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="text-2xs h-auto py-0.5 px-1.5"
        title={t("import.title")}
        disabled={importing}
      >
        {showSpinner && <Spinner />}
        {importing ? t("import.importing") : t("import.button")}
      </Button>
    </>
  );
}
