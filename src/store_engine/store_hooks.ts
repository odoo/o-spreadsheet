import { onWillUnmount, status, useComponent, useEnv, useSubEnv } from "@odoo/owl";
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
    getStore: <T extends StoreConstructor>(Store: T) => {
      const store = container.get(Store);
      return proxifyStoreMutation(store, () => container.trigger("store-updated"));
    },
  });
  return container;
}

type Env = ReturnType<typeof useEnv>;

/**
 * Get the instance of a store.
 */
export function useStore<T extends StoreConstructor>(Store: T): Store<InstanceType<T>> {
  const env: Env = useEnv();
  const container = getDependencyContainer(env);
  const store = container.get(Store);
  return useStoreRenderProxy(container, store);
}

export function useLocalStore<T extends LocalStoreConstructor<any>>(
  Store: T,
  ...args: StoreParams<T> extends never ? [] : StoreParams<T>
): Store<InstanceType<T>> {
  const env = useEnv();
  const container = getDependencyContainer(env);
  const store = container.instantiate(Store, ...args);
  onWillUnmount(() => store.dispose());
  return useStoreRenderProxy(container, store);
}

/**
 * Trigger an event to re-render the app (deep render) when
 * a store is mutated by invoking one of its mutator methods.
 */
function useStoreRenderProxy<S extends { mutators: readonly (keyof S)[] }>(
  container: DependencyContainer,
  store: S
): S {
  const component = useComponent();
  const proxy = proxifyStoreMutation(store, () => {
    if (status(component) === "mounted") {
      container.trigger("store-updated");
    }
  });
  return proxy as S;
}

/**
 * Creates a proxied version of a store object with mutation tracking.
 * Whenever a mutator method of the store is called, the provided callback function is invoked.
 */
export function proxifyStoreMutation<S extends { mutators: readonly (keyof S)[] }>(
  store: S,
  callback: () => void
): S {
  const proxy = new Proxy(store as object, {
    get(target, property, receiver) {
      const thisStore = target;
      // The third argument is `thisStore` (target) instead of `receiver`.
      // The goal is to always have the same `this` value in getter functions
      // (when `target[property]` is an accessor property).
      // `thisStore` is always the same object reference. `receiver` however is the
      // object on which the property is called, which is the Proxy object which is different for each component.
      const value = Reflect.get(target, property, thisStore);
      if (store.mutators?.includes(property as keyof S)) {
        const functionProxy = new Proxy(value, {
          // trap the function call
          apply(target, thisArg, argArray) {
            Reflect.apply(target, thisStore, argArray);
            callback();
          },
        });
        return functionProxy;
      }
      return value;
    },
  });
  return proxy as S;
}

function getDependencyContainer(env: Env) {
  const container = env.__spreadsheet_stores__;
  if (!(container instanceof DependencyContainer)) {
    throw new Error("No store provider found. Did you forget to call useStoreProvider()?");
  }
  return container;
}
