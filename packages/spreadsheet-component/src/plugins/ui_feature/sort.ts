import { isInside, overlap, positions, range, zoneToDimension } from "../../helpers/index";
import { sortCells } from "../../helpers/sort";
import { _t } from "../../translation";
import {
  CellPosition,
  CellValueType,
  Command,
  CommandResult,
  HeaderIndex,
  LocalCommand,
  Position,
  SortCommand,
  SortDirection,
  SortOptions,
  UID,
  UpdateCellCommand,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class SortPlugin extends UIPlugin {
  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "SORT_CELLS":
        if (!isInside(cmd.col, cmd.row, cmd.zone)) {
          throw new Error(_t("The anchor must be part of the provided zone"));
        }
        return this.checkValidations(cmd, this.checkMerge, this.checkMergeSizes);
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SORT_CELLS":
        this.sortZone(cmd.sheetId, cmd, cmd.zone, cmd.sortDirection, cmd.sortOptions || {});
        break;
    }
  }

  private checkMerge({ sheetId, zone }: SortCommand): CommandResult {
    if (!this.getters.doesIntersectMerge(sheetId, zone)) {
      return CommandResult.Success;
    }
    /*Test the presence of single cells*/
    const singleCells = positions(zone).some(
      ({ col, row }) => !this.getters.isInMerge({ sheetId, col, row })
    );
    if (singleCells) {
      return CommandResult.InvalidSortZone;
    }
    return CommandResult.Success;
  }

  private checkMergeSizes({ sheetId, zone }: SortCommand): CommandResult {
    if (!this.getters.doesIntersectMerge(sheetId, zone)) {
      return CommandResult.Success;
    }
    const merges = this.getters.getMerges(sheetId).filter((merge) => overlap(merge, zone));
    /*Test the presence of merges of different sizes*/
    const mergeDimension = zoneToDimension(merges[0]);
    let [widthFirst, heightFirst] = [mergeDimension.numberOfCols, mergeDimension.numberOfRows];
    if (
      !merges.every((merge) => {
        let [widthCurrent, heightCurrent] = [
          merge.right - merge.left + 1,
          merge.bottom - merge.top + 1,
        ];
        return widthCurrent === widthFirst && heightCurrent === heightFirst;
      })
    ) {
      return CommandResult.InvalidSortZone;
    }
    return CommandResult.Success;
  }

  /**
   * This function evaluates if the top row of a provided zone can be considered as a `header`
   * by checking the following criteria:
   * * If the left-most column top row value (topLeft) is empty, we ignore it while evaluating the criteria.
   * 1 - Apart from the left-most column, every element of the top row must be non-empty, i.e. a cell should be present in the sheet.
   * 2 - There should be at least one column in which the type (CellValueType) of the rop row cell differs from the type of the cell below.
   *  For the second criteria, we ignore columns on which the cell below is empty.
   *
   */
  private hasHeader(sheetId: UID, items: Position[][]): boolean {
    if (items[0].length === 1) return false;
    let cells: CellValueType[][] = items.map((col) =>
      col.map(({ col, row }) => this.getters.getEvaluatedCell({ sheetId, col, row }).type)
    );

    // ignore left-most column when topLeft cell is empty
    const topLeft = cells[0][0];
    if (topLeft === CellValueType.empty) {
      cells = cells.slice(1);
    }
    if (cells.some((item) => item[0] === CellValueType.empty)) {
      return false;
    } else if (cells.some((item) => item[1] !== CellValueType.empty && item[0] !== item[1])) {
      return true;
    } else {
      return false;
    }
  }

  private sortZone(
    sheetId: UID,
    anchor: Position,
    zone: Zone,
    sortDirection: SortDirection,
    options: SortOptions
  ) {
    const [stepX, stepY] = this.mainCellsSteps(sheetId, zone);
    let sortingCol: HeaderIndex = this.getters.getMainCellPosition({
      sheetId,
      col: anchor.col,
      row: anchor.row,
    }).col; // fetch anchor
    let sortZone = Object.assign({}, zone);
    // Update in case of merges in the zone
    let cellPositions = this.mainCells(sheetId, zone);

    if (!options.sortHeaders && this.hasHeader(sheetId, cellPositions)) {
      sortZone.top += stepY;
    }
    cellPositions = this.mainCells(sheetId, sortZone);

    const sortingCells = cellPositions[sortingCol - sortZone.left];
    const sortedIndexOfSortTypeCells = sortCells(
      sortingCells.map((position) => this.getters.getEvaluatedCell(position)),
      sortDirection,
      Boolean(options.emptyCellAsZero)
    );
    const sortedIndex: number[] = sortedIndexOfSortTypeCells.map((x) => x.index);

    const [width, height]: [number, number] = [cellPositions.length, cellPositions[0].length];

    const updateCellCommands: Omit<UpdateCellCommand, "type">[] = [];
    for (let c: HeaderIndex = 0; c < width; c++) {
      for (let r: HeaderIndex = 0; r < height; r++) {
        let { col, row, sheetId } = cellPositions[c][sortedIndex[r]];
        const cell = this.getters.getCell({ sheetId, col, row });
        let newCol: HeaderIndex = sortZone.left + c * stepX;
        let newRow: HeaderIndex = sortZone.top + r * stepY;
        let newCellValues: Omit<UpdateCellCommand, "type"> = {
          sheetId: sheetId,
          col: newCol,
          row: newRow,
          content: "",
        };
        if (cell) {
          let content: string = cell.content;
          if (cell.isFormula) {
            const position = this.getters.getCellPosition(cell.id);
            // we only have a vertical offset
            content = this.getters.getTranslatedCellFormula(
              sheetId,
              0,
              newRow - position.row,
              cell.compiledFormula.tokens
            );
          }
          newCellValues.style = cell.style;
          newCellValues.content = content;
          newCellValues.format = cell.format;
        }
        updateCellCommands.push(newCellValues);
      }
    }
    updateCellCommands.forEach((cmdPayload) => this.dispatch("UPDATE_CELL", cmdPayload));
  }

  /**
   * Return the distances between main merge cells in the zone.
   * (1 if there are no merges).
   * Note: it is assumed all merges are the same in the zone.
   */
  private mainCellsSteps(sheetId: UID, zone: Zone): [number, number] {
    const merge = this.getters.getMerge({ sheetId, col: zone.left, row: zone.top });
    const stepX = merge ? merge.right - merge.left + 1 : 1;
    const stepY = merge ? merge.bottom - merge.top + 1 : 1;
    return [stepX, stepY];
  }

  /**
   * Return a 2D array of cells in the zone (main merge cells if there are merges)
   */
  private mainCells(sheetId: UID, zone: Zone): CellPosition[][] {
    const [stepX, stepY] = this.mainCellsSteps(sheetId, zone);
    const cells: CellPosition[][] = [];
    const cols = range(zone.left, zone.right + 1, stepX);
    const rows = range(zone.top, zone.bottom + 1, stepY);
    for (const col of cols) {
      const colCells: CellPosition[] = [];
      cells.push(colCells);
      for (const row of rows) {
        colCells.push({ sheetId, col, row });
      }
    }
    return cells;
  }
}
