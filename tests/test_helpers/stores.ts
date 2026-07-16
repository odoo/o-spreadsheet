import { Model, StoreConstructor, StoreParams, UID, Zone } from "../../src";
import { recomputeZones } from "../../src/helpers/recompute_zones";
import { toZone } from "../../src/helpers/zones";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { GridRenderer } from "../../src/stores/grid_renderer_store";

import { ModelStore } from "../../src/stores/model_store";
import { NotificationStore } from "../../src/stores/notification_store";
import { registerCleanup } from "../setup/jest.setup";
import { makeTestNotificationStore } from "./helpers";

export interface StoreSpy {
  getStores: (Store: StoreConstructor) => any[];
}

export function makeStore<T extends StoreConstructor>(Store: T, ...args: StoreParams<T>) {
  return makeStoreWithModel(new Model(), Store, ...args);
}

export function makeStoreWithModel<T extends StoreConstructor>(
  model: Model,
  Store: T,
  ...args: StoreParams<T>
) {
  const container = new DependencyContainer();
  registerCleanup(() => {
    container.dispose();
  });

  container.inject(ModelStore, model);
  container.inject(NotificationStore, makeTestNotificationStore());

  // Use container.get instead of container.instantiate where we can, otherwise the store won't be in the dependency
  // container, and calls to container.get will create a new instance of the store.
  // If we have args, that means the store is a local store and shouldn't be in the dependency container
  let store: InstanceType<T>;
  if (args.length > 0) {
    store = container.instantiate(Store, ...args);
  } else {
    store = container.get(Store);
  }
  return {
    store,
    container,
    model: container.get(ModelStore),
  };
}

/**
 * Spy the method `DependencyContainer.instantiate` to keep track of all created store instances. Useful to get a local
 * store in a test, those are not directly accessible through the dependency container.
 *
 */
export function spyStoreCreation(): StoreSpy {
  const storeInstances = new Map<StoreConstructor, any[]>();
  jest
    .spyOn(DependencyContainer.prototype, "instantiate")
    .mockImplementation(function (
      this: DependencyContainer,
      Store: StoreConstructor,
      ...args: StoreParams<StoreConstructor>
    ) {
      const newStoreInstance = this["factory"].build(Store, ...args);
      if (!storeInstances.has(Store)) {
        storeInstances.set(Store, []);
      }
      storeInstances.get(Store)!.push(newStoreInstance);
      newStoreInstance.onDispose?.(() => {
        const instances = storeInstances.get(Store);
        if (instances) {
          const index = instances.indexOf(newStoreInstance);
          if (index !== -1) {
            instances.splice(index, 1);
          }
        }
      });
      return newStoreInstance;
    });

  return { getStores: (Store: StoreConstructor) => storeInstances.get(Store) || [] };
}

export function getLastZonesRendered(storeSpy: StoreSpy) {
  const drawnZones: (Zone & { sheetId: UID })[] = [];
  for (const gridRenderer of storeSpy.getStores(GridRenderer) as GridRenderer[]) {
    const boxesXcs = gridRenderer["lastRenderBoxes"].keys();
    const sheetId = gridRenderer["lastRenderSheetId"]!;
    const zones = recomputeZones(Array.from(boxesXcs).map((xc) => toZone(xc)));
    drawnZones.push(...zones.map((zone) => ({ sheetId, ...zone })));
  }
  return drawnZones;
}
