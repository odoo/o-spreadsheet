import * as owl from "@odoo/owl";
import { LocalTransportService } from "./collaborative/local_transport_service";
import { Session } from "./collaborative/session";
import { DEFAULT_REVISION_ID } from "./constants";
import { DataSourceRegistry } from "./data_source";
import { DEBUG, UuidGenerator } from "./helpers/index";
import { buildRevisionLog } from "./history/factory";
import { LocalHistory } from "./history/local_history";
import {
  createEmptyExcelWorkbookData,
  createEmptyWorkbookData,
  load,
  repairInitialMessages,
} from "./migrations/data";
import { RangeAdapter } from "./plugins/core/range";
import { CorePlugin, CorePluginConstructor } from "./plugins/core_plugin";
import { corePluginRegistry, uiPluginRegistry } from "./plugins/index";
import { UIPlugin, UIPluginConstructor } from "./plugins/ui_plugin";
import { StateObserver } from "./state_observer";
import { _lt } from "./translation";
import { StateUpdateMessage, TransportService } from "./types/collaborative/transport_service";
import {
  canExecuteInReadonly,
  Client,
  ClientPosition,
  Command,
  CommandDispatcher,
  CommandHandler,
  CommandResult,
  CoreCommand,
  DispatchResult,
  EvalContext,
  Getters,
  GridRenderingContext,
  isCoreCommand,
  LAYERS,
  UID,
  WorkbookData,
} from "./types/index";
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

export type Mode = "normal" | "headless";
export interface ModelConfig {
  mode: Mode;
  openSidePanel: (panel: string, panelProps?: any) => void;
  notifyUser: (content: string) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
  editText: (title: string, placeholder: string, callback: (text: string | null) => any) => any;
  evalContext: EvalContext;
  moveClient: (position: ClientPosition) => void;
  dataSources: DataSourceRegistry<any, any>;
  transportService: TransportService;
  client: Client;
  isHeadless: boolean;
  isReadonly: boolean;
  snapshotRequested: boolean;
}

const enum Status {
  Ready,
  Running,
  RunningCore,
  Finalizing,
  Interactive,
}

export class Model extends owl.core.EventBus implements CommandDispatcher {
  private corePlugins: CorePlugin[] = [];

  private uiPlugins: UIPlugin[] = [];

  private history: LocalHistory;

  private range: RangeAdapter;

  private dataSources: DataSourceRegistry<unknown, unknown> = new DataSourceRegistry();

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

  private isLoading: boolean;
  /**
   * Internal status of the model. Important for command handling coordination
   */
  private status: Status = Status.Ready;

  /**
   * The config object contains some configuration flag and callbacks
   */
  private config: ModelConfig;

  private state: StateObserver;
  /**
   * Getters are the main way the rest of the UI read data from the model. Also,
   * it is shared between all plugins, so they can also communicate with each
   * other.
   */
  getters: Getters;

  uuidGenerator: UuidGenerator;

  constructor(
    data: any = {},
    config: Partial<ModelConfig> = {},
    stateUpdateMessages: StateUpdateMessage[] = [],
    uuidGenerator: UuidGenerator = new UuidGenerator()
  ) {
    super();
    DEBUG.model = this;

    stateUpdateMessages = repairInitialMessages(data, stateUpdateMessages);

    const workbookData = load(data);

    this.state = new StateObserver();

    this.uuidGenerator = uuidGenerator;

    this.config = this.setupConfig(config);

    this.session = this.setupSession(workbookData.revisionId);

    this.config.moveClient = this.session.move.bind(this.session);

    this.history = new LocalHistory(this.dispatchFromCorePlugin, this.session);

    this.getters = {
      isReadonly: () => this.config.isReadonly,
      canUndo: this.history.canUndo.bind(this.history),
      canRedo: this.history.canRedo.bind(this.history),
      getClient: this.session.getClient.bind(this.session),
      getConnectedClients: this.session.getConnectedClients.bind(this.session),
      isFullySynchronized: this.session.isFullySynchronized.bind(this.session),
    } as Getters;

    this.range = new RangeAdapter(this.getters);
    this.getters.getRangeString = this.range.getRangeString.bind(this.range);
    this.getters.getRangeFromSheetXC = this.range.getRangeFromSheetXC.bind(this.range);
    this.getters.createAdaptedRanges = this.range.createAdaptedRanges.bind(this.range);

    this.uuidGenerator.setIsFastStrategy(true);
    // registering plugins
    for (let Plugin of corePluginRegistry.getAll()) {
      this.setupCorePlugin(Plugin, workbookData);
    }

    for (let Plugin of uiPluginRegistry.getAll()) {
      this.setupUiPlugin(Plugin);
    }

    this.uuidGenerator.setIsFastStrategy(false);

    // starting plugins
    this.dispatch("START");

    // move in "Loading" mode where we ignore redundant calls to finalize triggered by the
    // replay of stateUpdateMessages in the session
    this.isLoading = true;

    // This should be done after construction of LocalHistory due to order of
    // events
    this.setupSessionEvents();

    // Load the initial revisions
    this.session.loadInitialMessages(stateUpdateMessages);
    this.joinSession(config.client);

    if (config.snapshotRequested) {
      this.session.snapshot(this.exportData());
    }

    this.isLoading = false;
    // ensure propre recomputation of plugin states after the message replays
    this.finalize();
  }

  get handlers(): CommandHandler<Command>[] {
    return [this.range, ...this.corePlugins, ...this.uiPlugins, this.history];
  }

  joinSession(client?: Client) {
    this.session.join(client);
  }

  leaveSession() {
    this.session.leave();
  }

  destroy() {
    delete DEBUG.model;
  }

  private setupUiPlugin(Plugin: UIPluginConstructor) {
    if (Plugin.modes.includes(this.config.mode)) {
      const plugin = new Plugin(this.getters, this.state, this.dispatch, this.config);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.uiPlugins.push(plugin);
      const layers = Plugin.layers.map((l) => [plugin, l] as [UIPlugin, LAYERS]);
      this.renderers.push(...layers);
      this.renderers.sort((p1, p2) => p1[1] - p2[1]);
    }
  }

  /**
   * Initialize and properly configure a plugin.
   *
   * This method is private for now, but if the need arise, there is no deep
   * reason why the model could not add dynamically a plugin while it is running.
   */
  private setupCorePlugin(Plugin: CorePluginConstructor, data: WorkbookData) {
    if (Plugin.modes.includes(this.config.mode)) {
      const plugin = new Plugin(
        this.getters,
        this.state,
        this.range,
        this.dispatchFromCorePlugin,
        this.config,
        this.uuidGenerator
      );
      plugin.import(data);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.corePlugins.push(plugin);
    }
  }

  private onRemoteRevisionReceived({ commands }: { commands: CoreCommand[] }) {
    for (let command of commands) {
      const previousStatus = this.status;
      this.status = Status.RunningCore;
      this.dispatchToHandlers(this.uiPlugins, command);
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
          this.dispatchToHandlers([this.range, ...this.corePlugins], command);
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
      mode: config.mode || "normal",
      openSidePanel: config.openSidePanel || (() => {}),
      notifyUser: config.notifyUser || (() => {}),
      askConfirmation: config.askConfirmation || (() => {}),
      editText: config.editText || (() => {}),
      evalContext: config.evalContext || {},
      transportService,
      client,
      moveClient: () => {},
      isHeadless: config.mode === "headless" || false,
      isReadonly: config.isReadonly || false,
      snapshotRequested: false,
      dataSources: this.dataSources,
    };
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  /**
   * Check if the given command is allowed by all the plugins and the history.
   */
  private checkDispatchAllowed(command: Command): DispatchResult {
    const results = this.handlers.map((handler) => handler.allowDispatch(command));
    if (results.some((r) => r !== CommandResult.Success)) {
      return new DispatchResult(results.flat());
    }
    return DispatchResult.Success;
  }

  private finalize() {
    if (this.isLoading) {
      return;
    }
    this.status = Status.Finalizing;
    for (const h of this.handlers) {
      h.finalize();
    }
    this.status = Status.Ready;
  }

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
    const command: Command = { type, ...payload };
    let status: Status = command.interactive ? Status.Interactive : this.status;
    if (this.config.isReadonly && !canExecuteInReadonly(command)) {
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
        if (this.config.mode !== "headless") {
          this.trigger("update");
        }
        break;
      case Status.Running:
        if (isCoreCommand(command)) {
          const dispatchResult = this.checkDispatchAllowed(command);
          if (!dispatchResult.isSuccessful) {
            return dispatchResult;
          }
          this.state.addCommand(command);
          this.dispatchToHandlers(this.handlers, command);
        } else {
          this.dispatchToHandlers(this.handlers, command);
        }
        break;
      case Status.Interactive:
        if (isCoreCommand(command)) {
          this.state.addCommand(command);
        }
        this.dispatchToHandlers(this.handlers, command);
        break;
      case Status.Finalizing:
        throw new Error(_lt("Cannot dispatch commands in the finalize state"));
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
    const command: Command = { type, ...payload };
    const previousStatus = this.status;
    this.status = Status.RunningCore;
    const handlers = this.isReplayingCommand ? [this.range, ...this.corePlugins] : this.handlers;
    this.dispatchToHandlers(handlers, command);
    this.status = previousStatus;
    return DispatchResult.Success;
  };

  /**
   * Dispatch the given command to the given handlers.
   * It will call `beforeHandle` and `handle`
   */
  private dispatchToHandlers(handlers: CommandHandler<Command>[], command: Command) {
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
    context.viewport = this.getters.getActiveSnappedViewport(); //snaped one
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

  /**
   * Change the configuration of the model to put it in readonly or read-write mode
   * @param isReadonly
   */
  updateReadOnly(isReadonly: undefined | boolean) {
    if (isReadonly) {
      this.dispatch("STOP_EDITION", { cancel: true });
    }
    this.config.isReadonly = isReadonly || false;
  }

  /**
   * Wait until all cells that depends on dataSources in spreadsheet are computed
   */
  waitForIdle(): Promise<unknown[]> {
    return this.dataSources.waitForReady();
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
  async exportXLSX(): Promise<XLSXExport> {
    await this.waitForIdle();
    this.dispatch("EVALUATE_ALL_SHEETS");
    let data = createEmptyExcelWorkbookData();
    for (let handler of this.handlers) {
      if (handler instanceof CorePlugin) {
        handler.exportForExcel(data);
      }
    }
    data = JSON.parse(JSON.stringify(data));

    return getXLSX(data);
  }
}
