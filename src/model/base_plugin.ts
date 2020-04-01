import { Workbook, GridCommand, Getters, WorkbookData, HandleReturnType } from "../types/index";

export interface CommandHandler {
  start(command: GridCommand): boolean;
  handle(command: GridCommand): HandleReturnType;
  finalize(): void;
}

export abstract class BasePlugin implements CommandHandler {
  static getters: string[] = [];

  workbook: Workbook;
  getters: Getters;

  constructor(workbook: Workbook, getters: Getters) {
    this.workbook = workbook;
    this.getters = getters;
  }

  start(command: GridCommand): boolean {
    return true;
  }
  handle(command: GridCommand): HandleReturnType {}
  finalize() {}

  import(data: WorkbookData) {}
  export(data: Partial<WorkbookData>) {}
}
