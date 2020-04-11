import * as owl from "@odoo/owl";
import { BasePlugin, GridRenderingContext, LAYERS } from "./base_plugin";
import { createEmptyWorkbook, createEmptyWorkbookData, load } from "./data";
import { WHistory } from "./history";
import { pluginRegistry } from "./plugins/index";
import {
  CommandDispatcher,
  CommandHandler,
  Getters,
  GridCommand,
  Workbook,
  WorkbookData
} from "./types/index";

export type Mode = "normal" | "headless" | "readonly";

export class Model extends owl.core.EventBus implements CommandDispatcher {
  private handlers: CommandHandler[];
  private renderers: [BasePlugin, LAYERS][] = [];
  private status: "ready" | "running" | "finalizing" = "ready";

  workbook: Workbook;
  history: WHistory;
  mode: Mode;

  getters: Getters;

  constructor(data: any = {}, mode: Mode = "normal") {
    super();
    (window as any).model = this; // to debug. remove this someday

    const workbookData = load(data);
    this.workbook = createEmptyWorkbook();
    this.history = new WHistory(this.workbook);

    this.getters = {
      canUndo: this.history.canUndo.bind(this.history),
      canRedo: this.history.canRedo.bind(this.history)
    } as Getters;
    this.handlers = [this.history];
    this.mode = mode;

    // registering plugins
    for (let Plugin of pluginRegistry.getAll()) {
      this.setupPlugin(Plugin, workbookData);
    }

    // starting plugins
    this.dispatch("START");
  }

  private setupPlugin(Plugin: typeof BasePlugin, data: WorkbookData) {
    const dispatch = this.dispatch.bind(this);
    if (Plugin.modes.includes(this.mode)) {
      const plugin = new Plugin(this.workbook, this.getters, this.history, dispatch, this.mode);
      plugin.import(data);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.handlers.push(plugin);
      const layers = Plugin.layers.map(l => [plugin, l] as [BasePlugin, LAYERS]);
      this.renderers.push(...layers);
      this.renderers.sort((p1, p2) => p1[1] - p2[1]);
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  dispatch: CommandDispatcher["dispatch"] = (type: string, payload?: any) => {
    const command: GridCommand = Object.assign({ type }, payload);
    switch (this.status) {
      case "ready":
        for (let handler of this.handlers) {
          let result = handler.allowDispatch(command);
          if (!result) {
            return "CANCELLED";
          }
        }
        this.status = "running";
        for (let handler of this.handlers) {
          handler.start(command);
        }
        this.handlers.forEach(h => h.handle(command));
        // finalizing
        this.status = "finalizing";
        for (let handler of this.handlers) {
          handler.finalize(command);
        }
        this.status = "ready";
        if (this.mode !== "headless") {
          this.trigger("update");
        }
        break;
      case "running":
        this.handlers.forEach(h => h.handle(command));
        break;
      case "finalizing":
        throw new Error("Nope. Don't do that");
    }
    return "COMPLETED";
  };

  // ---------------------------------------------------------------------------
  // Grid Rendering
  // ---------------------------------------------------------------------------

  drawGrid(context: GridRenderingContext) {
    // we make sure here that the viewport is properly positioned: the offsets
    // correspond exactly to a cell
    context.viewport = this.getters.getAdjustedViewport(context.viewport, "offsets");
    for (let [renderer, layer] of this.renderers) {
      renderer.drawGrid(context, layer);
    }
  }

  // ---------------------------------------------------------------------------
  // Data Export
  // ---------------------------------------------------------------------------

  exportData(): WorkbookData {
    const data = createEmptyWorkbookData();
    for (let handler of this.handlers) {
      if (handler instanceof BasePlugin) {
        handler.export(data);
      }
    }
    return data;
  }
}
