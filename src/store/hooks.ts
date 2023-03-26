import { useEnv, useSubEnv } from "@odoo/owl";
import { CQS, DependencyContainer, StoreConstructor } from "./dependency_container";

export function useStoreProvider() {
  const container = new DependencyContainer();
  useSubEnv({
    __spreadsheet_stores__: container,
  });
}

export function useStore<T extends StoreConstructor<any>>(Store: T): CQS<InstanceType<T>> {
  const env = useEnv();
  const container: DependencyContainer = env.__spreadsheet_stores__;
  if (!container) {
    throw new Error("No store provider found. Did you forget to call useStoreProvider() ?");
  }
  return container.get(Store);
}
