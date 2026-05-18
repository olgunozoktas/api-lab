/** Olgun Özoktaş geliştirdi · API Lab */
// Class-name merge helper — clsx joins conditional class values, then
// tailwind-merge resolves conflicting Tailwind utilities so a caller's
// `className` override actually wins over a component's internal class.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
