import { Workbook, GridCommand, Getters, WorkbookData, HandleReturnType } from "../types/index";

export abstract class BasePlugin {
  static getters: string[] = [];

  workbook: Workbook;
  getters: Getters;

  constructor(workbook: Workbook, getters: Getters) {
    this.workbook = workbook;
    this.getters = getters;
  }

  canDispatch(command: GridCommand): boolean {
    return true;
  }
  handle(command: GridCommand): HandleReturnType {}

  import(data: WorkbookData) {}
  export(data: Partial<WorkbookData>) {}
}
