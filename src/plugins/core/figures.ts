import { isDefined } from "../../helpers/index";
import { Command, Figure, UID, Viewport, WorkbookData } from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface FigureState {
  readonly figures: { [sheet: string]: Record<UID, Figure | undefined> | undefined };
}

export class FigurePlugin extends CorePlugin<FigureState> implements FigureState {
  static getters = ["getVisibleFigures", "getFigures", "getSelectedFigureId", "getFigure"];
  private selectedFigureId: string | null = null;
  readonly figures: {
    [sheet: string]: Record<UID, Figure | undefined> | undefined;
  } = {};
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.figures[cmd.sheetId] = {};
        break;
      case "DELETE_SHEET":
        this.deleteSheet(cmd.sheetId);
        break;
      case "CREATE_FIGURE":
        this.addFigure(cmd.figure, cmd.sheetId);
        break;
      case "UPDATE_FIGURE":
        const { type, sheetId, ...update } = cmd;
        const figure: Partial<Figure> = update;
        this.updateFigure(sheetId, figure);
        break;
      case "SELECT_FIGURE":
        this.selectedFigureId = cmd.id;
        break;
      case "DELETE_FIGURE":
        this.removeFigure(cmd.id, cmd.sheetId);
        break;
      // some commands should not remove the current selection
      case "EVALUATE_CELLS":
      case "DISABLE_SELECTION_INPUT":
      case "HIGHLIGHT_SELECTION":
      case "RESET_PENDING_HIGHLIGHT":
      case "REMOVE_ALL_HIGHLIGHTS":
      case "ENABLE_NEW_SELECTION_INPUT":
        break;
      default:
        this.selectedFigureId = null;
    }
  }

  private updateFigure(sheetId: string, figure: Partial<Figure>) {
    if (!("id" in figure)) {
      return;
    }
    for (const [key, value] of Object.entries(figure)) {
      switch (key) {
        case "x":
        case "y":
          if (value !== undefined) {
            this.history.update("figures", sheetId, figure.id!, key, Math.max(value as number, 0));
          }
          break;
        case "width":
        case "height":
          if (value !== undefined) {
            this.history.update("figures", sheetId, figure.id!, key, value as number);
          }
          break;
      }
    }
  }

  private addFigure(figure: Figure, sheetId: UID) {
    this.history.update("figures", sheetId, figure.id, figure);
  }

  private deleteSheet(sheetId: UID) {
    this.history.update("figures", sheetId, undefined);
  }

  private removeFigure(id: string, sheetId: UID) {
    if (this.selectedFigureId === id) {
      this.selectedFigureId = null;
    }
    this.history.update("figures", sheetId, id, undefined);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getVisibleFigures(sheetId: UID, viewport: Viewport): Figure[] {
    const result: Figure[] = [];
    const figures = this.getFigures(sheetId);
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
  getFigures(sheetId: UID): Figure[] {
    return Object.values(this.figures[sheetId] || {}).filter(isDefined);
  }

  getSelectedFigureId(): UID | null {
    return this.selectedFigureId;
  }

  getFigure(sheetId: string, figureId: string): Figure | undefined {
    return this.figures[sheetId]?.[figureId];
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------
  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const figures = {};
      sheet.figures.forEach((figure) => {
        figures[figure.id] = figure;
      });
      this.figures[sheet.id] = figures;
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const figure of this.getFigures(sheet.id)) {
        const data = undefined;
        sheet.figures.push({ ...figure, data });
      }
    }
  }
}
