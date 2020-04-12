import { WHistory, WorkbookHistory } from "./history";
import { Mode } from "./model";
import {
  CommandDispatcher,
  CommandHandler,
  Getters,
  Command,
  Viewport,
  Workbook,
  WorkbookData
} from "./types/index";

/**
 * BasePlugin
 *
 * Since the spreadsheet internal state is quite complex, it is split into
 * multiple parts, each managing a specific concern.
 *
 * This file introduce the BasePlugin, which is the common class that defines
 * how each of these model sub parts should interact with each other.
 */

export interface GridRenderingContext {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr: number;
  thinLineWidth: number;
}

export const enum LAYERS {
  Background,
  Highlights,
  Clipboard,
  Selection,
  Headers
}

export class BasePlugin implements CommandHandler {
  static layers: LAYERS[] = [];
  static getters: string[] = [];
  static modes: Mode[] = ["headless", "normal", "readonly"];

  protected workbook: Workbook;
  protected getters: Getters;
  protected history: WorkbookHistory;
  protected dispatch: CommandDispatcher["dispatch"];
  protected currentMode: Mode;

  constructor(
    workbook: Workbook,
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    mode: Mode
  ) {
    this.workbook = workbook;
    this.getters = getters;
    this.history = Object.assign(Object.create(history), {
      updateLocalState: history.updateStateFromRoot.bind(history, this)
    });
    this.dispatch = dispatch;
    this.currentMode = mode;
  }

  // ---------------------------------------------------------------------------
  // Command handling
  // ---------------------------------------------------------------------------

  allowDispatch(command: Command): boolean {
    return true;
  }

  start(command: Command): void {}
  handle(command: Command): void {}
  finalize(command: Command): void {}

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(ctx: GridRenderingContext, layer: LAYERS) {}

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
