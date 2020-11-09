import { BasePlugin } from "../base_plugin";
import { Command, WorkbookData, Figure, Viewport, UID } from "../types/index";
import { uuidv4, isDefined } from "../helpers/index";
import { FigureGetters } from ".";

interface FigureState {
  readonly figures: Record<UID, Figure<any> | undefined>;
  readonly sheetFigures: Record<UID, Figure<any>[] | undefined>;
}

export class FigurePlugin extends BasePlugin<FigureState, FigureGetters> implements FigureState {
  static getters = ["getFigures", "getSelectedFigureId", "getFigure"];

  private selectedFigureId: string | null = null;

  readonly figures: Record<UID, Figure<any> | undefined> = {};
  readonly sheetFigures: Record<UID, Figure<any>[] | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "DUPLICATE_SHEET":
        for (let fig of this.sheetFigures[cmd.sheetIdFrom] || []) {
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
        this.history.update("figures", cmd.figure.id, cmd.figure);
        const sheetFigures = (this.sheetFigures[cmd.sheetId] || []).slice();
        sheetFigures.push(cmd.figure);
        this.history.update("sheetFigures", cmd.sheetId, sheetFigures);
        break;
      case "UPDATE_FIGURE":
        if (cmd.x !== undefined) {
          this.history.update("figures", cmd.id, "x", Math.max(cmd.x, 0));
        }
        if (cmd.y !== undefined) {
          this.history.update("figures", cmd.id, "y", Math.max(cmd.y, 0));
        }
        if (cmd.width !== undefined) {
          this.history.update("figures", cmd.id, "width", cmd.width);
        }
        if (cmd.height !== undefined) {
          this.history.update("figures", cmd.id, "height", cmd.height);
        }
        if (cmd.data !== undefined) {
          this.history.update("figures", cmd.id, "data", cmd.data);
        }
        break;
      case "SELECT_FIGURE":
        this.selectedFigureId = cmd.id;
        break;
      case "DELETE_FIGURE":
        this.history.update("figures", cmd.id, undefined);
        for (let s in this.sheetFigures) {
          const figures = (this.sheetFigures[s] || []).filter(isDefined);
          let deletedFigureIndex = figures.findIndex((f) => f.id === cmd.id);
          if (deletedFigureIndex > -1) {
            const copy = figures.slice();
            copy.splice(deletedFigureIndex, 1);
            this.history.update("sheetFigures", s, copy);
            this.selectedFigureId = null;
          }
        }
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
      this.history.update("figures", figure.id, undefined);
    }
    const sheetFigures = Object.assign({}, this.sheetFigures);
    delete sheetFigures[sheet];
    this.history.update("sheetFigures", sheetFigures);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getFigures(viewport: Viewport): Figure<any>[] {
    const result: Figure<any>[] = [];
    const figures = this.sheetFigures[this.getters.getActiveSheetId()] || [];
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

  getFigure<T>(figureId: string): Figure<T> | undefined {
    return this.figures[figureId];
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
