import clsx, { type ClassValue } from 'clsx';

/**
 * Joins conditional class names. Deliberately clsx-only: UnoCSS resolves
 * conflicting utilities by source order at build time, so no
 * tailwind-merge-style dedupe layer (and no extra dependency) is needed.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
