import { uuidv4 } from "../../helpers/index";
import { Command, Figure, UID, Viewport, WorkbookData } from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface FigureState {
  readonly figures: { [sheet: string]: Figure<any>[] };
}

export class FigurePlugin extends CorePlugin<FigureState> implements FigureState {
  static getters = ["getFigures", "getSelectedFigureId", "getFigure"];
  private selectedFigureId: string | null = null;
  readonly figures: { [sheet: string]: Figure<any>[] } = {};
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.figures[cmd.sheetId] = [];
        break;
      case "DUPLICATE_SHEET":
        this.figures[cmd.sheetIdTo] = [];
        for (let fig of this.figures[cmd.sheetIdFrom] || []) {
          const figure = Object.assign({}, fig, { id: uuidv4() });
          this.dispatch("CREATE_FIGURE", {
            sheetId: cmd.sheetIdTo,
            figure,
          });
        }
        break;
      case "DELETE_SHEET":
        this.deleteSheet(cmd.sheetId);
        break;
      case "CREATE_FIGURE":
        this.addFigure(cmd.figure, cmd.sheetId);
        break;
      case "UPDATE_FIGURE":
        this.updateFigure(cmd.sheetId, cmd);
        break;
      case "SELECT_FIGURE":
        this.selectedFigureId = cmd.id;
        break;
      case "DELETE_FIGURE":
        this.removeFigure(cmd.id, cmd.sheetId);
        break;
      // some commands should not remove the current selection
      case "EVALUATE_CELLS":
        break;
      default:
        this.selectedFigureId = null;
    }
  }

  private updateFigure(sheetId: string, figure: Partial<Figure<any>>) {
    const currentFigures = this.figures[sheetId].slice();
    const updateIndex = currentFigures.findIndex((c) => c.id === figure.id);
    if (updateIndex === -1) {
      return;
    }
    const newFigure = { ...currentFigures[updateIndex] };
    if (figure.x !== undefined) {
      newFigure.x = Math.max(figure.x, 0);
    }
    if (figure.y !== undefined) {
      newFigure.y = Math.max(figure.y, 0);
    }
    if (figure.width !== undefined) {
      newFigure.width = figure.width;
    }
    if (figure.height !== undefined) {
      newFigure.height = figure.height;
    }
    if (figure.data !== undefined) {
      newFigure.data = figure.data;
    }
    currentFigures.splice(updateIndex, 1, newFigure);
    this.history.update("figures", sheetId, currentFigures);
  }

  private addFigure(figure: Figure<any>, sheetId: string) {
    const currentFigures = this.figures[sheetId].slice();
    const replaceIndex = currentFigures.findIndex((c) => c.id === figure.id);

    if (replaceIndex > -1) {
      currentFigures.splice(replaceIndex, 1, figure);
    } else {
      currentFigures.push(figure);
    }
    this.history.update("figures", sheetId, currentFigures);
  }

  private deleteSheet(sheet: string) {
    const figures = Object.assign({}, this.figures);
    delete figures[sheet];
    this.history.update("figures", figures);
  }

  private removeFigure(id: string, sheet: string) {
    const figureIndex = this.figures[sheet].findIndex((s) => s.id === id);
    if (figureIndex !== -1) {
      const figures = this.figures[sheet].slice();
      if (figures[figureIndex].id === this.selectedFigureId) {
        this.selectedFigureId = null;
      }
      figures.splice(figureIndex, 1);
      this.history.update("figures", sheet, figures);
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getFigures(sheetId: UID, viewport: Viewport): Figure<any>[] {
    const result: Figure<any>[] = [];
    const figures = this.figures[sheetId] || [];
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

  getFigure<T>(sheetId: string, figureId: string): Figure<T> | undefined {
    const currentFigures = this.figures[sheetId].slice();
    const index = currentFigures.findIndex((c) => c.id === figureId);
    return index !== -1 ? currentFigures[index] : undefined;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------
  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      this.figures[sheet.id] = sheet.figures;
    }
  }

  export(data: WorkbookData) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        if (this.figures[sheet.id]) {
          sheet.figures = this.figures[sheet.id];
        }
      }
    }
  }
}
