import { BasePlugin } from "../base_plugin";
import { Command, Figure, WorkbookData, Zone } from "../types/index";
import { overlap } from "../helpers";

export class FigurePlugin extends BasePlugin {
  static getters = ["getFiguresInside"];

  protected sheets: { [sheetId: string]: { [figureId: string]: Figure } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {}

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  /**
   * Return the figures inside the zone of a sheet
   */
  public getFiguresInside(sheetId: string, zone: Zone): Figure[] {
    return Object.values(this.sheets[sheetId]).filter((x) => overlap(x.position, zone));
  }
  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  export(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      const sheet = this.workbook.sheets[sheetData.id];
      sheetData.figures = sheet.figures;
    }
  }
}

interface TextFigure extends Figure {
  text: string;
  type: "text";
}

export class TextPlugin extends FigurePlugin {
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  beforeHandle(command: Command) {
    super.beforeHandle(command);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "INSERT_TEXT":
        this.history.updateLocalState(["sheets", this.workbook.activeSheet.id, cmd.id], {
          position: cmd.position,
          id: cmd.id,
          text: cmd.text,
          type: "text",
        });
        break;

      default:
        super.handle(cmd);
        break;
    }
  }
  finalize(command: Command) {
    super.finalize(command);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------
  import(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      if (sheetData.figures && !this.sheets[sheetData.id]) {
        this.sheets[sheetData.id] = {};
      }

      for (let [k, f] of Object.entries(sheetData.figures)) {
        if (f.type === "text") {
          this.sheets[sheetData.id][k] = f as TextFigure;
        }
      }
    }
  }

  export(data: WorkbookData) {
    super.export(data);
  }
}
