import { Workbook, GridCommand, CommandResult } from "./types";

export interface Plugin {
  dispatch(command: GridCommand): CommandResult | void;
}

export class BasePlugin implements Plugin {
  workbook: Workbook;

  constructor(workbook: Workbook) {
    this.workbook = workbook;
  }

  dispatch(command: GridCommand): CommandResult | void {}
}
