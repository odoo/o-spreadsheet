import { getCanonicalRepresentation } from "../../helpers/data_normalization";

/**
 * Deduplicate-and-index primitive used during XLSX construction.
 *
 * Interns items keyed by their canonical representation and returns a stable
 * numeric handle. Used for every XLSX entity that needs `refId -> Nth entry`
 * indirection: fonts, fills, borders, numFmts, cellStyles, dxfs and shared
 * strings.
 *
 * Named `Interned` rather than `Registry` because `Registry<T>` is a core
 * generic class in `src/registry.ts` used across the codebase.
 */
export class XLSXInterned<T> {
  private readonly items: T[] = [];
  private readonly byKey = new Map<string, number>();
  private readonly canonical: (item: T) => string;

  constructor(canonical: (item: T) => string = getCanonicalRepresentation, initial: T[] = []) {
    this.canonical = canonical;
    for (const item of initial) {
      this.intern(item);
    }
  }

  intern(item: T): number {
    const key = this.canonical(item);
    const existing = this.byKey.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const index = this.items.length;
    this.items.push(item);
    this.byKey.set(key, index);
    return index;
  }

  values(): T[] {
    return this.items;
  }

  size(): number {
    return this.items.length;
  }
}
