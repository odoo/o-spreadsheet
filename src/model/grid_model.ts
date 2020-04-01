import * as owl from "@odoo/owl";
import { CURRENT_VERSION, load, createEmptyWorkbook } from "../data";
import { CommandResult, Getters, GridCommand, UI, Workbook, WorkbookData } from "../types/index";
import { BasePlugin, CommandHandler } from "./base_plugin";
import * as history from "./history";
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

interface CommandStack {
  current: GridCommand;
  handlerIndex: 0;
  next: CommandStack | null;
}

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
// GridModel
// -----------------------------------------------------------------------------
export class GridModel extends owl.core.EventBus {
  static setTimeout = window.setTimeout.bind(window);

  private handlers: CommandHandler[];
  private isStarted: boolean = false;
  workbook: Workbook;
  state: UI;

  getters: Getters;

  constructor(data?: any) {
    super();
    (window as any).gridmodel = this; // to debug. remove this someday

    const workbookData = load(data);
    this.workbook = createEmptyWorkbook();

    // Plugins
    this.getters = {} as Getters;
    this.handlers = [];

    for (let Plugin of PLUGINS) {
      const plugin = new Plugin(this.workbook, this.getters);
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
    this.state = this.getters.getUI();
    if (this.workbook.loadingCells > 0) {
      this.startScheduler();
    }
  }

  dispatch(command: GridCommand): CommandResult {
    // starting
    for (let handler of this.handlers) {
      let result = handler.start(command);
      if (!result) {
        return "CANCELLED";
      }
    }

    // handling
    history.start(this.workbook);
    this._dispatch(command);
    if (this.workbook.isStale) {
      this._dispatch({ type: "EVALUATE_CELLS" });
    }
    history.stop(this.workbook);

    // finalizing
    for (let handler of this.handlers) {
      handler.finalize();
    }
    Object.assign(this.state, this.getters.getUI());
    this.trigger("update");
    if (this.workbook.loadingCells > 0) {
      this.startScheduler();
    }
    return "COMPLETED";
  }

  private _dispatch(command: GridCommand) {
    let stack: CommandStack = {
      current: command,
      handlerIndex: 0,
      next: null
    };
    const n = this.handlers.length;
    while (stack.handlerIndex < n) {
      const handler = this.handlers[stack.handlerIndex];
      const result = handler.handle(stack.current);
      stack.handlerIndex++;
      if (stack.next && stack.handlerIndex === n) {
        stack = stack.next;
      }
      if (result) {
        for (let cmd of result.reverse()) {
          stack = {
            current: cmd,
            handlerIndex: 0,
            next: stack
          };
        }
      }
    }
  }

  /**
   * todo: move this into evaluation plugin
   */
  private startScheduler() {
    if (!this.isStarted) {
      this.isStarted = true;
      let current = this.workbook.loadingCells;
      const recomputeCells = () => {
        if (this.workbook.loadingCells !== current) {
          this.dispatch({ type: "EVALUATE_CELLS", onlyWaiting: true });
          current = this.workbook.loadingCells;
          if (current === 0) {
            this.isStarted = false;
          }
        }
        if (current > 0) {
          GridModel.setTimeout(recomputeCells, 15);
        }
      };
      GridModel.setTimeout(recomputeCells, 5);
    }
  }

  // history
  // ---------------------------------------------------------------------------
  undo() {
    history.undo(this.workbook);
    this._dispatch({ type: "EVALUATE_CELLS" });
    Object.assign(this.state, this.getters.getUI());
    this.trigger("update");
  }

  redo() {
    history.redo(this.workbook);
    this._dispatch({ type: "EVALUATE_CELLS" });
    Object.assign(this.state, this.getters.getUI());
    this.trigger("update");
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
    const data = (this.handlers[0] as CorePlugin).export();
    for (let handler of this.handlers.slice(1)) {
      if (handler instanceof BasePlugin) {
        handler.export(data);
      }
    }
    data.version = CURRENT_VERSION;
    return data as WorkbookData;
  }
}
