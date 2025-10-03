/**
 * An injectable store constructor
 */
export interface StoreConstructor<T = any, A extends unknown[] = any[]> {
  new (get: Get, ...args: A): T;
}

/**
 * A store constructor for a store that implements the Disposable interface.
 * Useful for local stores that need to be disposed when the component unmounts.
 */
export interface LocalStoreConstructor<
  T extends Disposable = any,
  A extends unknown[] = unknown[]
> {
  new (get: Get, ...args: A): T;
}

export interface Disposable {
  dispose(): void;
}

export type StoreParams<T extends StoreConstructor> = SkipFirst<ConstructorParameters<T>>;
/**
 * A function used to inject dependencies in a store constructor
 */
export type Get = <T extends StoreConstructor>(
  Store: T
) => T extends StoreConstructor<infer I> ? Store<I> : never;
/**
 * Remove the first element of a tuple
 * @example
 * type A = SkipFirst<[number, string, boolean]> // [string, boolean]
 */
type SkipFirst<T extends any[]> = T extends [any, ...infer U] ? U : never;
type OmitFunctions<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
export type Store<S> = S extends { mutators: readonly (keyof S)[] }
  ? CQS<Pick<S, S["mutators"][number]> & OmitFunctions<S>>
  : CQS<OmitFunctions<S>>;
/**
 * Command Query Separation [1,2] implementation with types.
 *
 * Mapped type applying CQS principles to an object by forcing
 * - methods (commands) to never return anything, effectively making them write-only,
 * - all properties (queries) to be read-only [3]
 *
 * [1] https://martinfowler.com/bliki/CommandQuerySeparation.html
 * [2] https://en.wikipedia.org/wiki/Command%E2%80%93query_separation
 * [3] in an ideal world, they would be deeply read-only, but that's not possible natively in TypeScript
 */
type CQS<T> = {
  readonly [key in keyof T]: NeverReturns<T[key]>;
};
/**
 * Force any function to never return anything, effectively
 * making it write-only.
 */
type NeverReturns<T> = T extends (...args: any[]) => any ? (...args: Parameters<T>) => void : T;
