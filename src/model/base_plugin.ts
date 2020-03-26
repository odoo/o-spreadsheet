import { Workbook, GridCommand, Getters } from "./types";
import { WorkbookData } from "./import_export";

export class BasePlugin {
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
  handle(command: GridCommand): GridCommand[] | void {}

  import(data: WorkbookData) {}
  export(data: Partial<WorkbookData>) {}
}
