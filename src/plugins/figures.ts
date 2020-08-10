import { BasePlugin } from "../base_plugin";
import { Command, WorkbookData, Figure, Viewport } from "../types/index";

export class FigurePlugin extends BasePlugin {
  static getters = ["getFigures", "getSelectedFigureId"];

  private selectedFigureId: string | null = null;

  private figures: { [figId: string]: Figure } = {};
  private sheetFigures: { [sheetId: string]: Figure[] } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_FIGURE":
        this.history.updateLocalState(["figures", cmd.figure.id], cmd.figure);
        const sheetFigures = (this.sheetFigures[cmd.sheet] || []).slice();
        sheetFigures.push(cmd.figure);
        this.history.updateLocalState(["sheetFigures", cmd.sheet], sheetFigures);
        break;
      case "MOVE_FIGURE":
        this.history.updateLocalState(["figures", cmd.id, "x"], cmd.x);
        this.history.updateLocalState(["figures", cmd.id, "y"], cmd.y);
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

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getFigures(viewport: Viewport): Figure[] {
    const result: Figure[] = [];
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
      const figList: Figure[] = [];
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
