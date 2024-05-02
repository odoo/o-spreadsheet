/**
 * While Model.ts is the general model that makes the link between all moving parts
 * of spreadsheet (namely session, bus, collaborative, etc.).
 * CoreModel.ts is intended only for core and core_evaluation plugins integration.
 * As far as possible, it should have no external dependencies
 */
import { createEmptyWorkbookData } from "./migrations/data";
import { corePluginRegistry, coreViewsPluginRegistry } from "./plugins";
import { RangeAdapter } from "./plugins/core";
import { CorePlugin, CorePluginConfig, CorePluginConstructor } from "./plugins/core_plugin";
import { Registry } from "./registries/registry";
import { Command, CommandHandler, CoreCommand, CoreGetters, Getters, WorkbookData } from "./types";

export class CoreModel {
  corePlugins: CorePlugin[] = [];
  readonly coreHandlers: CommandHandler<CoreCommand>[] = [];

  readonly range: RangeAdapter;

  /**
   * Getters that are accessible from the core plugins. It's a subset of `getters`,
   * without the UI getters
   */
  coreGetters: CoreGetters;
  private options: any;

  constructor(options) {
    this.coreGetters = {} as CoreGetters;
    this.options = options;
    this.range = new RangeAdapter(this.coreGetters);
    this.coreHandlers.push(this.range);

    this.coreGetters.getRangeString = this.range.getRangeString.bind(this.range);
    this.coreGetters.getRangeFromSheetXC = this.range.getRangeFromSheetXC.bind(this.range);
    this.coreGetters.createAdaptedRanges = this.range.createAdaptedRanges.bind(this.range);
    this.coreGetters.getRangeDataFromXc = this.range.getRangeDataFromXc.bind(this.range);
    this.coreGetters.getRangeDataFromZone = this.range.getRangeDataFromZone.bind(this.range);
    this.coreGetters.getRangeFromRangeData = this.range.getRangeFromRangeData.bind(this.range);
    this.coreGetters.getRangeFromZone = this.range.getRangeFromZone.bind(this.range);
    this.coreGetters.recomputeRanges = this.range.recomputeRanges.bind(this.range);
    this.coreGetters.isRangeValid = this.range.isRangeValid.bind(this.range);
    this.coreGetters.extendRange = this.range.extendRange.bind(this.range);
    this.coreGetters.getRangesUnion = this.range.getRangesUnion.bind(this.range);
    this.coreGetters.removeRangesSheetPrefix = this.range.removeRangesSheetPrefix.bind(this.range);

    let corePluginsConfig = this.setupCorePluginConfig();
    corePluginsConfig.getters = this.coreGetters;
    corePluginsConfig.dispatch = options.dispatch;

    this.corePlugins = this.setupCorePlugins(
      corePluginRegistry,
      this.coreGetters,
      corePluginsConfig as CorePluginConfig
    );
    this.corePlugins.forEach((plugin) => {
      this.coreHandlers.push(plugin);
    });
  }

  import(data: WorkbookData) {
    for (let corePlugin of this.corePlugins) {
      corePlugin.import(data);
    }
  }

  setupCoreUiPlugins(
    allGetters: Getters,
    allHandlers: CommandHandler<Command>[],
    uiHandlers: CommandHandler<Command>[],
    dispatch
  ) {
    let corePluginsConfig = this.setupCorePluginConfig();
    corePluginsConfig.getters = allGetters;
    corePluginsConfig.dispatch = dispatch;

    const coreUiPlugins = this.setupCorePlugins(
      coreViewsPluginRegistry,
      allGetters,
      corePluginsConfig as CorePluginConfig
    );
    coreUiPlugins.forEach((x) => {
      allHandlers.push(x);
      uiHandlers.push(x);
      this.coreHandlers.push(x);
    });
  }

  /**
   * Initialize and properly configure a plugin.
   *
   * This method is private for now, but if the need arise, there is no deep
   * reason why the model could not add dynamically a plugin while it is running.
   */
  private setupCorePlugins(
    registry: Registry<CorePluginConstructor>,
    getters: CoreGetters,
    corePluginConfig: CorePluginConfig
  ): CorePlugin[] {
    return registry.getAll().map((Plugin) => {
      const plugin = new Plugin(corePluginConfig);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        if (name in getters) {
          throw new Error(`Getter "${name}" is already defined.`);
        }
        getters[name] = plugin[name].bind(plugin);
      }
      return plugin;
    });
  }

  private setupCorePluginConfig(): Partial<CorePluginConfig> {
    return {
      stateObserver: this.options.state,
      range: this.range,
      canDispatch: this.options.canDispatch,
      uuidGenerator: this.options.uuidGenerator,
      custom: this.options.custom,
      external: this.options.external,
      customColors: this.options.customColors || [],
    };
  }

  addPluginsTo(commandHandler: CommandHandler<Command>[]) {
    this.coreHandlers.forEach((plugin) => commandHandler.push(plugin));
  }

  checkDispatchAllowedCoreCommand(command: CoreCommand) {
    const results = this.corePlugins.map((handler) => handler.allowDispatch(command));
    results.push(this.range.allowDispatch(command));
    return results;
  }

  garbageCollectExternalResources() {
    for (const plugin of this.corePlugins) {
      plugin.garbageCollectExternalResources();
    }
  }

  exportData(): WorkbookData {
    let data = createEmptyWorkbookData();
    for (let corePlugin of this.corePlugins) {
      corePlugin.export(data);
    }
    return data;
  }
}
