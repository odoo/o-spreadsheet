import { uuidv4 } from "../../helpers/index";
import { Command, Figure, UID, Viewport, WorkbookData } from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface FigureState {
  readonly figures: { [sheet: string]: Record<UID, Figure> };
}

export class FigurePlugin extends CorePlugin<FigureState> implements FigureState {
  static getters = ["getVisibleFigures", "getFigures", "getSelectedFigureId", "getFigure"];
  private selectedFigureId: string | null = null;
  readonly figures: {
    [sheet: string]: Record<UID, Figure>;
  } = {};
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.figures[cmd.sheetId] = {};
        break;
      case "DUPLICATE_SHEET":
        this.figures[cmd.sheetIdTo] = {};
        for (let fig of Object.values(this.figures[cmd.sheetIdFrom] || [])) {
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

  private updateFigure(sheetId: string, figure: Partial<Figure>) {
    if (!figure.id) {
      return;
    }
    const currentFigures = Object.assign({}, this.figures[sheetId]);
    const newFigure = { ...currentFigures[figure.id] };
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
    currentFigures[figure.id] = newFigure;
    this.history.update("figures", sheetId, currentFigures);
  }

  private addFigure(figure: Figure, sheetId: UID) {
    const currentFigures = Object.assign({}, this.figures[sheetId]);
    currentFigures[figure.id] = figure;
    this.history.update("figures", sheetId, currentFigures);
  }

  private deleteSheet(sheet: string) {
    const figures = Object.assign({}, this.figures);
    delete figures[sheet];
    this.history.update("figures", figures);
  }

  private removeFigure(id: string, sheetId: UID) {
    const currentFigures = Object.assign({}, this.figures[sheetId]);
    if (this.selectedFigureId === id) {
      this.selectedFigureId = null;
    }
    delete currentFigures[id];
    this.history.update("figures", sheetId, currentFigures);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getVisibleFigures(sheetId: UID, viewport: Viewport): Figure[] {
    const result: Figure[] = [];
    const figures = Object.values(this.figures[sheetId]) || [];
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
  getFigures(sheetId: UID) {
    return this.figures[sheetId] || [];
  }

  getSelectedFigureId(): string | null {
    return this.selectedFigureId;
  }

  getFigure(sheetId: string, figureId: string): Figure | undefined {
    const sheetFigures = this.figures[sheetId];
    return sheetFigures[figureId];
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------
  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      var figures = {};
      sheet.figures.forEach((figure) => {
        figures[figure.id] = figure;
      });
      this.figures[sheet.id] = figures;
    }
  }

  export(data: WorkbookData) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        if (this.figures[sheet.id]) {
          const figures = this.figures[sheet.id];
          for (let figure of Object.values(figures)) {
            const data = undefined;
            sheet.figures.push({ ...figure, data });
          }
        }
      }
    }
  }
}
