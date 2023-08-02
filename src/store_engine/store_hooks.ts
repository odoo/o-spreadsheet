import { onWillUnmount, useEnv, useState, useSubEnv } from "@odoo/owl";
import { DependencyContainer } from "./dependency_container";
import { DisposableStoreConstructor, Store, StoreConstructor, StoreParameters } from "./store";

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

/**
 * Get the instance of a store.
 */
export function useStore<T extends StoreConstructor>(Store: T): Store<InstanceType<T>> {
  const env: Env = useEnv();
  const container = getDependencyContainer(env);
  return useState(container.get(Store));
}

// useComponentStore ?
export function useLocalStore<T extends DisposableStoreConstructor>(
  Store: T,
  ...args: StoreParameters<T>
): Store<InstanceType<T>> {
  const env = useEnv();
  const container = getDependencyContainer(env);
  const store = container.instantiate(Store, ...args);
  onWillUnmount(() => store.dispose());
  return useState(store);
}

function getDependencyContainer(env: Env) {
  const container = env.__spreadsheet_stores__;
  if (!(container instanceof DependencyContainer)) {
    throw new Error("No store provider found. Did you forget to call useStoreProvider()?");
  }
  return container;
}
