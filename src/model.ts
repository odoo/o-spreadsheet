import * as owl from "@odoo/owl";
import { createEmptyWorkbook, CURRENT_VERSION, load } from "./data";
import { CommandResult, Getters, GridCommand, UI, Workbook, WorkbookData } from "./types/index";
import { BasePlugin, CommandHandler } from "./base_plugin";
import { WHistory } from "./history";
import { ClipboardPlugin } from "./plugins/clipboard";
import { ConditionalFormatPlugin } from "./plugins/conditional_format";
import { CorePlugin } from "./plugins/core";
import { EditionPlugin } from "./plugins/edition";
import { EntityPlugin } from "./plugins/entity";
import { EvaluationPlugin } from "./plugins/evaluation";
import { FormattingPlugin } from "./plugins/formatting";
import { GridPlugin } from "./plugins/grid";
import { LayouPlugin, updateScroll, updateVisibleZone } from "./plugins/layout";
import { SelectionPlugin } from "./plugins/selection";

// -----------------------------------------------------------------------------
// Plugins
// -----------------------------------------------------------------------------

const PLUGINS = [
  CorePlugin,
  EvaluationPlugin,
  ClipboardPlugin,
  EntityPlugin,
  GridPlugin,
  FormattingPlugin,
  SelectionPlugin,
  ConditionalFormatPlugin,
  EditionPlugin,
  LayouPlugin
];

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------
export class Model extends owl.core.EventBus {
  private handlers: CommandHandler[];
  private status: "ready" | "running" | "finalizing" = "ready";

  workbook: Workbook;
  history: WHistory;
  state: UI;

  getters: Getters;

  constructor(data?: any) {
    super();
    (window as any).gridmodel = this; // to debug. remove this someday

    const workbookData = load(data);
    this.workbook = createEmptyWorkbook();
    this.history = new WHistory(this.workbook);

    this.getters = {
      canUndo: this.history.canUndo.bind(this.history),
      canRedo: this.history.canRedo.bind(this.history)
    } as Getters;
    this.handlers = [this.history];

    // Plugins
    const dispatch = this.dispatch.bind(this);
    for (let Plugin of PLUGINS) {
      const plugin = new Plugin(this.workbook, this.getters, this.history, dispatch);
      plugin.import(workbookData);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.handlers.push(plugin);
    }

    // misc
    this.state = {} as UI;
    this.dispatch({ type: "START" });
  }

  dispatch(command: GridCommand): CommandResult {
    switch (this.status) {
      case "ready":
        for (let handler of this.handlers) {
          let result = handler.canDispatch(command);
          if (!result) {
            return "CANCELLED";
          }
        }
        this.status = "running";
        for (let handler of this.handlers) {
          handler.start(command);
        }
        this._dispatch(command);
        // finalizing
        this.status = "finalizing";
        for (let handler of this.handlers) {
          handler.finalize(command);
        }
        this.status = "ready";

        Object.assign(this.state, this.getters.getUI());
        this.trigger("update");
        break;
      case "running":
        this._dispatch(command);
        break;
      case "finalizing":
        throw new Error("Nope. Don't do that");
    }
    return "COMPLETED";
  }

  private _dispatch(command: GridCommand) {
    for (let handler of this.handlers) {
      handler.handle(command);
    }
  }

  // core
  // ---------------------------------------------------------------------------
  updateVisibleZone(width, height) {
    updateVisibleZone(this.workbook, width, height);
    Object.assign(this.state, this.getters.getUI());
  }

  updateScroll(scrollTop, scrollLeft) {
    const result = updateScroll(this.workbook, scrollTop, scrollLeft);
    Object.assign(this.state, this.getters.getUI());
    return result;
  }

  // export
  // ---------------------------------------------------------------------------
  exportData(): WorkbookData {
    const data = (this.handlers[1] as CorePlugin).export();
    for (let handler of this.handlers.slice(2)) {
      if (handler instanceof BasePlugin) {
        handler.export(data);
      }
    }
    data.version = CURRENT_VERSION;
    return data as WorkbookData;
  }
}
