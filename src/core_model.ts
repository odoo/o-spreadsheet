/**
 * While Model.ts is the general model that makes the link between all moving parts
 * of spreadsheet (namely session, bus, collaborative, etc.).
 * CoreModel.ts is intended only for core and core_evaluation plugins integration.
 * As far as possible, it should have no external dependencies
 */
import { Revision } from "./collaborative/revisions";
// import { Status } from "./constants";
import { buildRevisionLog } from "./history/factory";
import { SelectiveHistory } from "./history/selective_history";
import { createEmptyWorkbookData } from "./migrations/data";
import { corePluginRegistry, coreViewsPluginRegistry } from "./plugins";
import { RangeAdapter } from "./plugins/core";
import { CorePlugin, CorePluginConfig, CorePluginConstructor } from "./plugins/core_plugin";
import { Registry } from "./registries/registry";
import { StateObserver } from "./state_observer";
import {
  Command,
  CommandDispatcher,
  CommandHandler,
  CommandResult,
  CommandTypes,
  CoreCommand,
  CoreGetters,
  DispatchResult,
  Getters,
  UID,
  WorkbookData,
  isCoreCommand,
} from "./types";

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
  private readonly stateObserver: StateObserver;

  /**
   * In a collaborative context, some commands can be replayed, we have to ensure
   * that these commands are not replayed on the UI plugins.
   */
  private isReplayingCommand: boolean = false;
  private readonly dispatchToUi: (command: Command) => void;

  constructor(options) {
    this.coreGetters = {} as CoreGetters;
    this.stateObserver = new StateObserver();

    this.options = options;
    this.dispatchToUi = options.dispatchToUi;
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
    corePluginsConfig.dispatch = this.dispatchFromCorePlugin;

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
      stateObserver: this.stateObserver,
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

  buildRevisionLog(initialRevisionId: UID): SelectiveHistory<Revision> {
    return buildRevisionLog(
      initialRevisionId,
      this.stateObserver.recordChanges.bind(this.stateObserver),
      (command: CoreCommand) => {
        const results = this.checkDispatchAllowedCoreCommand(command);
        if (results.some((result) => result !== CommandResult.Success)) return;
        this.isReplayingCommand = true;
        this.dispatchToCore(command);
        this.isReplayingCommand = false;
      }
    );
  }

  startRevisionForCommand(command: Command) {
    return this.stateObserver.recordChanges(() => {
      if (isCoreCommand(command)) {
        this.stateObserver.addCommand(command);
      }
      this.dispatchToCore(command);
    });
  }

  addCommandForCurrentRevision(command: CoreCommand) {
    this.stateObserver.addCommand(command);
    this.dispatchToCore(command);
  }

  checkDispatchAllowedCoreCommand(command: CoreCommand) {
    const results = this.corePlugins.map((handler) => handler.allowDispatch(command));
    results.push(this.range.allowDispatch(command));
    return results;
  }

  private dispatchToCore(command: Command) {
    const isCommandCore = isCoreCommand(command);
    if (!isCommandCore) {
      return;
    }
    this.coreHandlers.forEach((handler) => {
      handler.beforeHandle(command);
    });
    this.coreHandlers.forEach((handler) => {
      handler.handle(command);
    });
  }

  /**
   * Dispatch a command from a Core Plugin (or the History).
   * A command dispatched from this function is not added to the history.
   */
  dispatchFromCorePlugin: CommandDispatcher["dispatch"] = (type: CommandTypes, payload?: any) => {
    const command = createCommand(type, payload);
    // const previousStatus = this.status;
    // this.status = Status.RunningCore;
    this.dispatchToCore(command);
    if (!this.isReplayingCommand) {
      // dispatch to ui handlers ? how ?
      this.dispatchToUi(command);
    }
    // this.status = previousStatus;
    return DispatchResult.Success;
  };
}
function createCommand(type: CommandTypes, payload: any = {}): Command {
  const command = { ...payload, type };
  Object.freeze(command);
  return command;
}
