import { Registry } from "../registries/registry";
import { StateObserver } from "../state_observer";
import { CoreCommand } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { BasePlugin } from "./base_plugin";
// /!\ Type-only imports: those modules import this one at runtime, since their
// classes extend `CoreService`. `import type` is erased at emit time, which
// keeps the dependency cycle at the type level only.
import type { FormulaProviderAggregator } from "./core/formulas_provider";
import type { RangeAdapterPlugin } from "./core/range";

export interface CoreServiceConfig {
  readonly getters: CoreGetters;
  readonly stateObserver: StateObserver;
}

export interface CoreServiceConstructor {
  new (config: CoreServiceConfig): CoreService;
  getters: readonly string[];
}

/**
 * A core service is a model-wide singleton which owns no persisted data: unlike
 * core plugins, it does not import nor export the workbook. It can however
 * expose getters and handle core commands.
 *
 * Core services are instantiated before all core plugins, and their getters are
 * bound before any plugin is created. Core plugins can therefore use them right
 * away, and register themselves against them in their constructor
 * (see `CorePlugin`).
 */
export class CoreService<State = any> extends BasePlugin<State, CoreCommand> {
  protected getters: CoreGetters;

  constructor({ getters, stateObserver }: CoreServiceConfig) {
    super(stateObserver);
    this.getters = getters;
  }
}

/**
 * The type of each core service, by key of `coreServiceRegistry`.
 */
interface CoreServiceTypes {
  range: RangeAdapterPlugin;
  formulas: FormulaProviderAggregator;
}

/**
 * The core service instances of a model. It's a registry whose `get` is typed
 * per key, so that `services.get("range")` returns a `RangeAdapterPlugin`.
 */
export class CoreServices extends Registry<CoreService> {
  get<K extends keyof CoreServiceTypes>(key: K): CoreServiceTypes[K];
  get(key: string): CoreService;
  get(key: string): CoreService {
    return super.get(key);
  }
}
