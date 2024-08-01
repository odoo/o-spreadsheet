import { isInside, overlap, positions, range, zoneToDimension } from "../../helpers/index";
import { sortCells } from "../../helpers/sort";
import { _t } from "../../translation";
import type {
  CellPosition,
  Command,
  EvaluatedCell,
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
import { CellValueType, CommandResult } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class SortPlugin extends UIPlugin {
  static getters = ["getContiguousZone"] as const;

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

  // getContiguousZone helpers

  /**
   * safe-version of expandZone to make sure we don't get out of the grid
   */
  private expand(sheetId: UID, z: Zone) {
    const { left, right, top, bottom } = this.getters.expandZone(sheetId, z);
    return {
      left: Math.max(0, left),
      right: Math.min(this.getters.getNumberCols(sheetId) - 1, right),
      top: Math.max(0, top),
      bottom: Math.min(this.getters.getNumberRows(sheetId) - 1, bottom),
    };
  }

  /**
   * verifies the presence of at least one non-empty cell in the given zone
   */
  private checkExpandedValues(sheetId: UID, z: Zone): boolean {
    const expandedZone = this.expand(sheetId, z);
    let cell: EvaluatedCell | undefined;
    if (this.getters.doesIntersectMerge(sheetId, expandedZone)) {
      const { left, right, top, bottom } = expandedZone;
      for (let c = left; c <= right; c++) {
        for (let r = top; r <= bottom; r++) {
          const { col, row } = this.getters.getMainCellPosition({ sheetId, col: c, row: r });
          cell = this.getters.getEvaluatedCell({ sheetId, col, row });
          if (cell.formattedValue) {
            return true;
          }
        }
      }
    } else {
      for (let cell of this.getters.getEvaluatedCellsInZone(sheetId, expandedZone)) {
        if (cell.formattedValue) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * This function will expand the provided zone in directions (top, bottom, left, right) for which there
   * are non-null cells on the external boundary of the zone in the given direction.
   *
   * Example:
   *          A     B     C     D     E
   *         ___   ___   ___   ___   ___
   *    1  |     |  D  |     |     |     |
   *         ___   ___   ___   ___   ___
   *    2  |  5  |     |  1  |  D  |     |
   *         ___   ___   ___   ___   ___
   *    3  |     |     |  A  |  X  |     |
   *         ___   ___   ___   ___   ___
   *    4  |     |     |     |     |     |
   *         ___   ___   ___   ___   ___
   *
   *  Let's consider a provided zone corresponding to (C2:D3) - (left:2, right: 3, top:1, bottom:2)
   *  - the top external boundary is (B1:E1)
   *    Since we have B1='D' != "", we expand to the top: => (C1:D3)
   *    The top boundary having reached the top of the grid, we cannot expand in that direction anymore
   *
   *  - the left boundary is (B1:B4)
   *    since we have B1 again, we expand to the left  => (B1:D3)
   *
   *  - the right and bottom boundaries are a dead end for now as (E1:E4) and (A4:E4) are empty.
   *
   *  - the left boundary is now (A1:A4)
   *    Since we have A2=5 != "", we can therefore expand to the left => (A1:D3)
   *
   *  This will be the final zone as left and top have reached the boundaries of the grid and
   *  the other boundaries (E1:E4) and (A4:E4) are empty.
   *
   * @param sheetId UID of concerned sheet
   * @param zone Zone
   *
   */
  getContiguousZone(sheetId: UID, zone: Zone): Zone {
    let { top, bottom, left, right } = zone;
    let canExpand: boolean;

    let stop: boolean = false;
    while (!stop) {
      stop = true;
      /** top row external boundary */
      if (top > 0) {
        canExpand = this.checkExpandedValues(sheetId, {
          left: left - 1,
          right: right + 1,
          top: top - 1,
          bottom: top - 1,
        });
        if (canExpand) {
          stop = false;
          top--;
        }
      }
      /** left column external boundary */
      if (left > 0) {
        canExpand = this.checkExpandedValues(sheetId, {
          left: left - 1,
          right: left - 1,
          top: top - 1,
          bottom: bottom + 1,
        });
        if (canExpand) {
          stop = false;
          left--;
        }
      }
      /** right column external boundary */
      if (right < this.getters.getNumberCols(sheetId) - 1) {
        canExpand = this.checkExpandedValues(sheetId, {
          left: right + 1,
          right: right + 1,
          top: top - 1,
          bottom: bottom + 1,
        });
        if (canExpand) {
          stop = false;
          right++;
        }
      }
      /** bottom row external boundary */
      if (bottom < this.getters.getNumberRows(sheetId) - 1) {
        canExpand = this.checkExpandedValues(sheetId, {
          left: left - 1,
          right: right + 1,
          top: bottom + 1,
          bottom: bottom + 1,
        });
        if (canExpand) {
          stop = false;
          bottom++;
        }
      }
    }
    return { left, right, top, bottom };
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
              cell.compiledFormula
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
