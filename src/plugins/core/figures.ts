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
          left: figure.col,
          right: figure.col,
          top: figure.row,
          bottom: figure.row,
        })
      );
      if (change.changeType == "MOVE") {
        this.history.update("figures", sheetId, figure.id, "col", change.range.zone.right);
        this.history.update("figures", sheetId, figure.id, "row", change.range.zone.bottom);
      } else if (change.changeType == "REMOVE") {
        const fullchange = applyChange(
          this.getters.getRangeFromZone(sheetId, {
            left: 0,
            right: figure.col - 1,
            top: 0,
            bottom: figure.row - 1,
          })
        );
        let { offset, col, row } = figure;
        if (fullchange.changeType != "NONE") {
          col = fullchange.range.zone.right + 1;
          row = fullchange.range.zone.bottom + 1;
        }
        ({ offset, col, row } = this.getPositionInSheet(sheetId, { ...figure, col, row }));
        this.history.update("figures", sheetId, figure.id, "offset", offset);
        this.history.update("figures", sheetId, figure.id, "col", col);
        this.history.update("figures", sheetId, figure.id, "row", row);
      }
    }
  }

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_FIGURE":
        return this.checkFigureDuplicate(cmd.figureId);
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
        const figure: Figure = {
          id: cmd.figureId,
          col: cmd.col,
          row: cmd.row,
          offset: cmd.offset,
          width: cmd.size.width,
          height: cmd.size.height,
          tag: cmd.tag,
        };
        this.addFigure(figure, cmd.sheetId);
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
      if (figure.offset.x + figure.width > remainingSize[figure.col]) {
        let x = figure.offset.x;
        let col = figure.col;

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
        if (col != figure.col) {
          this.history.update("figures", sheetId, figure.id!, "col", col);
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
      if (figure.offset.y + figure.height > remainingSize[figure.row]) {
        let y = figure.offset.y;
        let row = figure.row;
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
        if (row != figure.row) {
          this.history.update("figures", sheetId, figure.id!, "row", row);
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
    let { col, row } = figure,
      offset = { ...figure.offset };

    // Position is under the anchor cell
    for (
      let rowSize = this.getters.getUserRowSize(sheetId, row) ?? DEFAULT_CELL_HEIGHT;
      offset.y > rowSize;
      this.getters.getUserRowSize(sheetId, row) ?? DEFAULT_CELL_HEIGHT
    ) {
      row++;
      offset.y -= rowSize;
    }

    // Position is above the anchor cell
    while (offset.y < 0 && row > 0) {
      row--;
      offset.y += this.getters.getUserRowSize(sheetId, row) ?? DEFAULT_CELL_HEIGHT;
    }

    // Check figure is inside the sheet vertical boundaries
    for (rowNum = numberOfRows; rowNum > 0 && availableHeight < figure.height; rowNum--) {
      availableHeight += this.getters.getUserRowSize(sheetId, rowNum - 1) ?? DEFAULT_CELL_HEIGHT;
    }

    if (rowNum < row) {
      row = rowNum;
      offset.y = Math.max(availableHeight - figure.height, 0);
    } else if (rowNum == row) {
      offset.y = clip(offset.y, 0, Math.max(availableHeight - figure.height, 0));
    }

    // Position is right of the anchor cell
    for (
      let colSize = this.getters.getColSize(sheetId, col);
      offset.x > colSize;
      colSize = this.getters.getColSize(sheetId, col)
    ) {
      col++;
      offset.x -= colSize;
    }

    // Position is left the anchor cell
    while (offset.x < 0 && col > 0) {
      col--;
      offset.x += this.getters.getColSize(sheetId, col);
    }

    // Check figure is inside horinzontal sheet boundaries
    for (colNum = numberOfCols; colNum > 0 && availableWidth < figure.width; colNum--) {
      availableWidth += this.getters.getColSize(sheetId, colNum - 1);
    }
    if (colNum < col) {
      col = colNum;
      offset.x = Math.max(availableWidth - figure.width, 0);
    } else if (colNum == col) {
      offset.x = clip(offset.x, 0, Math.max(availableWidth - figure.width, 0));
    }
    return { col, row, offset };
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
        case "col":
        case "row":
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
