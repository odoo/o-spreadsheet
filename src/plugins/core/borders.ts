import { CELL_BORDER_COLOR } from "../../constants";
import {
  createRange,
  deepCopy,
  getItemId,
  groupItemIdsByZones,
  iterateItemIdsPositions,
  positionToZone,
  recomputeZones,
  toZone,
} from "../../helpers/index";
import { Border, BorderData, BorderPositionDescr, BorderStyle } from "../../types/border";
import {
  ApplyRangeChange,
  CellPosition,
  Color,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  HeaderIndex,
  SetBorderCommand,
  UID,
  UnboundedZone,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface BordersPluginState {
  readonly borders: Record<UID, Border[] | undefined>;
}
/**
 * Formatting plugin.
 *
 * This plugin manages all things related to a cell look:
 * - borders
 */
export class BordersPlugin extends CorePlugin<BordersPluginState> implements BordersPluginState {
  static getters = ["getCellBorder", "getBordersColors", "getBorders"] as const;

  public readonly borders: BordersPluginState["borders"] = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_BORDER":
        return this.checkBordersUnchanged(cmd);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.addBordersToMerge(cmd.sheetId, zone);
        }
        break;
      case "DUPLICATE_SHEET":
        this.history.update("borders", cmd.sheetIdTo, deepCopy(this.borders[cmd.sheetId]));
        break;
      case "DELETE_SHEET":
        const allBorders = { ...this.borders };
        delete allBorders[cmd.sheetId];
        this.history.update("borders", allBorders);
        break;
      case "SET_BORDER":
        if (!cmd.border?.position) break;
        this.setBorders(
          cmd.sheetId,
          [positionToZone(cmd)],
          cmd.border.position,
          cmd.border.color,
          cmd.border.style
        );
        break;
      case "SET_BORDERS_ON_TARGET":
      case "SET_ZONE_BORDERS":
        if (cmd.border) {
          const target = cmd.target.map((zone) => this.getters.expandZone(cmd.sheetId, zone));
          this.setBorders(
            cmd.sheetId,
            target,
            cmd.border.position,
            cmd.border.color,
            cmd.border.style
          );
        }
        break;
      case "CLEAR_FORMATTING":
        this.setBorders(cmd.sheetId, cmd.target, "clear");
        break;
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID, sheetName?: string) {
    const sheetIds = sheetId ? [sheetId] : Object.keys(this.borders);
    for (const sheetId of sheetIds) {
      this.adaptBorderRange(applyChange, sheetId);
    }
  }

  private adaptBorderRange(applyChange: ApplyRangeChange, sheetId: UID) {
    const newBorders: Border[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      const change = applyChange(
        createRange(
          { zone: border.zone, sheetId, parts: [], prefixSheet: false },
          this.getters.getSheetSize
        )
      );
      switch (change.changeType) {
        case "RESIZE":
        case "CHANGE":
        case "MOVE":
          border.zone = change.range.unboundedZone;
          newBorders.push(border);
          break;
        case "NONE":
          newBorders.push(border);
          break;
      }
    }
    this.history.update(
      "borders",
      sheetId,
      newBorders.filter((border) => !this.borderIsClear(border))
    );
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellBorder({ sheetId, col, row }: CellPosition): Border | null {
    return null;
  }

  getBordersColors(sheetId: UID): Color[] {
    return this.borders[sheetId]?.map((border) => border.border.color) || [];
  }

  getBorders(sheetId: UID): Border[] {
    return this.borders[sheetId] ?? [];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Ensure border continuity between two columns.
   * If the two columns have the same borders (at each row respectively),
   * the same borders are applied to each cell in between.
   */
  // private ensureColumnBorderContinuity(
  //   sheetId: UID,
  //   leftColumn: HeaderIndex,
  //   rightColumn: HeaderIndex
  // ) {
  //   // TODO ?
  //   // const targetCols = range(leftColumn + 1, rightColumn);
  //   // for (let row: HeaderIndex = 0; row < this.getters.getNumberRows(sheetId); row++) {
  //   //   const leftBorder = this.getCellBorder({ sheetId, col: leftColumn, row });
  //   //   const rightBorder = this.getCellBorder({ sheetId, col: rightColumn, row });
  //   //   if (leftBorder && rightBorder) {
  //   //     const commonSides = this.getCommonSides(leftBorder, rightBorder);
  //   //     for (const col of targetCols) {
  //   //       this.addBorders(sheetId, col, row, commonSides);
  //   //     }
  //   //   }
  //   // }
  // }

  /**
   * Ensure border continuity between two rows.
   * If the two rows have the same borders (at each column respectively),
   * the same borders are applied to each cell in between.
   */
  // private ensureRowBorderContinuity(sheetId: UID, topRow: HeaderIndex, bottomRow: HeaderIndex) {
  //   // TODO ?
  //   // const targetRows = range(topRow + 1, bottomRow);
  //   // for (let col: HeaderIndex = 0; col < this.getters.getNumberCols(sheetId); col++) {
  //   //   const aboveBorder = this.getCellBorder({ sheetId, col, row: topRow });
  //   //   const belowBorder = this.getCellBorder({ sheetId, col, row: bottomRow });
  //   //   if (aboveBorder && belowBorder) {
  //   //     const commonSides = this.getCommonSides(aboveBorder, belowBorder);
  //   //     for (const row of targetRows) {
  //   //       this.addBorders(sheetId, col, row, commonSides);
  //   //     }
  //   //   }
  //   // }
  // }

  /**
   * From two borders, return a new border with sides defined in both borders.
   * i.e. the intersection of two borders.
   */
  // private getCommonSides(border1: Border, border2: Border): Border {
  //   const commonBorder = {};
  //   for (const side of ["top", "bottom", "left", "right"]) {
  //     if (border1[side] && deepEquals(border1[side], border2[side])) {
  //       commonBorder[side] = border1[side];
  //     }
  //   }
  //   return commonBorder;
  // }

  /**
   * Get all the columns which contains at least a border
   */
  // private getColumnsWithBorders(sheetId: UID): HeaderIndex[] {
  //   const sheetBorders = this.borders[sheetId];
  //   if (!sheetBorders) return [];
  //   return Object.keys(sheetBorders).map((index) => parseInt(index, 10));
  // }

  // /**
  //  * Get all the rows which contains at least a border
  //  */
  // private getRowsWithBorders(sheetId: UID): number[] {
  //   const sheetBorders = this.borders[sheetId]?.filter(isDefined);
  //   if (!sheetBorders) return [];
  //   const rowsWithBorders = new Set<number>();
  //   for (const rowBorders of sheetBorders) {
  //     for (const rowBorder in rowBorders) {
  //       rowsWithBorders.add(parseInt(rowBorder, 10));
  //     }
  //   }
  //   return Array.from(rowsWithBorders);
  // }

  // /**
  //  * Get the range of all the rows in the sheet
  //  */
  // private getRowsRange(sheetId: UID): HeaderIndex[] {
  //   const sheetBorders = this.borders[sheetId];
  //   if (!sheetBorders) return [];
  //   return range(0, this.getters.getNumberRows(sheetId) + 1);
  // }

  // /**
  //  * Remove the borders inside of a zone
  //  */
  // private clearInsideBorders(sheetId: UID, zones: Zone[]) {
  //   // TODO
  // }

  private getNewBorderFromZone(newZone: UnboundedZone, oldBorder: Border): Border {
    const oldPosition = oldBorder.border.position;
    const oldZone = oldBorder.zone;
    const equalSide = {
      top: newZone.top === oldZone.top,
      bottom: newZone.bottom === oldZone.bottom,
      left: newZone.left === oldZone.left,
      right: newZone.right === oldZone.right,
    };
    return {
      zone: newZone,
      border: {
        color: oldBorder.border.color,
        style: oldBorder.border.style,
        position: {
          top: equalSide.top ? oldPosition.top : undefined,
          bottom: equalSide.bottom ? oldPosition.bottom : undefined,
          left: equalSide.left
            ? oldPosition.left
            : equalSide.bottom && equalSide.top
            ? undefined
            : oldPosition.vertical,
          right: equalSide.right
            ? oldPosition.right
            : equalSide.bottom && equalSide.top
            ? undefined
            : oldPosition.vertical,
          vertical: oldPosition.vertical,
          horizontal: oldPosition.horizontal,
        },
      },
    };
  }

  private borderIsClear(border: Border) {
    const pos = border.border.position;
    if (pos.left || pos.right || pos.bottom || pos.top) return false;
    const zone = border.zone;
    if ((zone.bottom === undefined || zone.top + 1 < zone.bottom) && pos.horizontal) return false;
    if ((zone.right === undefined || zone.left + 1 < zone.right) && pos.vertical) return false;
    return true;
  }

  /**
   * Add a border to the existing one to a cell
   */
  private addBorder(sheetId: UID, zone: Zone, border: BorderData) {
    const newBorders: Border[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      for (const updatedBorderZone of recomputeZones([border.zone], [zone])) {
        newBorders.push(this.getNewBorderFromZone(updatedBorderZone, border));
      }
    }
    newBorders.push({ zone, border });
    this.history.update(
      "borders",
      sheetId,
      newBorders.filter((border) => !this.borderIsClear(border))
    );
  }

  private getBorderData(
    position: BorderPositionDescr,
    color: Color = CELL_BORDER_COLOR,
    style: BorderStyle = "medium"
  ): BorderData {
    const borderPosition = {};
    if (["all", "external", "top"].includes(position)) {
      borderPosition["top"] = true;
    }
    if (["all", "external", "bottom"].includes(position)) {
      borderPosition["bottom"] = true;
    }
    if (["all", "external", "left"].includes(position)) {
      borderPosition["left"] = true;
    }
    if (["all", "external"].includes(position)) {
      borderPosition["right"] = true;
    }
    if (["all", "hv", "v"].includes(position)) {
      borderPosition["vertical"] = true;
    }
    if (["all", "hv", "h"].includes(position)) {
      borderPosition["horizontal"] = true;
    }
    return {
      position: borderPosition,
      color,
      style,
    };
  }

  /**
   * Set the borders of a zone by computing the borders to add from the given
   * command
   */
  private setBorders(
    sheetId: UID,
    zones: Zone[],
    position: BorderPositionDescr,
    color?: Color,
    style?: BorderStyle
  ) {
    const borderData = this.getBorderData(position, color, style);
    for (const zone of recomputeZones(zones)) {
      this.addBorder(sheetId, zone, borderData);
    }
  }

  /**
   * Compute the borders to add to the given zone merged.
   */
  private addBordersToMerge(sheetId: UID, zone: Zone) {
    // const { left, right, top, bottom } = zone;
    // const bordersTopLeft = this.getCellBorder({ sheetId, col: left, row: top });
    // const bordersBottomRight = this.getCellBorder({ sheetId, col: right, row: bottom });
    this.setBorders(sheetId, [zone], "clear");
    // TODO
  }

  private checkBordersUnchanged(cmd: SetBorderCommand) {
    // TODO
    return CommandResult.Success;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // Borders
    if (Object.keys(data.borders || {}).length) {
      for (const sheet of data.sheets) {
        for (const [position, borderId] of iterateItemIdsPositions(sheet.id, sheet.borders)) {
          const { sheetId } = position;
          const border = data.borders[borderId];
          this.setBorders(
            sheetId,
            [positionToZone(position)],
            border.position,
            border.color,
            border.style
          );
        }
      }
    }
    // Merges
    for (const sheetData of data.sheets) {
      if (sheetData.merges) {
        for (const merge of sheetData.merges) {
          this.addBordersToMerge(sheetData.id, toZone(merge));
        }
      }
    }
  }

  export(data: WorkbookData) {
    const borders: { [borderId: number]: Border } = {};
    for (const sheet of data.sheets) {
      const positionsByBorder: Record<number, CellPosition[]> = {};
      for (let col: HeaderIndex = 0; col < sheet.colNumber; col++) {
        for (let row: HeaderIndex = 0; row < sheet.rowNumber; row++) {
          const border = this.getCellBorder({ sheetId: sheet.id, col, row });
          if (border) {
            const borderId = getItemId(border, borders);
            const position = { sheetId: sheet.id, col, row };
            positionsByBorder[borderId] ??= [];
            positionsByBorder[borderId].push(position);
          }
        }
      }
      sheet.borders = groupItemIdsByZones(positionsByBorder);
    }
    // TODO
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
