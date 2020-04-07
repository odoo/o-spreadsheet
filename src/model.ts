import * as owl from "@odoo/owl";
import { BasePlugin, CommandHandler } from "./base_plugin";
import { createEmptyWorkbook, createEmptyWorkbookData, load } from "./data";
import { WHistory } from "./history";
import { ClipboardPlugin } from "./plugins/clipboard";
import { ConditionalFormatPlugin } from "./plugins/conditional_format";
import { CorePlugin } from "./plugins/core";
import { EditionPlugin } from "./plugins/edition";
import { EntityPlugin } from "./plugins/entity";
import { EvaluationPlugin } from "./plugins/evaluation";
import { FormattingPlugin } from "./plugins/formatting";
import { GridPlugin } from "./plugins/grid";
import { LayoutPlugin } from "./plugins/layout";
import { SelectionPlugin } from "./plugins/selection";
import { Registry } from "./registry";
import { CommandResult, Getters, GridCommand, UI, Workbook, WorkbookData } from "./types/index";

// -----------------------------------------------------------------------------
// Plugins
// -----------------------------------------------------------------------------

export const pluginRegistry = new Registry<typeof BasePlugin>();

pluginRegistry
  .add("core", CorePlugin)
  .add("evaluation", EvaluationPlugin)
  .add("clipboard", ClipboardPlugin)
  .add("grid", GridPlugin)
  .add("formatting", FormattingPlugin)
  .add("edition", EditionPlugin)
  .add("selection", SelectionPlugin)
  .add("conditional formatting", ConditionalFormatPlugin)
  .add("entities", EntityPlugin)
  .add("layout", LayoutPlugin);

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------
export class Model extends owl.core.EventBus {
  private handlers: CommandHandler[];
  private status: "ready" | "running" | "finalizing" = "ready";

  workbook: Workbook;
  history: WHistory;
  state: UI;
  layout: LayoutPlugin;

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
    for (let Plugin of pluginRegistry.getAll()) {
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
    this.layout = this.handlers.find(h => h instanceof LayoutPlugin)! as LayoutPlugin;
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
        this.handlers.forEach(h => h.handle(command));
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
        this.handlers.forEach(h => h.handle(command));
        break;
      case "finalizing":
        throw new Error("Nope. Don't do that");
    }
    return "COMPLETED";
  }

  // core
  // ---------------------------------------------------------------------------
  updateVisibleZone(width: number, height: number) {
    this.layout.updateVisibleZone(width, height);
    Object.assign(this.state, this.getters.getUI());
  }

  updateScroll(scrollTop: number, scrollLeft: number): boolean {
    const result = this.layout.updateScroll(scrollTop, scrollLeft);
    Object.assign(this.state, this.getters.getUI(result));
    return result;
  }

  // export
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
