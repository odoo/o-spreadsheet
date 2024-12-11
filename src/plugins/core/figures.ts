import { DEFAULT_CELL_HEIGHT } from "../../constants";
import { clip } from "../../helpers/index";
import { AnchorOffset } from "../../types/figure";
import {
  ApplyRangeChange,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Figure,
  PixelPosition,
  Position,
  UID,
  UpdateFigureCommand,
  WorkbookData,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface FigureState {
  readonly figures: { [sheet: string]: Record<UID, Figure | undefined> | undefined };
  readonly insertionOrders: UID[];
}

export class FigurePlugin extends CorePlugin<FigureState> implements FigureState {
  static getters = ["getFigures", "getFigure", "getFigureSheetId"] as const;
  readonly figures: {
    [sheet: string]: Record<UID, Figure | undefined> | undefined;
  } = {};
  readonly insertionOrders: UID[] = []; // TODO use a list in master
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    if (!sheetId) {
      return;
    }
    for (const figure of this.getFigures(sheetId)) {
      const change = applyChange(
        this.getters.getRangeFromZone(sheetId, {
          left: figure.anchor.col,
          right: figure.anchor.col,
          top: figure.anchor.row,
          bottom: figure.anchor.row,
        })
      );
      if (change.changeType == "MOVE") {
        this.history.update("figures", sheetId, figure.id!, "anchor", {
          row: change.range.zone.top,
          col: change.range.zone.left,
        } as Position);
      } else if (change.changeType == "REMOVE") {
        const anchor = figure.anchor;
        const offset = figure.offset;
        for (
          let col_size = this.getters.getColSize(sheetId, anchor.col);
          col_size < offset.x;
          col_size = this.getters.getColSize(sheetId, anchor.col)
        ) {
          anchor.col += 1;
          offset.x -= col_size;
        }
        for (
          let row_size = this.getters.getUserRowSize(sheetId, anchor.row) ?? DEFAULT_CELL_HEIGHT;
          row_size < offset.y;
          row_size = this.getters.getUserRowSize(sheetId, anchor.row) ?? DEFAULT_CELL_HEIGHT
        ) {
          anchor.row += 1;
          offset.y -= row_size;
        }
        this.history.update("figures", sheetId, figure.id!, "offset", {
          x: Math.max(offset.x, 0),
          y: Math.max(offset.y, 0),
        } as PixelPosition);
        this.history.update("figures", sheetId, figure.id!, "anchor", {
          row: anchor.row,
          col: anchor.col,
        } as Position);
      }
    }
  }

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_FIGURE":
        return this.checkFigureDuplicate(cmd.figure.id);
      case "UPDATE_FIGURE":
      case "DELETE_FIGURE":
        return this.checkFigureExists(cmd.sheetId, cmd.figureId);
      default:
        return CommandResult.Success;
    }
  }

  beforeHandle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "DELETE_SHEET":
        this.getters.getFigures(cmd.sheetId).forEach((figure) => {
          this.dispatch("DELETE_FIGURE", { figureId: figure.id, sheetId: cmd.sheetId });
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
        this.updateFigure(cmd);
        break;
      case "DELETE_FIGURE":
        this.removeFigure(cmd.figureId, cmd.sheetId);
        break;
      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.onColRemove(cmd.sheetId);
        } else {
          this.onRowRemove(cmd.sheetId);
        }
        break;
    }
  }

  private onColRemove(sheetId: string) {
    const numHeader = this.getters.getNumberCols(sheetId);
    const remainingSize: number[] = new Array(numHeader + 1);
    remainingSize[numHeader] = 0;
    for (let i = numHeader - 1; i >= 0; i--) {
      remainingSize[i] = remainingSize[i + 1] + this.getters.getColSize(sheetId, i);
    }

    for (const figure of this.getFigures(sheetId)) {
      if (figure.offset.x + figure.width > remainingSize[figure.anchor.col]) {
        let x = figure.offset.x;
        let col = figure.anchor.col;

        x = Math.min(x, remainingSize[col] - figure.width);
        while (x < 0 && col > 0) {
          col--;
          x = remainingSize[col] - figure.width;
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
      }
    }
  }

  private onRowRemove(sheetId: string) {
    const numHeader = this.getters.getNumberRows(sheetId);
    const remainingSize: number[] = new Array(numHeader + 1);
    remainingSize[numHeader] = 0;
    for (let i = numHeader - 1; i >= 0; i--) {
      // TODO : since the row size is an UI value now, this doesn't work anymore. Using the default cell height is
      // a temporary solution at best, but is broken.
      remainingSize[i] =
        remainingSize[i + 1] + (this.getters.getUserRowSize(sheetId, i) ?? DEFAULT_CELL_HEIGHT);
    }

    for (const figure of this.getFigures(sheetId)) {
      if (figure.offset.y + figure.height > remainingSize[figure.anchor.row]) {
        let y = figure.offset.y;
        let row = figure.anchor.row;
        for (
          let row_size = this.getters.getUserRowSize(sheetId, row) ?? DEFAULT_CELL_HEIGHT;
          row_size < y;
          row_size = this.getters.getUserRowSize(sheetId, row) ?? DEFAULT_CELL_HEIGHT
        ) {
          row += 1;
          y -= row_size;
        }

        y = Math.min(y, remainingSize[row] - figure.height);
        while (y < 0 && row > 0) {
          row--;
          y = remainingSize[row] - figure.height;
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
      } else if (figure.offset.y + figure.height > remainingSize[0]) {
        this.history.update("figures", sheetId, figure.id!, "offset", {
          x: figure.offset.x,
          y: Math.max(remainingSize[0] - figure.height, 0),
        } as PixelPosition);
      }
    }
  }

  private getPositionInSheet(sheetId: UID, figure: Figure): AnchorOffset {
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

  private updateFigure(cmd: UpdateFigureCommand) {
    if (!("figureId" in cmd) || !("sheetId" in cmd)) {
      return;
    }
    const { figureId, sheetId, ...update } = cmd;
    const figure: Figure = { ...this.getFigure(sheetId, figureId)!, ...update };
    const figureUpdate: Partial<Figure> = {
      ...update,
      ...this.getPositionInSheet(sheetId, figure),
    };
    for (const [key, value] of Object.entries(figureUpdate)) {
      switch (key) {
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
    this.history.update("insertionOrders", this.insertionOrders.length, figure.id);
  }

  private deleteSheet(sheetId: UID) {
    this.history.update(
      "insertionOrders",
      this.insertionOrders.filter((id) => !this.figures[sheetId]?.[id])
    );
    this.history.update("figures", sheetId, undefined);
  }

  private removeFigure(id: string, sheetId: UID) {
    this.history.update(
      "insertionOrders",
      this.insertionOrders.filter((figureId) => figureId !== id)
    );
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
    const figures: Figure[] = [];
    for (const figureId of this.insertionOrders) {
      const figure = this.figures[sheetId]?.[figureId];
      if (figure) {
        figures.push(figure);
      }
    }
    return figures;
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
      for (const figure of sheet.figures) {
        this.addFigure(figure, sheet.id);
      }
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
