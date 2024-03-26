import { onWillUnmount, useEnv, useState, useSubEnv } from "@odoo/owl";
import { DependencyContainer } from "./dependency_container";
import { LocalStoreConstructor, Store, StoreConstructor, StoreParams } from "./store";

/**
 * This hook should be used at the root of your app to provide the store container.
 */
export function useStoreProvider() {
  const env = useEnv();
  if (env.__spreadsheet_stores__ instanceof DependencyContainer) {
    return env.__spreadsheet_stores__;
  }
  const container = new DependencyContainer();
  useSubEnv({
    __spreadsheet_stores__: container,
    getStore: container.get.bind(container),
  });
  return container;
}

type Env = ReturnType<typeof useEnv>;

const methodsCache = new WeakMap<StoreConstructor, Set<string>>();

function getStoreMethods(Store: StoreConstructor): Set<string> {
  let methods = methodsCache.get(Store);
  if (!methods) {
    methods = new Set(
      Object.getOwnPropertyNames(Store.prototype).filter((name) => {
        const descriptor = Object.getOwnPropertyDescriptor(Store.prototype, name);
        return typeof descriptor?.value === "function";
      })
    );
    methods.delete("constructor");
    methods.delete("drawLayer");
    methods.delete("handle");
    methods.delete("handleEvent");
    methods.delete("finalize");
    methodsCache.set(Store, methods);
  }
  // console.log("methods", methods);
  return methods;
}

/**
 * Get the instance of a store.
 */
export function useStore<T extends StoreConstructor>(Store: T): Store<InstanceType<T>> {
  // const component = useComponent();
  const env: Env = useEnv();
  const container = getDependencyContainer(env);
  const store = container.get(Store);
  return renderOnMethodCall(Store, store);
}

export function useLocalStore<T extends LocalStoreConstructor<any>>(
  Store: T,
  ...args: StoreParams<T>
): Store<InstanceType<T>> {
  const env = useEnv();
  const container = getDependencyContainer(env);
  const store = useState(container.instantiate(Store, ...args));
  onWillUnmount(() => store.dispose());
  return renderOnMethodCall(Store, store);
}

function renderOnMethodCall(storeConstructor: any, store: any) {
  const r = useState({ i: 0 });
  const methods = getStoreMethods(storeConstructor);
  return new Proxy(store, {
    get(target, prop, receiver) {
      if (prop === "allSheetMatchesCount") {
      }
      // console.log(prop)
      const result = target[prop];
      if (typeof prop === "string" && methods.has(prop)) {
        return function (...args: any[]) {
          console.log("renderOnMethodCall", prop);
          const re = result.apply(target, args);
          r.i++;
          return re;
        };
      }
      r.i;
      console.log(prop, result);
      return result;
    },
  });
}

function getDependencyContainer(env: Env) {
  const container = env.__spreadsheet_stores__;
  if (!(container instanceof DependencyContainer)) {
    throw new Error("No store provider found. Did you forget to call useStoreProvider()?");
  }
  return container;
}
