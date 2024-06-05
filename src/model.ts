import { markRaw } from "@odoo/owl";
import { LocalTransportService } from "./collaborative/local_transport_service";
import { Session } from "./collaborative/session";
import { DEFAULT_REVISION_ID, Status } from "./constants";
import { CoreModel } from "./core_model";
import { EventBus } from "./helpers/event_bus";
import { UuidGenerator, deepCopy } from "./helpers/index";
import { createEmptyExcelWorkbookData, load, repairInitialMessages } from "./migrations/data";
import { BasePlugin } from "./plugins/base_plugin";
import { featurePluginRegistry, statefulUIPluginRegistry } from "./plugins/index";
import { UIPlugin, UIPluginConfig, UIPluginConstructor } from "./plugins/ui_plugin";
import {
  SelectionStreamProcessor,
  SelectionStreamProcessorImpl,
} from "./selection_stream/selection_stream_processor";
import { _t } from "./translation";
import { StateUpdateMessage, TransportService } from "./types/collaborative/transport_service";
import { FileStore } from "./types/files";
import {
  Client,
  ClientPosition,
  Color,
  Command,
  CommandDispatcher,
  CommandHandler,
  CommandResult,
  CommandTypes,
  CoreCommand,
  Currency,
  DEFAULT_LOCALES,
  DispatchResult,
  Format,
  Getters,
  GridRenderingContext,
  InformationNotification,
  LayerName,
  LocalCommand,
  Locale,
  UID,
  canExecuteInReadonly,
  isCoreCommand,
} from "./types/index";
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
  mode: Mode;
  /**
   * Any external custom dependencies your custom plugins or functions might need.
   * They are available in plugins config and functions
   * evaluation context.
   */
  readonly custom: Readonly<{
    [key: string]: any;
  }>;
  readonly defaultCurrencyFormat?: Format;
  /**
   * External dependencies required to enable some features
   * such as uploading images.
   */
  readonly external: Readonly<ModelExternalConfig>;
  readonly moveClient: (position: ClientPosition) => void;
  readonly transportService: TransportService;
  readonly client: Client;
  readonly snapshotRequested: boolean;
  readonly notifyUI: (payload: InformationNotification) => void;
  readonly raiseBlockingErrorUI: (text: string) => void;
  readonly customColors: Color[];
}

export interface ModelExternalConfig {
  readonly fileStore?: FileStore;
  readonly loadCurrencies?: () => Promise<Currency[]>;
  readonly loadLocales?: () => Promise<Locale[]>;
}

export class Model extends EventBus<any> implements CommandDispatcher {
  private coreModel: CoreModel;

  private readonly session: Session;

  /**
   * A plugin can draw some contents on the canvas. But even better: it can do
   * so multiple times.  The order of the render calls will determine a list of
   * "layers" (i.e., earlier calls will be obviously drawn below later calls).
   * This list simply keeps the renderers+layer information so the drawing code
   * can just iterate on it
   */
  private renderers: Partial<Record<LayerName, UIPlugin[]>> = {};

  /**
   * Internal status of the model. Important for command handling coordination
   */
  private status: Status = Status.Ready;

  /**
   * The config object contains some configuration flag and callbacks
   */
  readonly config: ModelConfig;
  private uiPluginConfig: UIPluginConfig;

  readonly selection: SelectionStreamProcessor;

  /**
   * Getters are the main way the rest of the UI read data from the model. Also,
   * it is shared between all plugins, so they can also communicate with each
   * other.
   */
  getters: Getters;

  uuidGenerator: UuidGenerator;

  private readonly handlers: CommandHandler<Command>[] = [];
  private readonly uiHandlers: CommandHandler<Command>[] = [];

  constructor(
    data: any = {},
    config: Partial<ModelConfig> = {},
    stateUpdateMessages: StateUpdateMessage[] = [],
    uuidGenerator: UuidGenerator = new UuidGenerator(),
    verboseImport = true
  ) {
    super();
    // mark all models as "raw", so they will not be turned into reactive objects
    // by owl, since we do not rely on reactivity
    markRaw(this);

    const start = performance.now();
    console.group("Model creation");

    stateUpdateMessages = repairInitialMessages(data, stateUpdateMessages);

    const workbookData = load(data, verboseImport);

    this.uuidGenerator = uuidGenerator;
    this.config = this.setupConfig(config);

    this.getters = {
      isReadonly: () => this.config.mode === "readonly" || this.config.mode === "dashboard",
      isDashboard: () => this.config.mode === "dashboard",
    } as Getters;

    this.coreModel = new CoreModel({
      workbookData,
      dispatchToUi: this.dispatchToUi.bind(this),
      canDispatch: this.canDispatch,
      uuidGenerator: this.uuidGenerator,
      custom: this.config.custom,
      external: this.config.external,
      customColors: config.customColors,
    });

    this.session = this.setupSession(workbookData.revisionId);

    this.uuidGenerator.setIsFastStrategy(true);

    // Initiate stream processor
    this.selection = new SelectionStreamProcessorImpl(this.getters);
    this.uiPluginConfig = this.setupUiPluginConfig();

    this.coreModel.addPluginsTo(this.handlers);
    this.coreModel.import(workbookData);

    Object.assign(this.getters, this.coreModel.coreGetters);

    this.session.loadInitialMessages(stateUpdateMessages);

    this.coreModel.setupCoreUiPlugins(this.getters, this.handlers, this.uiHandlers, this.dispatch);

    for (let Plugin of statefulUIPluginRegistry.getAll()) {
      const plugin = this.setupUiPlugin(Plugin);
      this.handlers.push(plugin);
      this.uiHandlers.push(plugin);
    }
    for (let Plugin of featurePluginRegistry.getAll()) {
      const plugin = this.setupUiPlugin(Plugin);
      this.handlers.push(plugin);
      this.uiHandlers.push(plugin);
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

    this.joinSession();

    if (config.snapshotRequested) {
      const startSnapshot = performance.now();
      console.info("Snapshot requested");
      this.session.snapshot(this.exportData());
      this.coreModel.garbageCollectExternalResources();
      console.info("Snapshot taken in", performance.now() - startSnapshot, "ms");
    }

    console.info("Model created in", performance.now() - start, "ms");
    console.groupEnd();
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
    for (const layer of Plugin.layers) {
      if (!this.renderers[layer]) {
        this.renderers[layer] = [];
      }
      this.renderers[layer]!.push(plugin);
    }
    return plugin;
  }

  private onRemoteRevisionReceived({ commands }: { commands: readonly CoreCommand[] }) {
    for (let command of commands) {
      const previousStatus = this.status;
      this.status = Status.RunningCore;
      this.dispatchToUi(command);
      this.status = previousStatus;
    }
    this.finalize();
  }

  private setupSession(initialRevisionId: UID): Session {
    const revisionLog = this.coreModel.buildRevisionLog(initialRevisionId);
    return new Session(revisionLog, this.config.transportService, initialRevisionId);
  }

  private setupSessionEvents() {
    this.session.on("remote-revision-received", this, this.onRemoteRevisionReceived);
    this.session.on("revision-undone", this, ({ commands }) => {
      this.coreModel.dispatchFromCorePlugin("UNDO", { commands });
      this.finalize();
    });
    this.session.on("revision-redone", this, ({ commands }) => {
      this.coreModel.dispatchFromCorePlugin("REDO", { commands });
      this.finalize();
    });
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
      name: _t("Anonymous").toString(),
    };
    const transportService = config.transportService || new LocalTransportService();
    return {
      ...config,
      mode: config.mode || "normal",
      custom: config.custom || {},
      external: this.setupExternalConfig(config.external || {}),
      transportService,
      client,
      moveClient: () => {},
      snapshotRequested: false,
      notifyUI: (payload) => this.trigger("notify-ui", payload),
      raiseBlockingErrorUI: (text) => this.trigger("raise-error-ui", { text }),
      customColors: config.customColors || [],
    };
  }

  private setupExternalConfig(external: Partial<ModelExternalConfig>): ModelExternalConfig {
    const loadLocales = external.loadLocales || (() => Promise.resolve(DEFAULT_LOCALES));
    return {
      ...external,
      loadLocales,
    };
  }

  private setupUiPluginConfig(): UIPluginConfig {
    return {
      getters: this.getters,
      dispatch: this.dispatch,
      canDispatch: this.canDispatch,
      selection: this.selection,
      moveClient: this.session.move.bind(this.session),
      custom: this.config.custom,
      uiActions: this.config,
      session: this.session,
      defaultCurrencyFormat: this.config.defaultCurrencyFormat,
    };
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  /**
   * Check if the given command is allowed by all the plugins and the history.
   */
  private checkDispatchAllowed(command: Command): DispatchResult {
    const results = isCoreCommand(command)
      ? this.coreModel.checkDispatchAllowedCoreCommand(command)
      : this.checkDispatchAllowedLocalCommand(command);
    if (results.some((r: CommandResult) => r !== CommandResult.Success)) {
      return new DispatchResult(results.flat());
    }
    return DispatchResult.Success;
  }

  private checkDispatchAllowedLocalCommand(command: LocalCommand) {
    return this.uiHandlers.map((handler) => handler.allowDispatch(command));
  }

  private finalize() {
    this.status = Status.Finalizing;
    for (const h of this.handlers) {
      h.finalize();
    }
    this.status = Status.Ready;
    this.trigger("command-finalized");
  }

  /**
   * Check if a command can be dispatched, and returns a DispatchResult object with the possible
   * reasons the dispatch failed.
   */
  canDispatch: CommandDispatcher["dispatch"] = (type: CommandTypes, payload?: any) => {
    return this.checkDispatchAllowed(createCommand(type, payload));
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
  dispatch: CommandDispatcher["dispatch"] = (type: CommandTypes, payload?: any) => {
    const command: Command = createCommand(type, payload);
    let status: Status = this.status;
    if (this.getters.isReadonly() && !canExecuteInReadonly(command)) {
      return new DispatchResult(CommandResult.Readonly);
    }
    if (!this.session.canApplyOptimisticUpdate()) {
      return new DispatchResult(CommandResult.WaitingSessionConfirmation);
    }
    switch (status) {
      case Status.Ready:
        // we are dispatching an "root" command, that is a command the is dispatch as a
        // response to a user or external event, as opposed to a command dispatched by the plugins
        // themselves while already processing a command
        const rootCommand = command;
        const result = this.checkDispatchAllowed(rootCommand);
        if (!result.isSuccessful) {
          return result;
        }
        this.status = Status.Running;
        const start = performance.now();
        const { changes, commands } = this.coreModel.startRevisionForCommand(rootCommand);
        this.dispatchToUi(rootCommand);
        this.trigger("command-dispatched", command);
        this.finalize();
        const time = performance.now() - start;
        if (time > 5) {
          console.info(type, time, "ms");
        }
        this.session.save(rootCommand, commands, changes);
        this.status = Status.Ready;
        this.trigger("update");
        break;
      case Status.Running:
        if (isCoreCommand(command)) {
          const dispatchResult = this.checkDispatchAllowed(command);
          if (!dispatchResult.isSuccessful) {
            return dispatchResult;
          }
          this.coreModel.addCommandForCurrentRevision(command);
        }
        this.dispatchToUi(command);
        this.trigger("command-dispatched", command);
        break;
      case Status.Finalizing:
        throw new Error("Cannot dispatch commands in the finalize state");
      case Status.RunningCore:
        if (isCoreCommand(command)) {
          // because core plugins have a "coreDispatcher", the only way to arrive here is a ui plugin
          // that has dispatched a core command during the processing of another command
          throw new Error(`A UI plugin cannot dispatch ${type} while handling a core command`);
        }
        this.dispatchToUi(command);
        this.trigger("command-dispatched", command);
    }
    return DispatchResult.Success;
  };

  private dispatchToUi(command: Command) {
    for (const handler of this.uiHandlers) {
      handler.beforeHandle(command);
    }
    for (const handler of this.uiHandlers) {
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
  drawLayer(context: GridRenderingContext, layer: LayerName) {
    const renderers = this.renderers[layer];
    if (!renderers) {
      return;
    }
    for (const renderer of renderers) {
      context.ctx.save();
      renderer.drawLayer(context, layer);
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
    let data = this.coreModel.exportData();
    data.revisionId = this.session.getRevisionId() || DEFAULT_REVISION_ID;
    return data;
  }

  updateMode(mode: Mode) {
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
    data = deepCopy(data);

    return getXLSX(data);
  }
}

function createCommand(type: CommandTypes, payload: any = {}): Command {
  const command = { ...payload, type };
  Object.freeze(command);
  return command;
}
