export type FunctionResultNumber = { value: number; format?: string };
export type SetDecimalStep = 1 | -1;

export interface RGBA {
  a: number;
  r: number;
  g: number;
  b: number;
}

export interface HSLA {
  a: number;
  h: number;
  s: number;
  l: number;
}

export interface Link {
  readonly label: string;
  readonly url: string;
  readonly isExternal: boolean;
  /**
   * Specifies if the URL is editable by the end user.
   * Special links might not allow it.
   */
  readonly isUrlEditable: boolean;
}

export type Dimension = "COL" | "ROW";
export type Increment = 1 | -1 | 0;

export interface Ref<T> {
  el: T | null;
}

/**
 * Container for a lazy computed value
 */
export interface Lazy<T> {
  /**
   * Return the computed value.
   * The value is computed only once and memoized.
   */
  (): T;
  /**
   * Map a lazy value to another lazy value.
   *
   * ```ts
   * // neither function is called here
   * const lazyValue = lazy(() => veryExpensive(...)).map((result) => alsoVeryExpensive(result));
   *
   * // both values are computed now
   * const value = lazyValue()
   * ```
   */
  map: <U>(callback: (value: T) => U) => Lazy<U>;
}

export interface Cloneable<T> {
  clone: (args?: Partial<T>) => T;
}

export interface SortOptions {
  /** If true sort the headers of the range along with the rest */
  sortHeaders?: boolean;
  /** If true treat empty cells as "0" instead of undefined */
  emptyCellAsZero?: boolean;
}

// https://github.com/Microsoft/TypeScript/issues/13923#issuecomment-557509399
// prettier-ignore
export type Immutable<T> =
    T extends ImmutablePrimitive ? T :
    T extends Array<infer U> ? ImmutableArray<U> :
    T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
    T extends Set<infer M> ? ImmutableSet<M> :
    ImmutableObject<T>;
type ImmutablePrimitive = undefined | null | boolean | string | number | Function;
type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };
export type Direction = "up" | "down" | "left" | "right";
export type SelectionStep = number | "end";

export interface Offset {
  col: number;
  row: number;
}

export type DebouncedFunction<T> = T & {
  stopDebounce: () => void;
  isDebouncePending: () => boolean;
};
export type SortDirection = "asc" | "desc";

export interface ValueAndLabel<T = string> {
  value: T;
  label: string;
}
