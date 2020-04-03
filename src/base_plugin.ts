import { Workbook, GridCommand, Getters, WorkbookData } from "./types/index";
import { WorkbookHistory, WHistory } from "./history";

export interface CommandHandler {
  canDispatch(command: GridCommand): boolean;
  start(command: GridCommand): void;
  handle(command: GridCommand): void;
  finalize(command: GridCommand): void;
}

type DispatchFn = (command: GridCommand) => void;

export abstract class BasePlugin implements CommandHandler {
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

  canDispatch(command: GridCommand): boolean {
    return true;
  }

  start(command: GridCommand): void {}
  handle(command: GridCommand): void {}
  finalize(command: GridCommand): void {}

  import(data: WorkbookData) {}
  export(data: Partial<WorkbookData>) {}
}
