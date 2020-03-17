import { Workbook, GridCommand, CommandResult } from "./types";

export class BasePlugin {
  workbook: Workbook;

  constructor(workbook: Workbook) {
    this.workbook = workbook;
  }

  dispatch(command: GridCommand): CommandResult | void {}
}
