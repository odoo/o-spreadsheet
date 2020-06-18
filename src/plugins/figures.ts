import { BasePlugin } from "../base_plugin";
import { Command, WorkbookData } from "../types/index";

export class FigurePlugin extends BasePlugin {
  static getters = [];

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    // switch (cmd.type) {
    //   case "ADD_MERGE":
    //     if (cmd.interactive) {
    //       this.interactiveMerge(cmd.sheet, cmd.zone);
    //     } else {
    //       this.addMerge(cmd.sheet, cmd.zone);
    //     }
    //     break;
    //   case "REMOVE_MERGE":
    //     this.removeMerge(cmd.sheet, cmd.zone);
    //     break;
    //   case "PASTE_CELL":
    //     const xc = toXC(cmd.originCol, cmd.originRow);
    //     if (this.isMainCell(xc, cmd.sheet)) {
    //       this.pasteMerge(xc, cmd.col, cmd.row, cmd.sheet, cmd.cut);
    //     }
    //     break;
    // }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // const sheets = data.sheets || [];
    // for (let sheetData of sheets) {
    //   const sheet = this.workbook.sheets[sheetData.id];
    //   if (sheet && sheetData.merges) {
    //     this.importMerges(sheet.id, sheetData.merges);
    //   }
    // }
  }

  export(data: WorkbookData) {
    // for (let sheetData of data.sheets) {
    //   const sheet = this.workbook.sheets[sheetData.id];
    //   sheetData.merges.push(...exportMerges(sheet.merges));
    // }
  }
}
