import * as owl from "@odoo/owl";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, HEADER_HEIGHT, HEADER_WIDTH } from "../constants";
import { load, CURRENT_VERSION } from "../data";
import { CommandResult, Getters, GridCommand, UI, Workbook, WorkbookData } from "../types/index";
import { BasePlugin } from "./base_plugin";
import * as core from "./core";
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

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

// -----------------------------------------------------------------------------
// GridModel
// -----------------------------------------------------------------------------
export class GridModel extends owl.core.EventBus {
  static setTimeout = window.setTimeout.bind(window);

  private plugins: BasePlugin[];
  private clipboard: ClipboardPlugin;
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
    this.plugins = [];

    for (let Plugin of PLUGINS) {
      const plugin = new Plugin(this.workbook, this.getters);
      plugin.import(workbookData);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.plugins.push(plugin);
    }

    this.clipboard = this.plugins.find(p => p instanceof ClipboardPlugin) as ClipboardPlugin;

    // misc
    this.state = this.computeDerivedState();
    if (this.workbook.loadingCells > 0) {
      this.startScheduler();
    }
  }

  private makeMutation<T>(f: T): OmitFirstArg<T> {
    return ((...args) => {
      history.start(this.workbook);
      let result = (f as any).call(null, this.workbook, ...args);
      history.stop(this.workbook);
      Object.assign(this.state, this.computeDerivedState());
      if (this.workbook.isStale) {
        this.dispatch({ type: "EVALUATE_CELLS" });
      }
      this.trigger("update");
      if (this.workbook.loadingCells > 0) {
        this.startScheduler();
      }
      return result;
    }) as any;
  }

  dispatch(command: GridCommand): CommandResult {
    for (let plugin of this.plugins) {
      let result = plugin.canDispatch(command);
      if (!result) {
        return "CANCELLED";
      }
    }

    history.start(this.workbook);
    this._dispatch(command);
    if (this.workbook.isStale) {
      this._dispatch({ type: "EVALUATE_CELLS" });
    }
    history.stop(this.workbook);
    Object.assign(this.state, this.computeDerivedState());
    this.trigger("update");
    if (this.workbook.loadingCells > 0) {
      this.startScheduler();
    }
    return "COMPLETED";
  }

  private _dispatch(command: GridCommand) {
    const commands: GridCommand[] = [command];
    while (commands.length) {
      const current = commands.shift()!;
      for (let plugin of this.plugins) {
        let result = plugin.handle(current);
        if (result) {
          commands.push(...result);
        }
      }
    }
  }

  computeDerivedState(): UI {
    const { viewport, cols, rows } = this.workbook;
    const clipboardZones = this.clipboard.status === "visible" ? this.clipboard.zones : [];
    return {
      rows: this.workbook.rows,
      cols: this.workbook.cols,
      merges: this.workbook.merges,
      mergeCellMap: this.workbook.mergeCellMap,
      width: this.workbook.width,
      height: this.workbook.height,
      offsetX: cols[viewport.left].left - HEADER_WIDTH,
      offsetY: rows[viewport.top].top - HEADER_HEIGHT,
      scrollTop: this.workbook.scrollTop,
      scrollLeft: this.workbook.scrollLeft,
      viewport: this.workbook.viewport,
      selection: this.workbook.selection,
      activeCol: this.workbook.activeCol,
      activeRow: this.workbook.activeRow,
      activeXc: this.workbook.activeXc,
      clipboard: clipboardZones,
      highlights: this.workbook.highlights,
      isSelectingRange: this.workbook.isSelectingRange,
      isEditing: this.workbook.isEditing,
      selectedCell: core.selectedCell(this.workbook),
      aggregate: core.computeAggregate(this.workbook),
      canUndo: this.workbook.undoStack.length > 0,
      canRedo: this.workbook.redoStack.length > 0,
      currentContent: this.workbook.currentContent,
      sheets: this.workbook.sheets.map(s => s.name),
      activeSheet: this.workbook.activeSheet.name
    };
  }

  private makeFn<T>(f: T): OmitFirstArg<T> {
    return ((...args) => (f as any).call(null, this.workbook, ...args)) as any;
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
  undo = this.makeMutation(history.undo);
  redo = this.makeMutation(history.redo);

  // core
  // ---------------------------------------------------------------------------
  // updateVisibleZone and updateScroll should not be a mutation

  updateVisibleZone = this.makeFn(updateVisibleZone);
  updateScroll(scrollTop, scrollLeft) {
    const result = updateScroll(this.workbook, scrollTop, scrollLeft);
    Object.assign(this.state, this.computeDerivedState());
    return result; //= this.makeFn(core.updateScroll);
  }

  // export
  // ---------------------------------------------------------------------------
  exportData(): WorkbookData {
    const data = (this.plugins[0] as CorePlugin).export();
    for (let plugin of this.plugins.slice(1)) {
      plugin.export(data);
    }
    data.version = CURRENT_VERSION;
    return data as WorkbookData;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function createEmptyWorkbook(): Workbook {
  return {
    rows: [],
    cols: [],
    cells: {},
    merges: {},
    mergeCellMap: {},
    width: 0,
    height: 0,
    clientWidth: DEFAULT_CELL_WIDTH + HEADER_WIDTH,
    clientHeight: DEFAULT_CELL_HEIGHT + HEADER_HEIGHT,
    offsetX: 0,
    offsetY: 0,
    scrollTop: 0,
    scrollLeft: 0,
    viewport: { top: 0, left: 0, bottom: 0, right: 0 },
    selection: {
      zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
      anchor: { col: 0, row: 0 }
    },
    activeCol: 0,
    activeRow: 0,
    activeXc: "A1",
    isEditing: false,
    currentContent: "",
    trackChanges: false,
    undoStack: [],
    redoStack: [],
    highlights: [],
    isSelectingRange: false,
    loadingCells: 0,
    isStale: true,
    sheets: [],
    activeSheet: null as any
  };
}
