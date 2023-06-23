import { onWillUnmount, useEnv, useState, useSubEnv } from "@odoo/owl";
import {
  DependencyContainer,
  DisposableStoreConstructor,
  Store,
  StoreConstructor,
  StoreParameters,
} from "./dependency_container";

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

export function useStore<T extends StoreConstructor>(
  Store: T,
  env: Env = useEnv()
): Store<InstanceType<T>> {
  const container = getDependencyContainer(env);
  return useState(container.get(Store));
}

export function useLocalStore<T extends DisposableStoreConstructor>(
  Store: T,
  ...args: StoreParameters<T>
): Store<InstanceType<T>> {
  const env = useEnv();
  const container = getDependencyContainer(env);
  debugger;
  const store = container.instantiate(Store, ...args);
  onWillUnmount(() => store.dispose());
  return useState(store);
}

function getDependencyContainer(env: Env) {
  const container = env.__spreadsheet_stores__;
  if (!(container instanceof DependencyContainer)) {
    throw new Error("No store provider found. Did you forget to call useStoreProvider() ?");
  }
  return container;
}
