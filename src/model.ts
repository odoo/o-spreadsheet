import { markRaw } from "@odoo/owl";
import { LocalTransportService } from "./collaborative/local_transport_service";
import { Session } from "./collaborative/session";
import { DEFAULT_REVISION_ID } from "./constants";
import { EventBus } from "./helpers/event_bus";
import { deepCopy, UuidGenerator } from "./helpers/index";
import { buildRevisionLog } from "./history/factory";
import { LocalHistory } from "./history/local_history";
import {
  createEmptyExcelWorkbookData,
  createEmptyWorkbookData,
  load,
  repairInitialMessages,
} from "./migrations/data";
import { BasePlugin } from "./plugins/base_plugin";
import { RangeAdapter } from "./plugins/core/range";
import { CorePlugin, CorePluginConfig, CorePluginConstructor } from "./plugins/core_plugin";
import {
  corePluginRegistry,
  coreViewsPluginRegistry,
  featurePluginRegistry,
  statefulUIPluginRegistry,
} from "./plugins/index";
import { UIPlugin, UIPluginConfig, UIPluginConstructor } from "./plugins/ui_plugin";
import {
  SelectionStreamProcessor,
  SelectionStreamProcessorImpl,
} from "./selection_stream/selection_stream_processor";
import { StateObserver } from "./state_observer";
import { _lt } from "./translation";
import { StateUpdateMessage, TransportService } from "./types/collaborative/transport_service";
import { FileStore } from "./types/files";
import {
  canExecuteInReadonly,
  Client,
  ClientPosition,
  Command,
  CommandDispatcher,
  CommandHandler,
  CommandResult,
  CoreCommand,
  CoreGetters,
  Currency,
  DispatchResult,
  Getters,
  GridRenderingContext,
  isCoreCommand,
  LAYERS,
  LocalCommand,
  UID,
} from "./types/index";
import { NotifyUIEvent } from "./types/ui";
import { WorkbookData } from "./types/workbook_data";
import { XLSXExport } from "./types/xlsx";
import { getXLSX } from "./xlsx/xlsx_writer";

/**
 * Model
 *
 * The Model class is the owner of the state of the Spreadsheet. However, it
 * has more a coordination role: it defers the actual state manipulation work to
 * plugins.
 *
 * At creation, the Model instantiates all necessary plugins. They each have
 * a private state (for example, the Selection plugin has the current selection).
 *
 * State changes are then performed through commands.  Commands are dispatched
 * to the model, which will then relay them to each plugins (and the history
 * handler). Then, the model will trigger an 'update' event to notify whoever
 * is concerned that the command was applied (if it was not cancelled).
 *
 * Also, the model has an unconventional responsibility: it actually renders the
 * visible viewport on a canvas. This is because each plugins actually manage a
 * specific concern about the content of the spreadsheet, and it is more natural
 * if they are able to read data from their internal state to represent it on the
 * screen.
 *
 * Note that the Model can be used in a standalone way to manipulate
 * programmatically a spreadsheet.
 */

export type Mode = "normal" | "readonly" | "dashboard";

export interface ModelConfig {
  readonly mode: Mode;
  /**
   * Any external custom dependencies your custom plugins or functions might need.
   * They are available in plugins config and functions
   * evaluation context.
   */
  readonly custom: Readonly<{
    [key: string]: any;
  }>;
  /**
   * External dependencies required to enable some features
   * such as uploading images.
   */
  readonly external: Readonly<{
    readonly fileStore?: FileStore;
    readonly loadCurrencies?: () => Promise<Currency[]>;
  }>;
  readonly moveClient: (position: ClientPosition) => void;
  readonly transportService: TransportService;
  readonly client: Client;
  readonly snapshotRequested: boolean;
  readonly notifyUI: (payload: NotifyUIEvent) => void;
  readonly lazyEvaluation: boolean;
}

const enum Status {
  Ready,
  Running,
  RunningCore,
  Finalizing,
}

export class Model extends EventBus<any> implements CommandDispatcher {
  private corePlugins: CorePlugin[] = [];

  private featurePlugins: UIPlugin[] = [];

  private statefulUIPlugins: UIPlugin[] = [];

  private coreViewsPlugins: UIPlugin[] = [];

  private history: LocalHistory;

  private range: RangeAdapter;

  private session: Session;

  /**
   * In a collaborative context, some commands can be replayed, we have to ensure
   * that these commands are not replayed on the UI plugins.
   */
  private isReplayingCommand: boolean = false;

  /**
   * A plugin can draw some contents on the canvas. But even better: it can do
   * so multiple times.  The order of the render calls will determine a list of
   * "layers" (i.e., earlier calls will be obviously drawn below later calls).
   * This list simply keeps the renderers+layer information so the drawing code
   * can just iterate on it
   */
  private renderers: [UIPlugin, LAYERS][] = [];

  /**
   * Internal status of the model. Important for command handling coordination
   */
  private status: Status = Status.Ready;

  /**
   * The config object contains some configuration flag and callbacks
   */
  readonly config: ModelConfig;
  private corePluginConfig: CorePluginConfig;
  private uiPluginConfig: UIPluginConfig;

  private state: StateObserver;

  readonly selection: SelectionStreamProcessor;

  /**
   * Getters are the main way the rest of the UI read data from the model. Also,
   * it is shared between all plugins, so they can also communicate with each
   * other.
   */
  getters: Getters;

  /**
   * Getters that are accessible from the core plugins. It's a subset of `getters`,
   * without the UI getters
   */
  private coreGetters: CoreGetters;

  uuidGenerator: UuidGenerator;

  constructor(
    data: any = {},
    config: Partial<ModelConfig> = {},
    stateUpdateMessages: StateUpdateMessage[] = [],
    uuidGenerator: UuidGenerator = new UuidGenerator(),
    verboseImport = true
  ) {
    super();

    stateUpdateMessages = repairInitialMessages(data, stateUpdateMessages);

    const workbookData = load(data, verboseImport);

    this.state = new StateObserver();

    this.uuidGenerator = uuidGenerator;

    this.config = this.setupConfig(config);

    this.session = this.setupSession(workbookData.revisionId);

    this.history = new LocalHistory(this.dispatchFromCorePlugin, this.session);

    this.coreGetters = {} as CoreGetters;

    this.range = new RangeAdapter(this.coreGetters);
    this.coreGetters.getRangeString = this.range.getRangeString.bind(this.range);
    this.coreGetters.getRangeFromSheetXC = this.range.getRangeFromSheetXC.bind(this.range);
    this.coreGetters.createAdaptedRanges = this.range.createAdaptedRanges.bind(this.range);
    this.coreGetters.getRangeDataFromXc = this.range.getRangeDataFromXc.bind(this.range);
    this.coreGetters.getRangeDataFromZone = this.range.getRangeDataFromZone.bind(this.range);
    this.coreGetters.getRangeFromRangeData = this.range.getRangeFromRangeData.bind(this.range);
    this.coreGetters.getSelectionRangeString = this.range.getSelectionRangeString.bind(this.range);

    this.getters = {
      isReadonly: () => this.config.mode === "readonly" || this.config.mode === "dashboard",
      isDashboard: () => this.config.mode === "dashboard",
      canUndo: this.history.canUndo.bind(this.history),
      canRedo: this.history.canRedo.bind(this.history),
      getClient: this.session.getClient.bind(this.session),
      getConnectedClients: this.session.getConnectedClients.bind(this.session),
      isFullySynchronized: this.session.isFullySynchronized.bind(this.session),
    } as Getters;

    this.uuidGenerator.setIsFastStrategy(true);

    // Initiate stream processor
    this.selection = new SelectionStreamProcessorImpl(this.getters);

    this.corePluginConfig = this.setupCorePluginConfig();
    this.uiPluginConfig = this.setupUiPluginConfig();

    // registering plugins
    for (let Plugin of corePluginRegistry.getAll()) {
      this.setupCorePlugin(Plugin, workbookData);
    }
    Object.assign(this.getters, this.coreGetters);
    for (let Plugin of statefulUIPluginRegistry.getAll()) {
      this.statefulUIPlugins.push(this.setupUiPlugin(Plugin));
    }
    for (let Plugin of coreViewsPluginRegistry.getAll()) {
      this.coreViewsPlugins.push(this.setupUiPlugin(Plugin));
    }
    for (let Plugin of featurePluginRegistry.getAll()) {
      this.featurePlugins.push(this.setupUiPlugin(Plugin));
    }
    this.uuidGenerator.setIsFastStrategy(false);

    // starting plugins
    this.dispatch("START");
    // Model should be the last permanent subscriber in the list since he should render
    // after all changes have been applied to the other subscribers (plugins)
    this.selection.observe(this, {
      handleEvent: () => this.trigger("update"),
    });
    // This should be done after construction of LocalHistory due to order of
    // events
    this.setupSessionEvents();

    // Load the initial revisions
    this.session.loadInitialMessages(stateUpdateMessages);
    this.joinSession();

    if (config.snapshotRequested) {
      this.session.snapshot(this.exportData());
      this.garbageCollectExternalResources();
    }
    // mark all models as "raw", so they will not be turned into reactive objects
    // by owl, since we do not rely on reactivity
    markRaw(this);
  }

  get handlers(): CommandHandler<Command>[] {
    return [...this.coreHandlers, ...this.allUIPlugins, this.history];
  }

  get coreHandlers(): CommandHandler<Command>[] {
    return [this.range, ...this.corePlugins];
  }

  get allUIPlugins(): UIPlugin[] {
    return [...this.statefulUIPlugins, ...this.coreViewsPlugins, ...this.featurePlugins];
  }

  joinSession() {
    this.session.join(this.config.client);
  }

  leaveSession() {
    this.session.leave();
  }

  private setupUiPlugin(Plugin: UIPluginConstructor) {
    const plugin = new Plugin(this.uiPluginConfig);
    for (let name of Plugin.getters) {
      if (!(name in plugin)) {
        throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
      }
      if (name in this.getters) {
        throw new Error(`Getter "${name}" is already defined.`);
      }
      this.getters[name] = plugin[name].bind(plugin);
    }
    const layers = Plugin.layers.map((l) => [plugin, l] as [UIPlugin, LAYERS]);
    this.renderers.push(...layers);
    this.renderers.sort((p1, p2) => p1[1] - p2[1]);
    return plugin;
  }

  /**
   * Initialize and properly configure a plugin.
   *
   * This method is private for now, but if the need arise, there is no deep
   * reason why the model could not add dynamically a plugin while it is running.
   */
  private setupCorePlugin(Plugin: CorePluginConstructor, data: WorkbookData) {
    const plugin = new Plugin(this.corePluginConfig);
    for (let name of Plugin.getters) {
      if (!(name in plugin)) {
        throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
      }
      if (name in this.coreGetters) {
        throw new Error(`Getter "${name}" is already defined.`);
      }
      this.coreGetters[name] = plugin[name].bind(plugin);
    }
    plugin.import(data);
    this.corePlugins.push(plugin);
  }

  private onRemoteRevisionReceived({ commands }: { commands: CoreCommand[] }) {
    for (let command of commands) {
      const previousStatus = this.status;
      this.status = Status.RunningCore;
      this.dispatchToHandlers(this.statefulUIPlugins, command);
      this.status = previousStatus;
    }
    this.finalize();
  }

  private setupSession(revisionId: UID): Session {
    const session = new Session(
      buildRevisionLog(
        revisionId,
        this.state.recordChanges.bind(this.state),
        (command: CoreCommand) => {
          const result = this.checkDispatchAllowed(command);
          if (!result.isSuccessful) {
            return;
          }
          this.isReplayingCommand = true;
          this.dispatchToHandlers(
            [this.range, ...this.corePlugins, ...this.coreViewsPlugins],
            command
          );
          this.isReplayingCommand = false;
        }
      ),
      this.config.transportService,
      revisionId
    );
    return session;
  }

  private setupSessionEvents() {
    this.session.on("remote-revision-received", this, this.onRemoteRevisionReceived);
    this.session.on("revision-redone", this, this.finalize);
    this.session.on("revision-undone", this, this.finalize);
    // How could we improve communication between the session and UI?
    // It feels weird to have the model piping specific session events to its own bus.
    this.session.on("unexpected-revision-id", this, () => this.trigger("unexpected-revision-id"));
    this.session.on("collaborative-event-received", this, () => {
      this.trigger("update");
    });
  }

  private setupConfig(config: Partial<ModelConfig>): ModelConfig {
    const client = config.client || {
      id: this.uuidGenerator.uuidv4(),
      name: _lt("Anonymous").toString(),
    };
    const transportService = config.transportService || new LocalTransportService();
    return {
      ...config,
      mode: config.mode || "normal",
      custom: config.custom || {},
      external: config.external || {},
      transportService,
      client,
      moveClient: () => {},
      snapshotRequested: false,
      notifyUI: (payload: NotifyUIEvent) => this.trigger("notify-ui", payload),
      lazyEvaluation: "lazyEvaluation" in config ? config.lazyEvaluation! : true,
    };
  }

  private setupCorePluginConfig(): CorePluginConfig {
    return {
      getters: this.coreGetters,
      stateObserver: this.state,
      range: this.range,
      dispatch: this.dispatchFromCorePlugin,
      uuidGenerator: this.uuidGenerator,
      custom: this.config.custom,
      external: this.config.external,
    };
  }

  private setupUiPluginConfig(): UIPluginConfig {
    return {
      getters: this.getters,
      stateObserver: this.state,
      dispatch: this.dispatch,
      selection: this.selection,
      moveClient: this.session.move.bind(this.session),
      custom: this.config.custom,
      uiActions: this.config,
      lazyEvaluation: this.config.lazyEvaluation,
    };
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  /**
   * Check if the given command is allowed by all the plugins and the history.
   */
  private checkDispatchAllowed(command: Command): DispatchResult {
    if (isCoreCommand(command)) {
      return this.checkDispatchAllowedCoreCommand(command);
    }
    return this.checkDispatchAllowedLocalCommand(command);
  }

  private checkDispatchAllowedCoreCommand(command: CoreCommand): DispatchResult {
    const results = this.coreHandlers.map((handler) => handler.allowDispatch(command));
    return new DispatchResult(results.flat());
  }

  private checkDispatchAllowedLocalCommand(command: LocalCommand): DispatchResult {
    const results = this.handlers.map((handler) => handler.allowDispatch(command));
    return new DispatchResult(results.flat());
  }

  private finalize() {
    this.status = Status.Finalizing;
    for (const h of this.handlers) {
      h.finalize();
    }
    this.status = Status.Ready;
  }

  /**
   * Check if a command can be dispatched, and returns a DispatchResult object with the possible
   * reasons the dispatch failed.
   */
  canDispatch: CommandDispatcher["canDispatch"] = (type: string, payload?: any) => {
    return this.checkDispatchAllowed({ ...payload, type });
  };

  /**
   * The dispatch method is the only entry point to manipulate data in the model.
   * This is through this method that commands are dispatched most of the time
   * recursively until no plugin want to react anymore.
   *
   * CoreCommands dispatched from this function are saved in the history.
   *
   * Small technical detail: it is defined as an arrow function.  There are two
   * reasons for this:
   * 1. this means that the dispatch method can be "detached" from the model,
   *    which is done when it is put in the environment (see the Spreadsheet
   *    component)
   * 2. This allows us to define its type by using the interface CommandDispatcher
   */
  dispatch: CommandDispatcher["dispatch"] = (type: string, payload?: any) => {
    const command: Command = { ...payload, type };
    let status: Status = this.status;
    if (this.getters.isReadonly() && !canExecuteInReadonly(command)) {
      return new DispatchResult(CommandResult.Readonly);
    }
    if (!this.session.canApplyOptimisticUpdate()) {
      return new DispatchResult(CommandResult.WaitingSessionConfirmation);
    }
    switch (status) {
      case Status.Ready:
        const result = this.checkDispatchAllowed(command);
        if (!result.isSuccessful) {
          return result;
        }
        this.status = Status.Running;
        const { changes, commands } = this.state.recordChanges(() => {
          if (isCoreCommand(command)) {
            this.state.addCommand(command);
          }
          this.dispatchToHandlers(this.handlers, command);
          this.finalize();
        });
        this.session.save(commands, changes);
        this.status = Status.Ready;
        this.trigger("update");
        break;
      case Status.Running:
        if (isCoreCommand(command)) {
          const dispatchResult = this.checkDispatchAllowed(command);
          if (!dispatchResult.isSuccessful) {
            return dispatchResult;
          }
          this.state.addCommand(command);
        }
        this.dispatchToHandlers(this.handlers, command);
        break;
      case Status.Finalizing:
        throw new Error("Cannot dispatch commands in the finalize state");
      case Status.RunningCore:
        if (isCoreCommand(command)) {
          throw new Error(`A UI plugin cannot dispatch ${type} while handling a core command`);
        }
        this.dispatchToHandlers(this.handlers, command);
    }
    return DispatchResult.Success;
  };

  /**
   * Dispatch a command from a Core Plugin (or the History).
   * A command dispatched from this function is not added to the history.
   */
  private dispatchFromCorePlugin: CommandDispatcher["dispatch"] = (type: string, payload?: any) => {
    const command: Command = { ...payload, type };
    const previousStatus = this.status;
    this.status = Status.RunningCore;
    const handlers = this.isReplayingCommand
      ? [this.range, ...this.corePlugins, ...this.coreViewsPlugins]
      : this.handlers;
    this.dispatchToHandlers(handlers, command);
    this.status = previousStatus;
    return DispatchResult.Success;
  };

  /**
   * Dispatch the given command to the given handlers.
   * It will call `beforeHandle` and `handle`
   */
  private dispatchToHandlers(handlers: CommandHandler<Command>[], command: Command) {
    command = deepCopy(command);
    for (const handler of handlers) {
      handler.beforeHandle(command);
    }
    for (const handler of handlers) {
      handler.handle(command);
    }
  }

  // ---------------------------------------------------------------------------
  // Grid Rendering
  // ---------------------------------------------------------------------------

  /**
   * When the Grid component is ready (= mounted), it has a reference to its
   * canvas and need to draw the grid on it.  This is then done by calling this
   * method, which will dispatch the call to all registered plugins.
   *
   * Note that nothing prevent multiple grid components from calling this method
   * each, or one grid component calling it multiple times with a different
   * context. This is probably the way we should do if we want to be able to
   * freeze a part of the grid (so, we would need to render different zones)
   */
  drawGrid(context: GridRenderingContext) {
    // we make sure here that the viewport is properly positioned: the offsets
    // correspond exactly to a cell
    for (let [renderer, layer] of this.renderers) {
      context.ctx.save();
      renderer.drawGrid(context, layer);
      context.ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Data Export
  // ---------------------------------------------------------------------------

  /**
   * As the name of this method strongly implies, it is useful when we need to
   * export date out of the model.
   */
  exportData(): WorkbookData {
    let data = createEmptyWorkbookData();
    for (let handler of this.handlers) {
      if (handler instanceof CorePlugin) {
        handler.export(data);
      }
    }
    data.revisionId = this.session.getRevisionId() || DEFAULT_REVISION_ID;
    data = JSON.parse(JSON.stringify(data));
    return data;
  }

  updateMode(mode: Mode) {
    if (mode !== "normal") {
      this.dispatch("STOP_EDITION", { cancel: true });
    }
    // @ts-ignore For testing purposes only
    this.config.mode = mode;
    this.trigger("update");
  }

  /**
   * Exports the current model data into a list of serialized XML files
   * to be zipped together as an *.xlsx file.
   *
   * We need to trigger a cell revaluation  on every sheet and ensure that even
   * async functions are evaluated.
   * This prove to be necessary if the client did not trigger that evaluation in the first place
   * (e.g. open a document with several sheet and click on download before visiting each sheet)
   */
  exportXLSX(): XLSXExport {
    this.dispatch("EVALUATE_CELLS");
    let data = createEmptyExcelWorkbookData();
    for (let handler of this.handlers) {
      if (handler instanceof BasePlugin) {
        handler.exportForExcel(data);
      }
    }
    data = JSON.parse(JSON.stringify(data));

    return getXLSX(data);
  }

  garbageCollectExternalResources() {
    for (const plugin of this.corePlugins) {
      plugin.garbageCollectExternalResources();
    }
  }
}
