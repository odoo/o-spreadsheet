import { isFormula } from "../../helpers/cells/index";
import { isEqual, isInside, mapCellsInZone, overlap, zoneToDimension } from "../../helpers/index";
import { _lt } from "../../translation";
import {
  Cell,
  CellValueType,
  Command,
  CommandResult,
  Sheet,
  SortCommand,
  SortDirection,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

type Item = Cell | undefined;
type IndexItemMap = { index: number; val: Item }[];
type HeaderType = CellValueType;
type SortType = HeaderType;
type SortTypeValueMap = { type: SortType; value: any };
type IndexSortTypeValueMap = { index: number; val: SortTypeValueMap }[];
type IndexSTVMapItem = { index: number; val: Item | SortTypeValueMap }[];

export class SortPlugin extends UIPlugin {
  static getters = ["getContiguousZone"];

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "SORT_CELLS":
        if (!isInside(cmd.anchor[0], cmd.anchor[1], cmd.zone)) {
          throw new Error(_lt("The anchor must be part of the provided zone"));
        }
        return this.checkValidations(cmd, this.checkMerge, this.checkMergeSizes);
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SORT_CELLS":
        if (cmd.interactive) {
          this.interactiveSortSelection(cmd.sheetId, cmd.anchor, cmd.zone, cmd.sortDirection);
        } else {
          this.sortZone(cmd.sheetId, cmd.anchor, cmd.zone, cmd.sortDirection);
        }
        break;
    }
  }

  private checkMerge({ sheetId, zone }: SortCommand): CommandResult {
    if (!this.getters.doesIntersectMerge(sheetId, zone)) {
      return CommandResult.Success;
    }
    /*Test the presence of single cells*/
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        if (!this.getters.isInMerge(sheetId, col, row)) {
          return CommandResult.InvalidSortZone;
        }
      }
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
    let [widthFirst, heightFirst] = [mergeDimension.width, mergeDimension.height];
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

  private interactiveSortSelection(
    sheetId: UID,
    anchor: [number, number],
    zone: Zone,
    sortDirection: SortDirection
  ) {
    let result: CommandResult = CommandResult.Success;

    //several columns => bypass the contiguity check
    let multiColumns: boolean = zone.right > zone.left;
    if (this.getters.doesIntersectMerge(sheetId, zone)) {
      multiColumns = false;
      let table: UID[];
      for (let r = zone.top; r <= zone.bottom; r++) {
        table = [];
        for (let c = zone.left; c <= zone.right; c++) {
          let merge = this.getters.getMerge(sheetId, c, r);
          if (merge && !table.includes(merge.id.toString())) {
            table.push(merge.id.toString());
          }
        }
        if (table.length >= 2) {
          multiColumns = true;
          break;
        }
      }
    }

    if (multiColumns) {
      result = this.dispatch("SORT_CELLS", { sheetId, anchor, zone, sortDirection });
    } else {
      // check contiguity
      const contiguousZone = this.getContiguousZone(sheetId, zone);
      if (isEqual(contiguousZone, zone)) {
        // merge as it is
        result = this.dispatch("SORT_CELLS", {
          sheetId,
          anchor,
          zone,
          sortDirection,
        });
      } else {
        this.ui.askConfirmation(
          _lt(
            "We found data next to your selection. Since this data was not selected, it will not be sorted. Do you want to extend your selection?"
          ),
          () => {
            zone = contiguousZone;
            result = this.dispatch("SORT_CELLS", {
              sheetId,
              anchor,
              zone,
              sortDirection,
            });
          },
          () => {
            result = this.dispatch("SORT_CELLS", {
              sheetId,
              anchor,
              zone,
              sortDirection,
            });
          }
        );
      }
    }
    if (result !== CommandResult.Success) {
      switch (result) {
        case CommandResult.InvalidSortZone:
          this.dispatch("SET_SELECTION", {
            anchor: anchor,
            zones: [zone],
            anchorZone: zone,
          });
          this.ui.notifyUser(
            _lt("Cannot sort. To sort, select only cells or only merges that have the same size.")
          );
          break;
      }
    }
  }

  // getContiguousZone helpers

  /**
   * safe-version of expandZone to make sure we don't get out of the grid
   */
  private expand(sheet: Sheet, z: Zone) {
    const { left, right, top, bottom } = this.getters.expandZone(sheet.id, z);
    return {
      left: Math.max(0, left),
      right: Math.min(sheet.cols.length - 1, right),
      top: Math.max(0, top),
      bottom: Math.min(sheet.rows.length - 1, bottom),
    };
  }

  /**
   * verifies the presence of at least one non-empty cell in the given zone
   */
  private checkExpandedValues(sheet: Sheet, z: Zone): boolean {
    const expandedZone = this.expand(sheet, z);
    const sheetId = sheet.id;
    let line: string[] = [];
    let cell: Cell | undefined;
    if (this.getters.doesIntersectMerge(sheetId, expandedZone)) {
      const { left, right, top, bottom } = expandedZone;
      for (let c = left; c <= right; c++) {
        for (let r = top; r <= bottom; r++) {
          const [mainCellCol, mainCellRow] = this.getters.getMainCell(sheetId, c, r);
          cell = this.getters.getCell(sheetId, mainCellCol, mainCellRow);
          line.push(cell?.formattedValue || "");
        }
      }
    } else {
      const values = mapCellsInZone(expandedZone, sheet, (cell) => cell.formattedValue, "");
      line = values.flat();
    }
    return line.some((item) => item !== "");
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
  private getContiguousZone(sheetId: UID, zone: Zone): Zone {
    let { top, bottom, left, right } = zone;
    let canExpand: boolean;
    const sheet = this.getters.getSheet(sheetId);

    let stop: boolean = false;
    while (!stop) {
      stop = true;
      /** top row external boundary */
      if (top > 0) {
        canExpand = this.checkExpandedValues(sheet, {
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
        canExpand = this.checkExpandedValues(sheet, {
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
      if (right < sheet.cols.length - 1) {
        canExpand = this.checkExpandedValues(sheet, {
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
      if (bottom < sheet.rows.length - 1) {
        canExpand = this.checkExpandedValues(sheet, {
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
   * 2 - There should be at least one column in which the type (HeaderType) of the rop row cell differs from the type of the cell below.
   *  For the second criteria, we ignore columns on which the cell below is empty.
   *
   */
  private hasHeader(sheet: Sheet, zone: Zone, deltaX: number, deltaY: number): boolean {
    const { left, right, top, bottom } = zone;
    if (bottom - top + 1 === 1) return false;

    let cells: HeaderType[][] = mapCellsInZone(
      { left, right, top: top, bottom: top + 2 * deltaY - 1 },
      sheet,
      (cell) => cell.evaluated.type,
      CellValueType.empty,
      deltaX,
      deltaY
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

  private sortCellsList(list: Item[], sortDirection: SortDirection): IndexSTVMapItem {
    const cellsIndex: IndexItemMap = list.map((val, index) => ({ index, val }));
    const sortingCellsIndexes: IndexItemMap = cellsIndex.filter(
      (x) => !(x.val == undefined || x.val.evaluated.value === "")
    );
    const emptyCellsIndexes: IndexItemMap = cellsIndex.filter(
      (x) => x.val == undefined || x.val.evaluated.value === ""
    );
    const inverse = sortDirection === "descending" ? -1 : 1;
    const sortTypes: SortType[] = [
      CellValueType.number,
      CellValueType.error,
      CellValueType.text,
      CellValueType.boolean,
    ];

    const convertCell = (cell: Cell): SortTypeValueMap => {
      let type = cell.evaluated.type;
      return { type: type, value: cell.evaluated.value };
    };

    const sortingTypeValueMapIndexes: IndexSortTypeValueMap = sortingCellsIndexes.map((item) => {
      return {
        index: item.index,
        val: convertCell(item.val!),
      };
    });

    const sortedIndex = sortingTypeValueMapIndexes.sort((left, right) => {
      let typeOrder = sortTypes.indexOf(left.val.type) - sortTypes.indexOf(right.val.type);
      if (typeOrder === 0) {
        if (left.val.type === CellValueType.text || left.val.type === CellValueType.error) {
          typeOrder = left.val.value.localeCompare(right.val.value);
        } else typeOrder = left.val.value - right.val.value;
      }
      return inverse * typeOrder;
    });

    return (sortedIndex as IndexSTVMapItem).concat(emptyCellsIndexes as IndexSTVMapItem);
  }

  private sortZone(
    sheetId: UID,
    anchor: [number, number],
    zone: Zone,
    sortDirection: SortDirection
  ) {
    let stepX: number = 1,
      stepY: number = 1,
      sortingCol: number = anchor[0]; // fetch anchor

    let sortZone = Object.assign({}, zone);
    // Update in case of merges in the zone
    if (this.getters.doesIntersectMerge(sheetId, sortZone)) {
      const [col, row] = anchor;
      const merge = this.getters.getMerge(sheetId, col, row)!;
      stepX = merge.right - merge.left + 1;
      stepY = merge.bottom - merge.top + 1;
      sortingCol = merge.topLeft.col;
    }

    const sheet = this.getters.getSheet(sheetId);
    const hasHeader = this.hasHeader(sheet, sortZone, stepX, stepY);
    if (hasHeader) {
      sortZone.top += stepY;
    }

    const cells = mapCellsInZone(sortZone, sheet, (cell) => cell, undefined, stepX, stepY);
    const sortingCells = cells[sortingCol - sortZone.left];
    const sortedIndexOfSortTypeCells: IndexSTVMapItem = this.sortCellsList(
      sortingCells,
      sortDirection
    );
    const sortedIndex: number[] = sortedIndexOfSortTypeCells.map((x) => x.index);

    const [width, height]: [number, number] = [cells.length, cells[0].length];

    for (let c = 0; c < width; c++) {
      for (let r = 0; r < height; r++) {
        let cell = cells[c][sortedIndex[r]];
        let newCol = sortZone.left + c * stepX;
        let newRow = sortZone.top + r * stepY;
        let newCellValues: any = {
          sheetId: sheetId,
          col: newCol,
          row: newRow,
          content: "",
          value: "",
        };
        if (cell) {
          let content: string = cell.content;
          if (isFormula(cell)) {
            const position = this.getters.getCellPosition(cell.id);
            const offsetY = newRow - position.row;
            // we only have a vertical offset
            const ranges = this.getters.createAdaptedRanges(cell.dependencies, 0, offsetY, sheetId);
            content = this.getters.buildFormulaContent(sheetId, cell.normalizedText, ranges);
          }
          newCellValues.style = cell.style;
          newCellValues.content = content;
          newCellValues.format = cell.format;
          newCellValues.value = cell.evaluated.value;
        }
        this.dispatch("UPDATE_CELL", newCellValues);
      }
    }
  }
}
