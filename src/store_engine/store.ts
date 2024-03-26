import { reactive } from "@odoo/owl";

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
export type Get = <T extends StoreConstructor<any>>(
  Store: T
) => T extends StoreConstructor<infer I> ? Store<I> : never;

/**
 * Remove the first element of a tuple
 * @example
 * type A = SkipFirst<[number, string, boolean]> // [string, boolean]
 */
type SkipFirst<T extends any[]> = T extends [any, ...infer U] ? U : never;

/**
 * Create a store to expose an external resource (which is not a store itself)
 * to other stores.
 * The external resource needs to be injected in the store provider to provide
 * the store implementation.
 *
 * @example
 * const MyMetaStore = createAbstractStore("MyStore");
 * const stores = useStoreProvider();
 * stores.inject(MyMetaStore, externalResourceInstance);
 */
export function createAbstractStore<T extends unknown>(storeName: string): StoreConstructor<T> {
  class MetaStore {
    constructor(get: Get) {
      throw new Error(`This is a abstract store for ${storeName}, it cannot be instantiated.
Did you forget to inject your store instance?

const stores = useStoreProvider();
stores.inject(MyMetaStore, storeInstance);
`);
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

function getAllMethods(obj) {
  let methodsAndAccessors: string[] = [];

  // Iterate over own properties of the object
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (!descriptor) {
      return;
    }
    if (typeof descriptor.value === "function") {
      methodsAndAccessors.push(prop);
    }
  });

  // Recursively traverse the prototype chain
  const prototype = Object.getPrototypeOf(obj);
  if (prototype !== null) {
    const inheritedMethodsAndAccessors = getAllMethods(prototype);
    methodsAndAccessors = methodsAndAccessors.concat(inheritedMethodsAndAccessors);
  }

  return methodsAndAccessors;
}

function getAllAccessors(obj, bindTo) {
  let methodsAndAccessors: string[] = [];

  // Iterate over own properties of the object
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (!descriptor) {
      return;
    }
    // if (descriptor.get || descriptor.set) {debugger}
    if (descriptor.get || descriptor.set) {
      console.log(prop);
      Object.defineProperty(obj, prop, {
        ...descriptor,
        get() {
          return descriptor.get!.bind(obj);
        },
      });
      methodsAndAccessors.push(prop);
    }
  });

  // Recursively traverse the prototype chain
  const prototype = Object.getPrototypeOf(obj);
  if (prototype !== null) {
    const inheritedMethodsAndAccessors = getAllAccessors(prototype, bindTo);
    console.log(inheritedMethodsAndAccessors);
    methodsAndAccessors = methodsAndAccessors.concat(inheritedMethodsAndAccessors);
  }

  return methodsAndAccessors;
}

// const a = {
//   a: 1,
//   b() {
//     return 2;
//   },
//   get c() {
//     return 3;
//   },
//   set c(v) {
//     console.log(v);
//   },
// };
// console.log()

export class ReactiveStore {
  constructor(protected get: Get) {
    const reactiveThis = reactive(this);
    // bind all methods to the non-reactive instance
    for (const key of getAllMethods(this)) {
      reactiveThis[key] = reactiveThis[key].bind(reactiveThis);
    }
    for (const key of getAllAccessors(this, this)) {
      // TODO include getters
      // const descriptor = Object.getOwnPropertyDescriptor(this, key);
      // debugger
      // Object.defineProperty(reactiveThis, key, {
      //   ...descriptor,
      //   get() {
      //     return descriptor?.get!.bind(reactiveThis);
      //   },
      // });
    }
    return reactiveThis;
  }
}

export class DisposableStore extends ReactiveStore implements Disposable {
  private disposeCallbacks: (() => void)[] = [];

  protected onDispose(callback: () => void) {
    this.disposeCallbacks.push(callback);
  }

  dispose() {
    this.disposeCallbacks.forEach((cb) => cb());
  }
}
