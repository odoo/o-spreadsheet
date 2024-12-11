import { isDefined } from "../../helpers/index";
import {
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Figure,
  HeaderIndex,
  PixelPosition,
  Position,
  UID,
  WorkbookData,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface FigureState {
  readonly figures: { [sheet: string]: Record<UID, Figure | undefined> | undefined };
}

export class FigurePlugin extends CorePlugin<FigureState> implements FigureState {
  static getters = ["getFigures", "getFigure", "getFigureSheetId"] as const;
  readonly figures: {
    [sheet: string]: Record<UID, Figure | undefined> | undefined;
  } = {};
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_FIGURE":
        return this.checkFigureDuplicate(cmd.figure.id);
      case "UPDATE_FIGURE":
      case "DELETE_FIGURE":
        return this.checkFigureExists(cmd.sheetId, cmd.id);
      default:
        return CommandResult.Success;
    }
  }

  beforeHandle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "DELETE_SHEET":
        this.getters.getFigures(cmd.sheetId).forEach((figure) => {
          this.dispatch("DELETE_FIGURE", { id: figure.id, sheetId: cmd.sheetId });
        });
        break;
    }
  }

  handle(cmd: CoreCommand) {
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
      case "DELETE_FIGURE":
        this.removeFigure(cmd.id, cmd.sheetId);
        break;
      case "ADD_COLUMNS_ROWS":
        let baseIdx = cmd.base;
        if (cmd.position === "before") {
          baseIdx--;
        }
        if (cmd.dimension === "COL") {
          this.onColAdd(cmd.sheetId, baseIdx, cmd.quantity);
        } else {
          this.onRowAdd(cmd.sheetId, baseIdx, cmd.quantity);
        }
        break;
      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.onColRemove(cmd.sheetId, cmd.elements);
        } else {
          this.onRowRemove(cmd.sheetId, cmd.elements);
        }
        break;
    }
  }

  private onColAdd(sheetId: string, index: HeaderIndex, quantity: number) {
    for (const figure of this.getFigures(sheetId)) {
      if (figure.anchor.col > index) {
        this.history.update("figures", sheetId, figure.id!, "anchor", {
          row: figure.anchor.row,
          col: figure.anchor.col + quantity,
        } as Position);
      }
    }
  }

  private onRowAdd(sheetId: string, index: HeaderIndex, quantity: number) {
    for (const figure of this.getFigures(sheetId)) {
      if (figure.anchor.row > index) {
        this.history.update("figures", sheetId, figure.id!, "anchor", {
          row: figure.anchor.row + quantity,
          col: figure.anchor.col,
        } as Position);
      }
    }
  }

  private onColRemove(sheetId: string, elements: number[]) {
    const figures = this.getFigures(sheetId).sort((a, b) => a.anchor.col - b.anchor.col);
    elements.sort((a, b) => a - b);

    let elements_index = 0;
    for (const fig in figures) {
      const figure = figures[fig];
      while (elements_index < elements.length && elements[elements_index] <= figure.anchor.col) {
        elements_index++;
      }
      if (elements_index) {
        this.history.update("figures", sheetId, figure.id!, "anchor", {
          row: figure.anchor.row,
          col: figure.anchor.col - elements_index,
        } as Position);
      }
    }
  }

  private onRowRemove(sheetId: string, elements: number[]) {
    const figures = this.getFigures(sheetId).sort((a, b) => a.anchor.row - b.anchor.row);
    elements.sort((a, b) => a - b);

    let elements_index = 0;
    for (const fig in figures) {
      const figure = figures[fig];
      while (elements_index < elements.length && elements[elements_index] <= figure.anchor.row) {
        elements_index++;
      }
      if (elements_index) {
        this.history.update("figures", sheetId, figure.id!, "anchor", {
          row: figure.anchor.row - elements_index,
          col: figure.anchor.col,
        } as Position);
      }
    }
  }

  private updateFigure(sheetId: string, figure: Partial<Figure>) {
    if (!("id" in figure)) {
      return;
    }
    for (const [key, value] of Object.entries(figure)) {
      switch (key) {
        case "fixed_position":
          this.history.update("figures", sheetId, figure.id!, key, value as boolean);
          break;
        case "offset":
          // Todo ensure that final position > 0 for x/y
          this.history.update("figures", sheetId, figure.id!, key, value as PixelPosition);
          break;
        case "anchor":
          this.history.update("figures", sheetId, figure.id!, key, value as Position);
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
    this.history.update("figures", sheetId, id, undefined);
  }

  private checkFigureExists(sheetId: UID, figureId: UID): CommandResult {
    if (this.figures[sheetId]?.[figureId] === undefined) {
      return CommandResult.FigureDoesNotExist;
    }
    return CommandResult.Success;
  }

  private checkFigureDuplicate(figureId: UID): CommandResult {
    if (Object.values(this.figures).find((sheet) => sheet?.[figureId])) {
      return CommandResult.DuplicatedFigureId;
    }
    return CommandResult.Success;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getFigures(sheetId: UID): Figure[] {
    return Object.values(this.figures[sheetId] || {}).filter(isDefined);
  }

  getFigure(sheetId: string, figureId: string): Figure | undefined {
    return this.figures[sheetId]?.[figureId];
  }

  getFigureSheetId(figureId: string): UID | undefined {
    return Object.keys(this.figures).find(
      (sheetId) => this.figures[sheetId]?.[figureId] !== undefined
    );
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

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
