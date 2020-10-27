import * as owl from "@odoo/owl";
import { BasePlugin } from "./base_plugin";
import { createEmptyWorkbookData, load } from "./data";
import { WHistory } from "./history";
import { pluginRegistry } from "./plugins/index";
import {
  CommandDispatcher,
  CommandHandler,
  Getters,
  Command,
  WorkbookData,
  GridRenderingContext,
  LAYERS,
  CommandSuccess,
  EvalContext,
} from "./types/index";
import { _lt } from "./translation";
import { DEBUG } from "./helpers/index";
import { GlobalCRDT } from "./crdt_datatypes/global";

/**
 * Model
 *
 * The Model class is the owner of the state of the Spreadsheet. However, it
 * has more a coordination role: it defers the actual state manipulation work to
 * plugins.
 *
 * At creation, the Model instantiates all necessary plugins.  They each have
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

export type Mode = "normal" | "headless" | "readonly";
export interface ModelConfig {
  mode: Mode;
  openSidePanel: (panel: string, panelProps?: any) => void;
  notifyUser: (content: string) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
  editText: (title: string, placeholder: string, callback: (text: string | null) => any) => any;
  evalContext: EvalContext;
  sendCommand: (data) => Promise<void>;
}

const enum Status {
  Ready,
  Running,
  Finalizing,
  Interactive,
}

export class Model extends owl.core.EventBus implements CommandDispatcher {
  /**
   * Handlers are classes that can handle a command. In practice, this is
   * basically a list of all plugins and the history manager (not a plugin)
   */
  private handlers: CommandHandler[];

  /**
   * A plugin can draw some contents on the canvas. But even better: it can do
   * so multiple times.  The order of the render calls will determine a list of
   * "layers" (i.e., earlier calls will be obviously drawn below later calls).
   * This list simply keeps the renderers+layer information so the drawing code
   * can just iterate on it
   */
  private renderers: [BasePlugin, LAYERS][] = [];

  /**
   * Internal status of the model. Important for command handling coordination
   */
  private status: Status = Status.Ready;

  /**
   * The config object contains some configuration flag and callbacks
   */
  private config: ModelConfig;

  private globalCRDT: GlobalCRDT;

  /**
   * Getters are the main way the rest of the UI read data from the model. Also,
   * it is shared between all plugins, so they can also communicate with each
   * other.
   */
  getters: Getters;

  constructor(datas: any = {}, config: Partial<ModelConfig> = {}) {
    super();
    DEBUG.model = this;
    const data = datas.json || {};
    const crdt = datas.crdt;
    this.globalCRDT = new GlobalCRDT(config.sendCommand || (async () => {}));

    const workbookData = load(data);
    const history = new WHistory();

    this.getters = {
      canUndo: history.canUndo.bind(history),
      canRedo: history.canRedo.bind(history),
    } as Getters;
    this.handlers = [history];

    this.config = {
      mode: config.mode || "normal",
      openSidePanel: config.openSidePanel || (() => {}),
      notifyUser: config.notifyUser || (() => {}),
      askConfirmation: config.askConfirmation || (() => {}),
      editText: config.editText || (() => {}),
      evalContext: config.evalContext || {},
      sendCommand: config.sendCommand || (async () => {}),
    };

    // registering plugins
    console.time("setupPlugin");
    for (let Plugin of pluginRegistry.getAll()) {
      this.setupPlugin(Plugin, workbookData);
    }
    if (crdt) {
      this.importCRDT(crdt);
    }
    console.timeEnd("setupPlugin");

    // starting plugins
    this.dispatch("START");
  }

  destroy() {
    delete DEBUG.model;
  }

  /**
   * Initialise and properly configure a plugin.
   *
   * This method is private for now, but if the need arise, there is no deep
   * reason why the model could not add dynamically a plugin while it is running.
   */
  private setupPlugin(Plugin: typeof BasePlugin, data: WorkbookData) {
    const dispatch = this.dispatch.bind(this);
    const history = this.handlers.find((p) => p instanceof WHistory)! as WHistory;
    if (Plugin.modes.includes(this.config.mode)) {
      this.globalCRDT.init(Plugin.name);
      const plugin = new Plugin(this.globalCRDT, this.getters, history, dispatch, this.config);
      plugin.import(data);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(_lt(`Invalid getter name: ${name} for plugin ${plugin.constructor}`));
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.handlers.push(plugin);
      const layers = Plugin.layers.map((l) => [plugin, l] as [BasePlugin, LAYERS]);
      this.renderers.push(...layers);
      this.renderers.sort((p1, p2) => p1[1] - p2[1]);
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  /**
   * The dispatch method is the only entry point to manipulate date in the model.
   * This is through this method that commands are dispatched, most of the time
   * recursively until no plugin want to react anymore.
   *
   * Small technical detail: it is defined as an arrow function.  There are two
   * reasons for this:
   * 1. this means that the dispatch method can be "detached" from the model,
   *    which is done when it is put in the environment (see the Spreadsheet
   *    component)
   * 2. This allows us to define its type by using the interface CommandDispatcher
   */
  dispatch: CommandDispatcher["dispatch"] = (type: string, payload?: any) => {
    const command: Command = Object.assign({ type }, payload);
    let status: Status = command.interactive ? Status.Interactive : this.status;
    switch (status) {
      case Status.Ready:
        for (let handler of this.handlers) {
          const allowDispatch = handler.allowDispatch(command);
          if (allowDispatch.status === "CANCELLED") {
            return allowDispatch;
          }
        }
        this.globalCRDT.transaction(() => {
          this.status = Status.Running;
          for (const h of this.handlers) {
            h.beforeHandle(command);
          }

          for (const h of this.handlers) {
            h.handle(command);
          }
          this.status = Status.Finalizing;
          for (const h of this.handlers) {
            h.finalize(command);
          }
        });
        this.status = Status.Ready;
        if (this.config.mode !== "headless") {
          this.trigger("update");
        }
        break;
      case Status.Running:
      case Status.Interactive:
        for (const h of this.handlers) {
          h.beforeHandle(command);
        }
        for (const h of this.handlers) {
          h.handle(command);
        }
        break;
      case Status.Finalizing:
        throw new Error(_lt("Nope. Don't do that"));
    }
    return { status: "SUCCESS" } as CommandSuccess;
  };

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
    context.viewport = this.getters.snapViewportToCell(context.viewport);
    for (let [renderer, layer] of this.renderers) {
      renderer.drawGrid(context, layer);
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
    const data = createEmptyWorkbookData();
    for (let handler of this.handlers) {
      if (handler instanceof BasePlugin) {
        handler.export(data);
      }
    }
    return data;
  }

  getCRDTState() {
    // return (this.handlers.find((p) => p instanceof CorePlugin)! as CorePlugin).getCRDT();
    return this.globalCRDT.getState();
  }

  crdtReceived(crdt: Uint8Array) {
    this.globalCRDT.crdtReceived(crdt);
    this.trigger("update");
  }

  importCRDT(crdt: Uint8Array) {
    this.globalCRDT.import(crdt);
    // (this.handlers.find((p) => p instanceof CorePlugin)! as CorePlugin).importCRDT(crdt);
  }
}
