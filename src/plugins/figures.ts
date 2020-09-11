import { BasePlugin } from "../base_plugin";
import { Command, WorkbookData, Figure, Viewport } from "../types/index";
import { uuidv4 } from "../helpers/index";

export class FigurePlugin extends BasePlugin {
  static getters = ["getFigures", "getSelectedFigureId"];

  private selectedFigureId: string | null = null;

  private figures: { [figId: string]: Figure<any> } = {};
  private sheetFigures: { [sheetId: string]: Figure<any>[] } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "DUPLICATE_SHEET":
        for (let fig of this.sheetFigures[cmd.sheet] || []) {
          const figure = Object.assign({}, fig, { id: uuidv4() });
          this.dispatch("CREATE_FIGURE", {
            sheet: cmd.id,
            figure,
          });
        }
        break;
      case "DELETE_SHEET":
        this.deleteSheet(cmd.sheet);
        break;
      case "CREATE_FIGURE":
        this.history.updateLocalState(["figures", cmd.figure.id], cmd.figure);
        const sheetFigures = (this.sheetFigures[cmd.sheet] || []).slice();
        sheetFigures.push(cmd.figure);
        this.history.updateLocalState(["sheetFigures", cmd.sheet], sheetFigures);
        break;
      case "UPDATE_FIGURE":
        if (cmd.x !== undefined) {
          this.history.updateLocalState(["figures", cmd.id, "x"], Math.max(cmd.x, 0));
        }
        if (cmd.y !== undefined) {
          this.history.updateLocalState(["figures", cmd.id, "y"], Math.max(cmd.y, 0));
        }
        if (cmd.width !== undefined) {
          this.history.updateLocalState(["figures", cmd.id, "width"], cmd.width);
        }
        if (cmd.height !== undefined) {
          this.history.updateLocalState(["figures", cmd.id, "height"], cmd.height);
        }
        break;
      case "SELECT_FIGURE":
        this.selectedFigureId = cmd.id;
        break;
      // some commands should not remove the current selection
      case "EVALUATE_CELLS":
        break;
      default:
        this.selectedFigureId = null;
    }
  }

  deleteSheet(sheet: string) {
    for (let figure of this.sheetFigures[sheet] || []) {
      this.history.updateLocalState(["figures", figure.id], undefined);
    }
    const sheetFigures = Object.assign({}, this.sheetFigures);
    delete sheetFigures[sheet];
    this.history.updateLocalState(["sheetFigures"], sheetFigures);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getFigures(viewport: Viewport): Figure<any>[] {
    const result: Figure<any>[] = [];
    const figures = this.sheetFigures[this.workbook.activeSheet.id] || [];
    const { offsetX, offsetY, width, height } = viewport;
    for (let figure of figures) {
      if (figure.x >= offsetX + width || figure.x + figure.width <= offsetX) {
        continue;
      }
      if (figure.y >= offsetY + height || figure.y + figure.height <= offsetY) {
        continue;
      }
      result.push(figure);
    }
    return result;
  }

  getSelectedFigureId(): string | null {
    return this.selectedFigureId;
  }
  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const figList: Figure<any>[] = [];
      for (let f of sheet.figures) {
        this.figures[f.id] = f;
        figList.push(f);
      }
      this.sheetFigures[sheet.id] = figList;
    }
  }

  export(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      sheetData.figures = this.sheetFigures[sheetData.id] || [];
    }
  }
}
