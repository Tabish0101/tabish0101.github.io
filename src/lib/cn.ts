/** Join class names, skipping falsy values. Tenebris utilities don't overlap, so no merging. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
