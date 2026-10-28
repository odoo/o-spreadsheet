import { PluginConstructor, signal, usePlugin, useProps, useScope, xml } from "@odoo/owl";
import { EditionMode, StoreConstructor } from "../../src";
import { ComposerFocusStore } from "../../src/components/composer/composer_focus_store";
import {
  createGetPluginFunctionFromScope,
  useSpreadsheetEnv,
} from "../../src/components/os_component";
import { types } from "../../src/components/props_validation";
import { SidePanelStore } from "../../src/components/side_panel/side_panel/side_panel_store";
import { Spreadsheet } from "../../src/components/spreadsheet/spreadsheet";
import { useSpreadsheetProviders } from "../../src/components/spreadsheet/spreadsheet_providers";
import { batched } from "../../src/helpers/misc";
import { render } from "../../src/helpers/owl3_helpers";
import { Model } from "../../src/model";
import { App, Component, ComponentConstructor } from "../../src/owl3_compatibility_layer";
import { ModelPlugin } from "../../src/owl_plugins/model_owl_plugin";
import { NotificationPlugin } from "../../src/owl_plugins/notification_owl_plugin";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { proxifyStoreMutation, useStoreProvider } from "../../src/store_engine/store_hooks";
import { globalStores } from "../../src/store_engine/store_registries";
import { ClipboardStore } from "../../src/stores/clipboard_store";
import { ModelStore } from "../../src/stores/model_store";
import { RendererStore } from "../../src/stores/renderer_store";
import { ViewportsStore } from "../../src/stores/viewports_store";
import { _t } from "../../src/translation";
import { PropsOf } from "../../src/types/props_of";
import {
  OwlPluginGetter,
  SpreadsheetActionEnv,
  SpreadsheetChildEnv,
} from "../../src/types/spreadsheet_env";
import { Store } from "../../src/types/store_engine";
import { registerCleanup } from "../setup/jest.setup";
import { makeTestFixture, nextTick } from "./helpers";
import { makeOwlPluginManager } from "./owl_plugins_helpers";

class FakeRendererStore extends RendererStore {
  // we don't want to actually draw anything on the canvas as it cannot be tested
  draw() {
    return "noStateChange";
  }
  startAnimation() {
    return "noStateChange";
  }
  stopAnimation() {
    return "noStateChange";
  }
}

function injectFakeRendererStore(container: DependencyContainer, model: Model) {
  // the renderer store needs the model store as soon as it's built
  container.inject(ModelStore, model);
  container.inject(RendererStore, new FakeRendererStore(container.get.bind(container)));
}

/**
 * Test-only store setup, shared by every way of mounting something in tests: a fake inactive composer,
 * and the global stores instantiated.
 */
export function setupTestStores(container: DependencyContainer) {
  // For tests without the grid composer mounted, we register fake composer
  const composerFocusStore = container.get(ComposerFocusStore);
  composerFocusStore.focusComposer(
    {
      id: "mockTestComposer",
      get editionMode(): EditionMode {
        return "inactive";
      },
      startEdition: () => {},
      stopEdition: () => {},
      setCurrentContent: () => {},
    },
    { focusMode: "inactive" }
  );

  container.get(ClipboardStore); // Instantiate a clipboard store

  const sidePanelStore = container.get(SidePanelStore);
  proxifyStoreMutation(sidePanelStore, () => container.trigger("store-updated"));
  for (const store of globalStores.getAll()) {
    container.get(store);
  }
}

interface SpreadsheetActionEnvWithStores extends SpreadsheetActionEnv {
  __spreadsheet_stores__: DependencyContainer;
}

export function makeSpreadsheetActionTestEnv(
  model: Model = new Model(),
  mockEnv: Partial<SpreadsheetActionEnvWithStores & { useTrueRenderer?: boolean }> = {}
): SpreadsheetActionEnvWithStores {
  if (mockEnv.__spreadsheet_stores__) {
    throw new Error(
      "Cannot call makeSpreadsheetActionTestEnv on a partial env that already have a store container"
    );
  }

  const { getPlugin, container } = makeOwlPluginManager([], { model }, (container) => {
    if (!mockEnv.useTrueRenderer) {
      injectFakeRendererStore(container, model);
    }
  });
  setupTestStores(container);

  return {
    model: getPlugin(ModelPlugin).model,
    getStore<T extends StoreConstructor>(Store: T) {
      const store = container.get(Store);
      return proxifyStoreMutation(store, () => container.trigger("store-updated"));
    },
    // @ts-ignore
    __spreadsheet_stores__: container,
    getPlugin,
  };
}

type ComponentProps = { [key: string]: any };

function mockNotificationCallbacks() {
  usePlugin(NotificationPlugin).updateNotificationCallbacks({
    notifyUser: jest.fn(),
    raiseError: jest.fn(),
    askConfirmation: jest.fn(),
  });
}

/**
 * Minimal component to render an isolated component
 * It renders the `.o-spreadsheet` element (popover container and portal target),
 * with the exact same plugins and stores as the real Spreadsheet.
 */
class StandaloneTestComponent extends Component {
  static template = xml/*xml*/ `
    <div class="o-spreadsheet" t-ref="this.ref">
      <t t-component="this.props.childComponent" t-props="this.props.childProps"/>
    </div>
  `;
  protected props = useProps({
    childComponent: types.any(),
    childProps: types.any(),
    model: types.Model(),
  });
  ref = signal.ref();

  setup() {
    injectFakeRendererStore(useStoreProvider(), this.props.model);
    const { stores } = useSpreadsheetProviders({
      model: this.props.model,
      spreadsheetRef: this.ref,
      getPopoverContainerRect: () => ({ x: 0, y: 0, height: 1000, width: 1000 }),
    });
    setupTestStores(stores);
    mockNotificationCallbacks();
  }
}

/**
 * Root of mountSpreadsheet: it only creates the store container, to inject the fake renderer.
 * Everything else is provided by the real Spreadsheet.
 */
class SpreadsheetRoot extends Component {
  static template = xml/*xml*/ `<Spreadsheet t-props="this.props.spreadsheetProps"/>`;
  static components = { Spreadsheet };
  protected props = useProps({ spreadsheetProps: types.any() });

  setup() {
    injectFakeRendererStore(useStoreProvider(), this.props.spreadsheetProps.model);
  }
}

interface MountComponentArgs<Props extends ComponentProps> {
  props?: Props;
  model?: Model;
  fixture?: HTMLElement;
  renderOnModelUpdate?: boolean; // true by default
  providedPlugins?: PluginConstructor[];
  callbackInComponentSetup?: () => void;
}

interface MountComponentReturn {
  app: App;
  parent: Component<SpreadsheetChildEnv>;
  testRoot: Component;
  model: Model;
  fixture: HTMLElement;
  env: SpreadsheetActionEnv;
  viewStore: Store<ViewportsStore>;
  getPlugin: OwlPluginGetter;
}

export async function mountComponent<Props extends ComponentProps>(
  component: ComponentConstructor<SpreadsheetChildEnv>,
  optionalArgs: MountComponentArgs<Props> = {}
): Promise<MountComponentReturn> {
  const model = optionalArgs.model || new Model();
  return _mount(model, StandaloneTestComponent, component, optionalArgs, {
    childComponent: component,
    model,
    childProps: optionalArgs.props || ({} as Props),
  });
}

async function _mount<Props extends ComponentProps>(
  model: Model,
  rootComponent: ComponentConstructor<SpreadsheetChildEnv>,
  spiedComponent: ComponentConstructor<SpreadsheetChildEnv>,
  optionalArgs: MountComponentArgs<Props>,
  rootProps: ComponentProps
): Promise<MountComponentReturn> {
  if (jest.isMockFunction(spiedComponent.prototype.setup)) {
    (spiedComponent.prototype.setup as jest.Mock).mockRestore();
  }
  const originalSetup = spiedComponent.prototype.setup;
  let getPlugin: OwlPluginGetter | undefined = undefined;
  let env: SpreadsheetActionEnv;
  let parent: Component<SpreadsheetChildEnv> | undefined = undefined;
  const spySetup = jest
    .spyOn(spiedComponent.prototype, "setup")
    .mockImplementation(function (this: Component) {
      originalSetup.call(this);
      getPlugin = createGetPluginFunctionFromScope(useScope());
      env = useSpreadsheetEnv();
      parent = this;
      optionalArgs.callbackInComponentSetup?.call(this);
    });
  registerCleanup(() => {
    spySetup.mockRestore();
  });

  model.drawLayer = () => {};
  const app = new App({
    test: true,
    translateFn: _t,
    plugins: [...(optionalArgs.providedPlugins || [])],
  });
  const root = app.createRoot(rootComponent, { props: rootProps });
  const fixture = optionalArgs?.fixture || makeTestFixture();
  const testRoot = await root.mount(fixture);

  //@ts-ignore
  const batchedRender = batched(() => render(testRoot, true));
  if (optionalArgs.renderOnModelUpdate === undefined || optionalArgs.renderOnModelUpdate) {
    model.on("update", null, batchedRender);
  }
  // @ts-ignore
  env.__spreadsheet_stores__.on("store-updated", null, batchedRender);

  registerCleanup(() => {
    app.destroy();
    fixture.remove();
    model.off("update", null);
    // @ts-ignore
    env.__spreadsheet_stores__.off("store-updated", null);
  });
  const viewStore = env!.getStore(ViewportsStore);

  // @ts-ignore
  return { app, parent, model, fixture, env, viewStore, getPlugin, testRoot };
}

// Requires to be called wit jest realTimers
export async function mountSpreadsheet(
  props: PropsOf<Spreadsheet> = { model: new Model() }
): Promise<Omit<MountComponentReturn, "parent"> & { parent: Spreadsheet }> {
  const model = props.model;
  const spreadsheetProps = {
    notifyUser: jest.fn(),
    raiseError: jest.fn(),
    askConfirmation: jest.fn(),
    ...props,
  };
  const ret = await _mount(
    model,
    SpreadsheetRoot,
    Spreadsheet,
    { renderOnModelUpdate: false }, // handled in spreadsheet component
    { spreadsheetProps }
  );
  await nextTick();
  return { ...ret, parent: ret.parent as Spreadsheet };
}
