// Minimal i18n. Adding a new language:
//   1. Create lib/i18n/<code>.ts that exports `<code>: Dict`
//   2. Register it in `locales` below
//   3. Add a label to `LOCALE_LABEL`
//
// Translation keys live in tr.ts (source of truth). TypeScript fails the
// build if any other locale is missing a key.

import { tr } from "./tr";
import { en } from "./en";

export type Dict = typeof tr;
export type TKey = keyof Dict;

export const locales = { tr, en } as const;
export type Locale = keyof typeof locales;

export const SUPPORTED_LOCALES: Locale[] = ["tr", "en"];

export const LOCALE_LABEL: Record<Locale, TKey> = {
  tr: "lang.tr",
  en: "lang.en",
};

export function detectLocale(fallback: Locale = "tr"): Locale {
  if (typeof navigator === "undefined") return fallback;
  const lang = navigator.language?.toLowerCase() ?? "";
  for (const code of SUPPORTED_LOCALES) {
    if (lang === code || lang.startsWith(code + "-")) return code;
  }
  return fallback;
}

export function t(
  locale: Locale,
  key: TKey,
  params?: Record<string, string | number>,
): string {
  const dict = locales[locale] as Dict;
  let str: string = dict[key] ?? locales.tr[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
