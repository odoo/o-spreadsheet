import { PluginConstructor, providePlugins, Scope, useProps, useScope, xml } from "@odoo/owl";
import { createGetPluginFunctionFromScope } from "../../src/components/os_component";
import { types } from "../../src/components/props_validation";
import { App, Component } from "../../src/owl3_compatibility_layer";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { useStoreProvider } from "../../src/store_engine/store_hooks";
import { _t } from "../../src/translation";
import { OwlPluginGetter } from "../../src/types/spreadsheet_env";

/**
 * While we have a mic of owl plugins and stores, some stores use owl plugins with usePlugin called inside
 * their constructor. This only works if the store is created inside an owl scope.
 *
 * This helper change the container to a proxy where every of its method is called inside the given scope.
 */
export function scopeDependencyContainer(scope: Scope, container: DependencyContainer) {
  return new Proxy(container, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === "function") {
        return (...args: unknown[]) => scope.run(() => value.apply(target, args));
      }

      return value;
    },
  }) as typeof container;
}

class PluginParent extends Component {
  static template = xml/*xml*/ `<div/>`;
  protected props = useProps({
    providedPlugins: types.array<PluginConstructor>(),
    registerCallback: types.function<(args: any) => void>(),
  });

  setup() {
    providePlugins(this.props.providedPlugins);

    const scope = useScope();
    const getPlugin = createGetPluginFunctionFromScope(scope);
    const container: DependencyContainer = useStoreProvider();

    this.props.registerCallback({ getPlugin, scope, container });
  }
}

export function makeOwlPluginManager(providedPlugins: PluginConstructor[]): {
  getPlugin: OwlPluginGetter;
  scope: Scope;
  container: DependencyContainer;
} {
  const app = new App({ test: true, translateFn: _t });

  let getPlugin: OwlPluginGetter | undefined = undefined;
  let scope: Scope | undefined = undefined;
  let container: DependencyContainer | undefined = undefined;

  app.createRoot(PluginParent, {
    props: {
      providedPlugins: providedPlugins,
      registerCallback: (params: any) => {
        getPlugin = params.getPlugin;
        scope = params.scope;
        container = params.container;
      },
    },
  });

  if (!getPlugin || !scope || !container) {
    throw new Error("Failed to create owl plugin container");
  }

  container = scopeDependencyContainer(scope, container);

  return { getPlugin, scope, container };
}
