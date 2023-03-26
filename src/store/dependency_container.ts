import { useStore } from "./hooks";

/**
 * An injectable store constructor
 */
export interface StoreConstructor<T = any> {
  new (get: Get): T;
}

/**
 * A function used to inject dependencies in a store constructor
 */
export type Get = <T extends StoreConstructor<any>>(
  Store: T
) => T extends StoreConstructor<infer I> ? I : never;

/**
 * A type-safe dependency container
 */
export class DependencyContainer {
  private dependencies: Map<StoreConstructor, any> = new Map();
  private factory = new StoreFactory(this.get.bind(this));

  /**
   * Injects a store instance in the dependency container.
   * Useful for injecting an external store that is not created by the container.
   * Also useful for mocking a store.
   */
  inject<T extends StoreConstructor>(Store: T, instance: InstanceType<T>): void {
    this.dependencies.set(Store, instance);
  }

  get<T>(Store: StoreConstructor<T>): T {
    if (!this.dependencies.has(Store)) {
      this.dependencies.set(Store, this.factory.build(Store));
    }
    return this.dependencies.get(Store);
  }
}

class StoreFactory {
  private building: Set<StoreConstructor<any>> = new Set();

  constructor(private get: Get) {}
  /**
   * Build a store instance and all its dependencies
   * while detecting and preventing circular dependencies
   */
  build<T>(Store: StoreConstructor<T>): T {
    if (this.building.has(Store)) {
      throw new Error(
        `Circular dependency detected: ${[...this.building, Store].map((s) => s.name).join(" -> ")}`
      );
    }
    this.building.add(Store);
    const instance = new Store(this.get);
    this.building.delete(Store);
    return instance;
  }
}

export function createMetaStore<T extends object>(value: T): StoreConstructor<T> {
  class MetaStore {
    constructor(get: Get) {
      return value;
    }
  }
  return MetaStore as StoreConstructor<T>;
}

/**
 * Force any function to never return anything, effectively
 * making it write-only.
 */
type NeverReturns<T> = T extends (...args: any[]) => any ? (...args: Parameters<T>) => never : T;

/**
 * Command Query Separation [1,2] implementation with types.
 *
 * Mapped type that implements CQS by forcing
 * - methods (commands) to never return anything, effectively making them write-only,
 * - all properties (queries) to be read-only [3]
 *
 * [1] https://martinfowler.com/bliki/CommandQuerySeparation.html
 * [2] https://en.wikipedia.org/wiki/Command%E2%80%93query_separation
 * [3] in an ideal world, they would be deeply read-only, but that's not possible natively in TypeScript
 */
export type CQS<T> = {
  readonly [key in keyof T]: NeverReturns<T[key]>;
};

// type CommandQueryStore<T> = OnlyReadonlyProperties<T> & WriteOnlyMethods<T>;
// type CommandQueryStore<T> = WriteOnlyMethods<T>;
class CQSTEST {
  private n = 4;
  L = 9;
  getSomething() {
    return this.n;
  }
}

// const ttt: CQS<CQSTEST> = new CQSTEST();
// ttt.getSomething();

// const cqs: CQStore<CQSTEST> = new CQSTEST();
// cqs.actions.setData(5);

const ty = new CQSTEST();
ty.L = 0;
// ty.actions.setData(5);

const sss = useStore(CQSTEST);
sss.getSomething();
// @ts-expect-error
sss.sss.L = 9;

const z = sss.getSomething();
