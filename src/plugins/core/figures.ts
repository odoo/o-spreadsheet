import { isDefined } from "../../helpers/index";
import {
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Figure,
  UID,
  WorkbookData,
} from "../../types/index";
import { HeaderIndex } from "../../types/misc";
import { CorePlugin } from "../core_plugin";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "./../../constants";

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
      case "RESIZE_COLUMNS_ROWS":
        cmd.dimension === "ROW"
          ? this.onRowResize(cmd.sheetId, cmd.elements, cmd.size)
          : this.onColResize(cmd.sheetId, cmd.elements, cmd.size);
        break;
      case "HIDE_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
        cmd.dimension === "ROW"
          ? this.onRowRemove(cmd.sheetId, cmd.elements)
          : this.onColRemove(cmd.sheetId, cmd.elements);
        break;
      case "UNHIDE_COLUMNS_ROWS":
        cmd.dimension === "ROW"
          ? this.onRowUnhide(cmd.sheetId, cmd.elements)
          : this.onColUnhide(cmd.sheetId, cmd.elements);
        break;
      case "ADD_COLUMNS_ROWS":
        cmd.dimension === "ROW"
          ? this.onRowAdd(cmd.sheetId, cmd.base, cmd.quantity)
          : this.onColAdd(cmd.sheetId, cmd.base, cmd.quantity);
        break;
    }
  }

  private verticalShift(sheetId: UID, newSizes: Record<HeaderIndex, number>) {
    const figures = this.getters.getFigures(sheetId).sort((a, b) => a.y - b.y);
    if (!figures) {
      return;
    }
    let figureIndex = 0;
    const numHeader = this.getters.getNumberRows(sheetId);
    let gridHeight = 0;
    let addHeight = 0;
    for (let i = 0; i < numHeader; i++) {
      // TODO : since the row size is an UI value now, this doesn't work anymore. Using the default cell height is
      // a temporary solution at best, but is broken.
      let rowSize = this.getters.getUserRowSize(sheetId, i) || DEFAULT_CELL_HEIGHT;
      if (i in newSizes) {
        addHeight += newSizes[i] - rowSize;
        rowSize = newSizes[i];
      }
      while (figureIndex < figures.length && figures[figureIndex].y < gridHeight) {
        if (addHeight) {
          this.dispatch("UPDATE_FIGURE", {
            sheetId,
            id: figures[figureIndex].id,
            y: figures[figureIndex].y + addHeight,
          });
        }
        figureIndex++;
      }
      gridHeight += rowSize;
    }
    for (const figure of figures) {
      const newY = Math.min(figure.y, gridHeight - figure.height);
      if (newY !== figure.y) {
        this.dispatch("UPDATE_FIGURE", { sheetId, id: figure.id, y: newY });
      }
    }
  }

  private horizontalShift(sheetId: UID, newSizes: Record<HeaderIndex, number>) {
    const figures = this.getters.getFigures(sheetId).sort((a, b) => a.x - b.x);
    if (!figures) {
      return;
    }
    let figureIndex = 0;
    const numHeader = this.getters.getNumberRows(sheetId);
    let gridWidth = 0;
    let addWidth = 0;
    for (let i = 0; i < numHeader; i++) {
      let colSize = this.getters.getColSize(sheetId, i);
      if (i in newSizes) {
        addWidth += newSizes[i] - colSize;
        colSize = newSizes[i];
      }
      while (figureIndex < figures.length && figures[figureIndex].x < gridWidth) {
        if (addWidth) {
          this.dispatch("UPDATE_FIGURE", {
            sheetId,
            id: figures[figureIndex].id,
            x: figures[figureIndex].x + addWidth,
          });
        }
        figureIndex++;
      }
      gridWidth += colSize;
    }
    for (const figure of figures) {
      const newX = Math.min(figure.x, gridWidth - figure.width);
      if (newX !== figure.x) {
        this.dispatch("UPDATE_FIGURE", { sheetId, id: figure.id, x: newX });
      }
    }
  }

  private onRowResize(sheetId: UID, indexes: HeaderIndex[], size: number | null) {
    const newSize = size == null ? DEFAULT_CELL_HEIGHT : size;
    this.verticalShift(sheetId, Object.fromEntries(indexes.map((i) => [i, newSize])));
  }

  private onColResize(sheetId: UID, indexes: HeaderIndex[], size: number | null) {
    const newSize = size == null ? DEFAULT_CELL_WIDTH : size;
    this.horizontalShift(sheetId, Object.fromEntries(indexes.map((i) => [i, newSize])));
  }

  private onRowRemove(sheetId: UID, indexes: HeaderIndex[]) {
    this.verticalShift(sheetId, Object.fromEntries(indexes.map((i) => [i, 0])));
  }

  private onColRemove(sheetId: UID, indexes: HeaderIndex[]) {
    this.horizontalShift(sheetId, Object.fromEntries(indexes.map((i) => [i, 0])));
  }

  private onRowAdd(sheetId: UID, base: HeaderIndex, amount: number) {
    const change: Record<HeaderIndex, number> = {};
    change[base] = amount * DEFAULT_CELL_HEIGHT;
    this.verticalShift(sheetId, change);
  }

  private onColAdd(sheetId: UID, base: HeaderIndex, amount: number) {
    const change: Record<HeaderIndex, number> = {};
    change[base] = amount * DEFAULT_CELL_WIDTH;
    this.horizontalShift(sheetId, change);
  }

  private onRowUnhide(sheetId: UID, indexes: HeaderIndex[]) {
    this.verticalShift(
      sheetId,
      Object.fromEntries(
        indexes.map((i) => [i, this.getters.getUserRowSize(sheetId, i) || DEFAULT_CELL_HEIGHT])
      )
    );
  }

  private onColUnhide(sheetId: UID, indexes: HeaderIndex[]) {
    this.horizontalShift(
      sheetId,
      Object.fromEntries(indexes.map((i) => [i, this.getters.getColSize(sheetId, i)]))
    );
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
