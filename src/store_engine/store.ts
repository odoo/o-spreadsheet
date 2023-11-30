import { reactive } from "@odoo/owl";

/**
 * An injectable store constructor
 */
export interface StoreConstructor<T = any> {
  new (get: Get): T;
}

/**
 * An injectable store constructor which accepts additional constructor parameters
 */
export interface ParametricStoreConstructor<T = any, A extends any[] = any[]> {
  new (get: Get, ...args: A): T;
}

export interface Disposable {
  dispose(): void;
}

export type DisposableStoreConstructor<T extends Disposable = any> = StoreConstructor<T>;

export type StoreParameters<T extends StoreConstructor> = SkipFirst<ConstructorParameters<T>>;

/**
 * A function used to inject dependencies in a store constructor
 */
export type Get = <T extends StoreConstructor<any>>(
  Store: T
) => T extends StoreConstructor<infer I> ? Store<I> : never;

type SkipFirst<T extends any[]> = T extends [any, ...infer U] ? U : never;

export function createValueStore<T extends object>(value: () => T): StoreConstructor<T> {
  class MetaStore {
    constructor(get: Get) {
      return value();
    }
  }
  return MetaStore as StoreConstructor<T>;
}

export type Store<T> = CQS<T>;

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

export class ReactiveStore {
  constructor(protected get: Get) {
    return reactive(this);
  }
}
