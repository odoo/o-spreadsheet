import { reactive } from "@odoo/owl";

/**
 * An injectable store constructor
 */
interface StoreConstructor<T> {
  new (get: Get): T;
}

/**
 * A function used to inject dependencies in a store constructor
 */
export type Get = <T extends StoreConstructor<any>>(
  Store: T
) => T extends StoreConstructor<infer I> ? I : never;

export class DependencyContainer {
  private dependencies: Map<StoreConstructor<any>, any> = new Map();
  private factory = new StoreFactory(this.get.bind(this));

  /**
   * Injects a store instance in the dependency container.
   * Useful for injecting an external store that is not created by the container.
   * Also useful for mocking a store.
   */
  inject<T extends StoreConstructor<any>>(Store: T, instance: InstanceType<T>): void {
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
 * Creates a side-effect that runs based on the content of reactive objects.
 *
 * @template {object[]} T
 * @param {(...args: [...T]) => void} cb callback for the effect
 * @param {[...T]} deps the reactive objects that the effect depends on
 */
export function effect(cb, deps) {
  const reactiveDeps = reactive(deps, () => {
    cb(...reactiveDeps);
  });
  cb(...reactiveDeps);
}

/**
 * Adds computed properties to a reactive object derived from multiples sources.
 *
 * @param obj the reactive object on which to add the computed properties
 * @param  sources the reactive objects which are needed to compute the properties
 * @param descriptor the object containing methods to compute the properties
 * @returns {T & {[key in keyof V]: ReturnType<V[key]>}}
 */
export function withComputedProperties<
  T extends object,
  U extends object[],
  V extends { [key: string]: (this: T, ...rest: [...U]) => unknown }
>(obj: T, sources: U, descriptor: V): T & { readonly [key in keyof V]: ReturnType<V[key]> } {
  for (const [key, compute] of Object.entries(descriptor)) {
    effect(
      (obj, sources) => {
        obj[key] = compute.call(obj, ...sources);
      },
      [obj, sources]
    );
  }
  return obj as T & { [key in keyof V]: ReturnType<V[key]> };
}

const s = withComputedProperties(reactive({ a: 4 }), [{ coucou: 2 }], {
  comp(dep) {
    return dep.coucou + this.a;
  },
});

interface TestComputed {
  comp: number;
  n: number;
}

class TestComputed {
  constructor(public n = 4) {
    return withComputedProperties(this, [this], {
      comp(dep) {
        return this.n * 2;
      },
    });
  }
}

const t = new TestComputed();
t.comp;

type ReturnVoid<T> = T extends (...args: any[]) => any ? (...args: Parameters<T>) => void : T;

/**
 * Mapped type to only allow properties (no methods) and force
 * them to be readonly.
 */
// type OnlyReadonlyProperties<T> = {
//   readonly [key in keyof T]: T[key];
// };

/**
 * Mapped type to force methods to always return void, effectively
 * making them write-only.
 */
type WriteOnlyActions<T extends { actions: any }> = {
  actions: {
    [key in keyof T["actions"]]: ReturnVoid<T["actions"][key]>;
  };
};

/**
 * Methods can write only, properties can be read only
 */
type CommandQuerySeparation<T> = {
  readonly [key in keyof T]: ReturnVoid<T[key]>;
};

// type CommandQueryStore<T> = OnlyReadonlyProperties<T> & WriteOnlyMethods<T>;
// type CommandQueryStore<T> = WriteOnlyMethods<T>;
class CQSTEST {
  // constructor(readonly h = 4) {

  // }
  private n = 4;
  L = 9;
  // readonly actions = {
  //   setData: (data: any) => {
  //     return this.n;
  //   },
  // };
  getSomething() {
    return this.n;
  }
}

const ttt: CommandQuerySeparation<CQSTEST> = new CQSTEST();
ttt.getSomething();

// const cqs: CQStore<CQSTEST> = new CQSTEST();
// cqs.actions.setData(5);

const ty = new CQSTEST();
ty.L = 0;
// ty.actions.setData(5);

function useStore<T extends StoreConstructor<any>>(
  Store: T
): CommandQuerySeparation<InstanceType<T>> {
  return 4 as any;
}

const sss = useStore(CQSTEST);
sss.L;
// @ts-expect-error
sss.L = 9;

const z = sss.getSomething();
