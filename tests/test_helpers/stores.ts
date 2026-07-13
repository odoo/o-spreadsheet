import { props, providePlugins, Scope, xml } from "@odoo/owl";
import { Model, StoreConstructor, StoreParams } from "../../src";
import { DependencyContainer } from "../../src/store_engine/dependency_container";

import { types } from "../../src/components/props_validation";
import { spreadsheetOwlPlugins } from "../../src/components/spreadsheet/spreadsheet";
import { App, Component } from "../../src/owl3_compatibility_layer";
import { useLocalStore, useStoreProvider } from "../../src/store_engine/store_hooks";
import { ModelStore } from "../../src/stores/model_store";
import { NotificationStore } from "../../src/stores/notification_store";
import { _t } from "../../src/translation";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";
import { makeTestNotificationStore } from "./helpers";

class StoreParent extends Component<SpreadsheetChildEnv> {
  static template = xml/*xml*/ `<div/>`;
  protected props = props({
    model: types.object<Model>(),
    Store: types.function<any>(),
    storeArgs: types.array(types.any()),
    provideStore: types.function<(args: any) => void>(),
  });

  setup() {
    providePlugins(spreadsheetOwlPlugins, { model: this.props.model });

    const stores = useStoreProvider();
    stores.inject(ModelStore, this.props.model);
    stores.inject(NotificationStore, makeTestNotificationStore());

    // @ts-ignore
    const store = useLocalStore(this.props.Store, ...this.props.storeArgs);

    this.props.provideStore({
      store: store,
      container: stores,
      model: this.props.model,
      pluginManager: this.__owl__.pluginManager,
    });
  }
}

export function makeStore<T extends StoreConstructor>(Store: T, ...args: StoreParams<T>) {
  return makeStoreWithModel(new Model(), Store, ...args);
}

export function makeStoreWithModel<T extends StoreConstructor>(
  model: Model,
  Store: T,
  ...args: StoreParams<T>
): {
  store: InstanceType<T>;
  container: DependencyContainer;
  model: Model;
  pluginManager: Scope["pluginManager"];
} {
  const app = new App({ test: true, translateFn: _t });

  let storeInstance: InstanceType<T> | null = null;
  let container: DependencyContainer | null = null;
  let pluginManager: Scope["pluginManager"] | null = null;

  app.createRoot(StoreParent, {
    props: {
      model,
      Store,
      storeArgs: args,
      provideStore: (params: any) => {
        storeInstance = params.store;
        container = params.container;
        pluginManager = params.pluginManager;
      },
    },
  });

  if (!storeInstance || !container) {
    throw new Error("Failed to create store instance");
  }

  return { store: storeInstance!, container: container!, model, pluginManager: pluginManager! };
}

/**
 * Spy the method `DependencyContainer.instantiate` to keep track of all created store instances. Useful to get a local
 * store in a test, those are not directly accessible through the dependency container.
 *
 */
export function spyStoreCreation() {
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
