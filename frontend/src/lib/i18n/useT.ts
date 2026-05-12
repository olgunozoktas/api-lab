/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../../store";
import { t, type TKey } from "./index";

// Stable hook — re-renders only when the locale changes.
export function useT(): (key: TKey, params?: Record<string, string | number>) => string {
  const locale = useStore((s) => s.locale);
  return (key, params) => t(locale, key, params);
}
