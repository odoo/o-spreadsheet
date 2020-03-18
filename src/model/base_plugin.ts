import { Workbook, GridCommand, CommandResult } from "./types";
import { PartialWorkbookDataWithVersion, WorkbookData } from "./import_export";

export interface Plugin {
  dispatch(command: GridCommand): CommandResult | void;

  export(data: Partial<WorkbookData>): void;

  getters: {
    [key: string]: Function;
  };
}

export class BasePlugin implements Plugin {
  workbook: Workbook;
  getters = {};

  constructor(workbook: Workbook, data: PartialWorkbookDataWithVersion) {
    this.workbook = workbook;
  }

  dispatch(command: GridCommand): CommandResult | void {}

  export(data: Partial<WorkbookData>) {}
}
