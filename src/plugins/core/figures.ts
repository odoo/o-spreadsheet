import { DEFAULT_CELL_HEIGHT } from "../../constants";
import { clip, isDefined } from "../../helpers/index";
import { AnchorOffset } from "../../types/figure";
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
        this.updateFigure(sheetId, update);
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

    const numHeader = this.getters.getNumberCols(sheetId);
    const remainingSize: number[] = new Array(numHeader + 1);
    remainingSize[numHeader] = 0;
    for (let i = numHeader - 1; i >= 0; i--) {
      // TODO : since the row size is an UI value now, this doesn't work anymore. Using the default cell height is
      // a temporary solution at best, but is broken.
      remainingSize[i] = remainingSize[i + 1] + this.getters.getColSize(sheetId, i);
    }

    let elements_index = 0;
    for (const fig in figures) {
      const figure = figures[fig];
      while (elements_index < elements.length && elements[elements_index] < figure.anchor.col) {
        elements_index++;
      }
      if (
        !figure.fixed_position &&
        (elements_index || figure.offset.x + figure.height > remainingSize[figure.anchor.col])
      ) {
        let x = figure.offset.x;
        let col = figure.anchor.col - elements_index;
        for (
          let col_size = this.getters.getColSize(sheetId, col);
          col_size < x;
          col_size = this.getters.getColSize(sheetId, col)
        ) {
          col += 1;
          x -= col_size;
        }

        x = Math.min(x, remainingSize[col] - figure.height);
        while (x < 0 && col > 0) {
          col--;
          x = remainingSize[col] - figure.height;
        }

        if (x != figure.offset.x) {
          this.history.update("figures", sheetId, figure.id!, "offset", {
            x: Math.max(x, 0),
            y: figure.offset.y,
          } as PixelPosition);
        }
        if (col != figure.anchor.col) {
          this.history.update("figures", sheetId, figure.id!, "anchor", {
            row: figure.anchor.row,
            col,
          } as Position);
        }
      } else if (figure.fixed_position && figure.offset.x + figure.width > remainingSize[0]) {
        this.history.update("figures", sheetId, figure.id!, "offset", {
          x: Math.max(remainingSize[0] - figure.width, 0),
          y: figure.offset.y,
        } as PixelPosition);
      }
    }
  }

  private onRowRemove(sheetId: string, elements: number[]) {
    const figures = this.getFigures(sheetId).sort((a, b) => a.anchor.row - b.anchor.row);
    elements.sort((a, b) => a - b);

    const numHeader = this.getters.getNumberRows(sheetId);
    const remainingSize: number[] = new Array(numHeader + 1);
    remainingSize[numHeader] = 0;
    for (let i = numHeader - 1; i >= 0; i--) {
      // TODO : since the row size is an UI value now, this doesn't work anymore. Using the default cell height is
      // a temporary solution at best, but is broken.
      remainingSize[i] =
        remainingSize[i + 1] + (this.getters.getUserRowSize(sheetId, i) ?? DEFAULT_CELL_HEIGHT);
    }

    let elements_index = 0;
    for (const fig in figures) {
      const figure = figures[fig];
      while (elements_index < elements.length && elements[elements_index] < figure.anchor.row) {
        elements_index++;
      }
      if (
        !figure.fixed_position &&
        (elements_index || figure.offset.y + figure.width > remainingSize[figure.anchor.row])
      ) {
        let y = figure.offset.y;
        let row = figure.anchor.row - elements_index;
        for (
          let row_size = this.getters.getUserRowSize(sheetId, row) ?? DEFAULT_CELL_HEIGHT;
          row_size < y;
          row_size = this.getters.getUserRowSize(sheetId, row) ?? DEFAULT_CELL_HEIGHT
        ) {
          row += 1;
          y -= row_size;
        }

        y = Math.min(y, remainingSize[row] - figure.width);
        while (y < 0 && row > 0) {
          row--;
          y = remainingSize[row] - figure.width;
        }

        if (y != figure.offset.y) {
          this.history.update("figures", sheetId, figure.id!, "offset", {
            x: figure.offset.x,
            y: Math.max(0, y),
          } as PixelPosition);
        }
        if (row != figure.anchor.row) {
          this.history.update("figures", sheetId, figure.id!, "anchor", {
            row,
            col: figure.anchor.col,
          } as Position);
        }
      } else if (figure.fixed_position && figure.offset.y + figure.height > remainingSize[0]) {
        this.history.update("figures", sheetId, figure.id!, "offset", {
          x: figure.offset.x,
          y: Math.max(remainingSize[0] - figure.height, 0),
        } as PixelPosition);
      }
    }
  }

  private getPositionInSheet(sheetId: UID, figure: Figure): AnchorOffset {
    return figure.fixed_position
      ? this.getPositionInSheetFixed(sheetId, figure)
      : this.getPositionInSheetAnchor(sheetId, figure);
  }

  private getPositionInSheetFixed(sheetId: UID, figure: Figure): AnchorOffset {
    const { numberOfRows, numberOfCols } = this.getters.getSheetSize(sheetId);
    let width = 0;
    let height = 0;
    let offset = { ...figure.offset };
    for (let rowNum = 0; rowNum < numberOfRows; rowNum++) {
      if (figure.anchor.row === rowNum) {
        offset.y += height;
      }
      height += this.getters.getUserRowSize(sheetId, rowNum) ?? DEFAULT_CELL_HEIGHT;
    }
    for (let colNum = 0; colNum < numberOfCols; colNum++) {
      if (figure.anchor.col === colNum) {
        offset.x += width;
      }
      width += this.getters.getColSize(sheetId, colNum);
    }
    offset = {
      x: clip(offset.x, 0, Math.max(width - figure.width, 0)),
      y: clip(offset.y, 0, Math.max(height - figure.height, 0)),
    };

    return { anchor: { col: 0, row: 0 }, offset };
  }

  private getPositionInSheetAnchor(sheetId: UID, figure: Figure): AnchorOffset {
    const { numberOfRows, numberOfCols } = this.getters.getSheetSize(sheetId);
    let availableHeight = 0,
      availableWidth = 0;
    let rowNum, colNum;
    let anchor = { ...figure.anchor },
      offset = { ...figure.offset };

    // Position is under the anchor cell
    for (
      let rowSize = this.getters.getUserRowSize(sheetId, anchor.row) ?? DEFAULT_CELL_HEIGHT;
      offset.y > rowSize;
      this.getters.getUserRowSize(sheetId, anchor.row) ?? DEFAULT_CELL_HEIGHT
    ) {
      anchor.row++;
      offset.y -= rowSize;
    }

    // Position is above the anchor cell
    while (offset.y < 0 && anchor.row > 0) {
      anchor.row--;
      offset.y += this.getters.getUserRowSize(sheetId, anchor.row) ?? DEFAULT_CELL_HEIGHT;
    }

    // Check figure is inside the sheet vertical boundaries
    for (rowNum = numberOfRows; rowNum > 0 && availableHeight < figure.height; rowNum--) {
      availableHeight += this.getters.getUserRowSize(sheetId, rowNum - 1) ?? DEFAULT_CELL_HEIGHT;
    }

    if (rowNum < anchor.row) {
      anchor.row = rowNum;
      offset.y = Math.max(availableHeight - figure.height, 0);
    } else if (rowNum == anchor.row) {
      offset.y = clip(offset.y, 0, Math.max(availableHeight - figure.height, 0));
    }

    // Position is right of the anchor cell
    for (
      let colSize = this.getters.getColSize(sheetId, anchor.col);
      offset.x > colSize;
      colSize = this.getters.getColSize(sheetId, anchor.col)
    ) {
      anchor.col++;
      offset.x -= colSize;
    }

    // Position is left the anchor cell
    while (offset.x < 0 && anchor.col > 0) {
      anchor.col--;
      offset.x += this.getters.getColSize(sheetId, anchor.col);
    }

    // Check figure is inside horinzontal sheet boundaries
    for (colNum = numberOfCols; colNum > 0 && availableWidth < figure.width; colNum--) {
      availableWidth += this.getters.getColSize(sheetId, colNum - 1);
    }
    if (colNum < anchor.col) {
      anchor.col = colNum;
      offset.x = Math.max(availableWidth - figure.width, 0);
    } else if (colNum == anchor.col) {
      offset.x = clip(offset.x, 0, Math.max(availableWidth - figure.width, 0));
    }
    return { anchor, offset };
  }

  private updateFigure(sheetId: string, update: Partial<Figure>) {
    if (!("id" in update)) {
      return;
    }
    const figure: Figure = { ...this.getFigure(sheetId, update.id!)!, ...update };
    const figureUpdate: Partial<Figure> = {
      ...update,
      ...this.getPositionInSheet(sheetId, figure),
    };
    for (const [key, value] of Object.entries(figureUpdate)) {
      switch (key) {
        case "fixed_position":
          this.history.update("figures", sheetId, figure.id!, key, value as boolean);
          break;
        case "offset":
          const offset = value as PixelPosition;
          this.history.update("figures", sheetId, figure.id!, key, {
            x: Math.max(offset.x || 0, 0),
            y: Math.max(offset.y || 0, 0),
          });
          break;
        case "anchor":
          const anchor = value as Position;
          this.history.update("figures", sheetId, figure.id!, key, {
            col: Math.max(anchor.col || 0, 0),
            row: Math.max(anchor.row || 0, 0),
          });
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
    figure = { ...figure, ...this.getPositionInSheet(sheetId, figure) };
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
    return this.export(data);
  }
}
