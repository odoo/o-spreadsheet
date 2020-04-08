import { Workbook, GridCommand, Getters, WorkbookData, Viewport } from "./types/index";
import { WorkbookHistory, WHistory } from "./history";

/**
 * BasePlugin
 *
 * Since the spreadsheet internal state is quite complex, it is split into
 * multiple parts, each managing a specific concern.
 *
 * This file introduce the BasePlugin, which is the common class that defines
 * how each of these model sub parts should interact with each other.
 */

export interface CommandHandler {
  canDispatch(command: GridCommand): boolean;
  start(command: GridCommand): void;
  handle(command: GridCommand): void;
  finalize(command: GridCommand): void;
}

export const enum LAYERS {
  Background,
  Grid
}

type DispatchFn = (command: GridCommand) => void;

export class BasePlugin implements CommandHandler {
  static layers: LAYERS[] = [];
  static getters: string[] = [];

  workbook: Workbook;
  getters: Getters;
  history: WorkbookHistory;
  dispatch: DispatchFn;

  constructor(workbook: Workbook, getters: Getters, history: WHistory, dispatch: DispatchFn) {
    this.workbook = workbook;
    this.getters = getters;
    this.history = Object.assign(Object.create(history), {
      updateLocalState: history.updateStateFromRoot.bind(history, this)
    });
    this.dispatch = dispatch;
  }

  // ---------------------------------------------------------------------------
  // Command handling
  // ---------------------------------------------------------------------------

  canDispatch(command: GridCommand): boolean {
    return true;
  }

  start(command: GridCommand): void {}
  handle(command: GridCommand): void {}
  finalize(command: GridCommand): void {}

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(canvas: HTMLCanvasElement, viewport: Viewport, layer: LAYERS) {}

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
