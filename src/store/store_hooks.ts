import { useEnv, useState, useSubEnv } from "@odoo/owl";
import { CQS, DependencyContainer, StoreConstructor } from "./dependency_container";

export function useStoreProvider() {
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
): CQS<InstanceType<T>> {
  // const env = env ||;
  const container = env.__spreadsheet_stores__;
  if (!(container instanceof DependencyContainer)) {
    throw new Error("No store provider found. Did you forget to call useStoreProvider() ?");
  }
  return useState(container.get(Store));
}
