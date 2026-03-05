import { DEFAULT_BORDER_DESC } from "../../constants";
import {
  getItemId,
  groupItemIdsByZones,
  iterateItemIdsPositions,
} from "../../helpers/data_normalization";
import { deepCopy, deepEquals, groupConsecutive, isDefined, range } from "../../helpers/misc";
import { recomputeZones } from "../../helpers/recompute_zones";
import { cellPositions, extendZone, getZoneArea, isZoneOrdered, toZone } from "../../helpers/zones";
import {
  AddColumnsRowsCommand,
  CommandResult,
  CoreCommand,
  SetBorderCommand,
} from "../../types/commands";
import {
  Border,
  BorderDescr,
  BorderPosition,
  CellPosition,
  Color,
  Column,
  Dimension,
  HeaderIndex,
  UID,
  Zone,
} from "../../types/misc";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";
import { defaultValue } from "./default";

type BorderDescrEmpty = BorderDescr | { style: "empty"; color: Color };
export type BorderDescrInternal = { internal: "internal" | "external" | "both" } & BorderDescrEmpty;

interface BordersPluginState {
  readonly bordersTop: Record<UID, Column<BorderDescrInternal>[] | undefined>;
  readonly bordersLeft: Record<UID, Column<BorderDescrInternal>[] | undefined>;
  readonly defaultTop: Record<UID, defaultValue<BorderDescrInternal> | undefined>;
  readonly defaultLeft: Record<UID, defaultValue<BorderDescrInternal> | undefined>;
}

// Private helpers
const EMPTY_BORDER: BorderDescrInternal = Object.freeze({
  style: "empty",
  color: "",
  internal: "both",
});

function internal(border: BorderDescr | undefined): BorderDescrInternal {
  if (!border) {
    return EMPTY_BORDER;
  }
  return { ...border, internal: "internal" };
}

function external(border: BorderDescr | undefined): BorderDescrInternal {
  if (!border) {
    return EMPTY_BORDER;
  }
  return { ...border, internal: "external" };
}

function both(border: BorderDescr | undefined): BorderDescrInternal {
  if (!border) {
    return EMPTY_BORDER;
  }
  return { ...border, internal: "both" };
}

function toDescr(
  border: BorderDescrInternal | undefined,
  undefinedIf?: "external" | "internal"
): BorderDescr | undefined {
  if (!border || border.internal === undefinedIf || border.style === "empty") {
    return undefined;
  }
  return { color: border.color, style: border.style };
}

function leftCol(zone: Zone): Zone {
  return { left: zone.left, right: zone.left, top: zone.top, bottom: zone.bottom };
}
function rightCol(zone: Zone): Zone {
  return { left: zone.right + 1, right: zone.right + 1, top: zone.top, bottom: zone.bottom };
}
function topRow(zone: Zone): Zone {
  return { left: zone.left, right: zone.right, top: zone.top, bottom: zone.top };
}
function bottomRow(zone: Zone): Zone {
  return { left: zone.left, right: zone.right, top: zone.bottom + 1, bottom: zone.bottom + 1 };
}

/**
 * Formatting plugin.
 *
 * This plugin manages all things related to a cell look:
 * - borders
 */
export class BordersPlugin extends CorePlugin<BordersPluginState> implements BordersPluginState {
  static getters = ["getCellBorder", "getBordersColors", "getBorderClipboardData"] as const;

  public readonly bordersTop: BordersPluginState["bordersTop"] = {};
  public readonly bordersLeft: BordersPluginState["bordersLeft"] = {};
  public readonly defaultTop: BordersPluginState["defaultTop"] = {};
  public readonly defaultLeft: BordersPluginState["defaultLeft"] = {};

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
          this.mergeBorders(cmd.sheetId, zone);
        }
        break;
      case "DUPLICATE_SHEET":
        this.history.update("bordersTop", cmd.sheetIdTo, deepCopy(this["bordersTop"][cmd.sheetId]));
        this.history.update(
          "bordersLeft",
          cmd.sheetIdTo,
          deepCopy(this["bordersLeft"][cmd.sheetId])
        );
        this.history.update("defaultTop", cmd.sheetIdTo, deepCopy(this["defaultTop"][cmd.sheetId]));
        this.history.update(
          "defaultLeft",
          cmd.sheetIdTo,
          deepCopy(this["defaultLeft"][cmd.sheetId])
        );
        break;
      case "DELETE_SHEET":
        this.history.update("bordersTop", cmd.sheetId, undefined);
        this.history.update("bordersLeft", cmd.sheetId, undefined);
        this.history.update("defaultTop", cmd.sheetId, undefined);
        this.history.update("defaultLeft", cmd.sheetId, undefined);
        break;
      case "SET_BORDER": {
        if (cmd.border?.left || cmd.border === undefined) {
          this.setCellBorder("LEFT", cmd.sheetId, cmd.col, cmd.row, internal(cmd.border?.left));
        }
        if (cmd.border?.top || cmd.border === undefined) {
          this.setCellBorder("TOP", cmd.sheetId, cmd.col, cmd.row, internal(cmd.border?.top));
        }
        if (cmd.border?.right || cmd.border === undefined) {
          this.setCellBorder(
            "LEFT",
            cmd.sheetId,
            cmd.col + 1,
            cmd.row,
            external(cmd.border?.right)
          );
        }
        if (cmd.border?.bottom || cmd.border === undefined) {
          this.setCellBorder(
            "TOP",
            cmd.sheetId,
            cmd.col,
            cmd.row + 1,
            external(cmd.border?.bottom)
          );
        }
        break;
      }
      case "SET_BORDERS_ON_TARGET":
        if (!cmd.border) {
          this.clearBorders(cmd.sheetId, cmd.target);
          break;
        }
        if (cmd.border.left) {
          this.setBorder("LEFT", cmd.sheetId, cmd.target, internal(cmd.border?.left));
          if (cmd.border.right) {
            this.setBorder(
              "LEFT",
              cmd.sheetId,
              cmd.target.map(rightCol),
              external(cmd.border.right)
            );
          }
        } else if (cmd.border?.right) {
          this.setBorder(
            "LEFT",
            cmd.sheetId,
            cmd.target.map((z) => extendZone(extendZone(z, "right", 1), "left", -1)),
            external(cmd.border.right)
          );
        }

        if (cmd.border.top) {
          this.setBorder("TOP", cmd.sheetId, cmd.target, internal(cmd.border.top));
          if (cmd.border?.bottom) {
            this.setBorder(
              "TOP",
              cmd.sheetId,
              cmd.target.map(bottomRow),
              external(cmd.border.bottom)
            );
          }
        } else if (cmd.border.bottom) {
          this.setBorder(
            "TOP",
            cmd.sheetId,
            cmd.target.map((z) => extendZone(extendZone(z, "bottom", 1), "top", -1)),
            external(cmd.border.bottom)
          );
        }
        break;
      case "SET_ZONE_BORDERS":
        if (cmd.border) {
          const target = cmd.target.map((zone) => this.getters.expandZone(cmd.sheetId, zone));
          this.setBorders(
            cmd.sheetId,
            target,
            cmd.border.position,
            cmd.border.color === ""
              ? undefined
              : {
                  style: cmd.border.style || DEFAULT_BORDER_DESC.style,
                  color: cmd.border.color || DEFAULT_BORDER_DESC.color,
                }
          );
        }
        break;
      case "CLEAR_FORMATTING":
        this.setBorder(
          "LEFT",
          cmd.sheetId,
          cmd.target.map((zone) => extendZone(zone, "right", 1)),
          EMPTY_BORDER
        );
        this.setBorder(
          "TOP",
          cmd.sheetId,
          cmd.target.map((zone) => extendZone(zone, "bottom", 1)),
          EMPTY_BORDER
        );
        break;
      case "REMOVE_COLUMNS_ROWS":
        const elements = [...cmd.elements].sort((a, b) => b - a);
        for (const group of groupConsecutive(elements)) {
          if (cmd.dimension === "COL") {
            const zone = this.getters.getColsZone(cmd.sheetId, group[group.length - 1], group[0]);
            this.clearBorders(cmd.sheetId, [zone]);
            this.shiftBordersHorizontally(cmd.sheetId, group[0] + 1, -group.length);
          } else {
            const zone = this.getters.getRowsZone(cmd.sheetId, group[group.length - 1], group[0]);
            this.clearBorders(cmd.sheetId, [zone]);
            this.shiftBordersVertically(cmd.sheetId, group[0] + 1, -group.length);
          }
        }
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.handleAddColumns(cmd);
        } else {
          this.handleAddRows(cmd);
        }
        break;
    }
  }

  private setBorder(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    zones: Zone[],
    border: BorderDescrInternal
  ) {
    zones = recomputeZones(zones);
    const { numberOfCols, numberOfRows } = this.getters.getSheetSize(sheetId);
    const sheetArea = numberOfCols * numberOfRows;
    for (const zone of zones) {
      const defaultCol = zone.bottom - zone.top + 1 > numberOfRows / 2;
      const defaultRow = zone.right - zone.left + 1 > numberOfCols / 2;
      if (defaultRow && defaultCol && getZoneArea(zone) > sheetArea / 2) {
        this.setSheetBorder(borderType, sheetId, zone, border);
      } else if (defaultCol) {
        this.setColsBorder(borderType, sheetId, zone, border);
      } else if (defaultRow) {
        this.setRowsBorder(borderType, sheetId, zone, border);
      } else {
        this.setCellsBorder(borderType, sheetId, zone, border);
      }
    }
  }

  private setSheetBorder(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    zone: Zone,
    border: BorderDescrInternal
  ) {
    this.clearsCellsBorder(borderType, sheetId, zone);
    const sheetZone = this.getters.getSheetZone(sheetId);
    const horizontalZone = this.getters.getRowsZone(sheetId, zone.top, zone.bottom);
    const externalHorizontalZones = recomputeZones([horizontalZone], [zone]);
    const defaults = this.getDefaultBorderInCell(borderType, sheetId, externalHorizontalZones, {
      sheet: true,
      row: true,
    });
    const verticalZone = this.getters.getColsZone(sheetId, zone.left, zone.right);
    const externalVerticalZones = recomputeZones([verticalZone], [zone]);
    defaults.push(
      ...this.getDefaultBorderInCell(borderType, sheetId, externalVerticalZones, {
        sheet: true,
        col: true,
      })
    );
    const externalCornerZones = recomputeZones([sheetZone], [horizontalZone, verticalZone]);
    defaults.push(
      ...this.getDefaultBorderInCell(borderType, sheetId, externalCornerZones, { sheet: true })
    );
    const defaultKey = borderType === "LEFT" ? "defaultLeft" : "defaultTop";
    this.history.update(defaultKey, sheetId, "sheetDefault", border);
    const rows = Object.keys(this[defaultKey][sheetId]?.rowDefault ?? {});
    for (const rowIdx of rows) {
      const row = parseInt(rowIdx);
      if (zone.top <= row && row <= zone.bottom) {
        this.history.update(defaultKey, sheetId, "rowDefault", row, undefined);
      }
    }
    const cols = Object.keys(this[defaultKey][sheetId]?.colDefault ?? {});
    for (const colIdx of cols) {
      const col = parseInt(colIdx);
      if (zone.left <= col && col <= zone.right) {
        this.history.update(defaultKey, sheetId, "colDefault", col, undefined);
      }
    }
    for (const [position, value] of defaults) {
      this.setCellBorder(borderType, sheetId, position.col, position.row, value);
    }
  }

  private setColsBorder(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    zone: Zone,
    border: BorderDescrInternal
  ) {
    this.clearsCellsBorder(borderType, sheetId, zone);
    const leftoverZones = recomputeZones(
      [this.getters.getColsZone(sheetId, zone.left, zone.right)],
      [zone]
    );
    const defaults = this.getDefaultBorderInCell(borderType, sheetId, leftoverZones, {
      sheet: true,
      col: true,
    });
    const defaultKey = borderType === "LEFT" ? "defaultLeft" : "defaultTop";
    const rowOverlap = Object.keys(this[defaultKey][sheetId]?.rowDefault ?? {});
    const colBorder = deepEquals(border, this[defaultKey][sheetId]?.sheetDefault)
      ? undefined
      : border;
    for (let col = zone.left; col <= zone.right; col++) {
      this.history.update(defaultKey, sheetId, "colDefault", col, colBorder);
      for (const rowIndex of rowOverlap) {
        const row = parseInt(rowIndex);
        if (zone.top <= row && row <= zone.bottom) {
          this.setCellBorder(borderType, sheetId, col, row, border);
        }
      }
    }
    for (const [position, value] of defaults) {
      this.setCellBorder(borderType, sheetId, position.col, position.row, value);
    }
  }

  private setRowsBorder(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    zone: Zone,
    border: BorderDescrInternal
  ) {
    this.clearsCellsBorder(borderType, sheetId, zone);
    const leftoverZones = recomputeZones(
      [this.getters.getRowsZone(sheetId, zone.bottom, zone.top)],
      [zone]
    );
    const defaults = this.getDefaultBorderInCell(borderType, sheetId, leftoverZones, {
      sheet: true,
      col: true,
      row: true,
    });
    const defaultKey = borderType === "LEFT" ? "defaultLeft" : "defaultTop";
    for (let row = zone.top; row <= zone.bottom; row++) {
      this.history.update(defaultKey, sheetId, "rowDefault", row, border);
    }
    for (const [position, value] of defaults) {
      this.setCellBorder(borderType, sheetId, position.col, position.row, value);
    }
  }

  private clearsCellsBorder(borderType: "LEFT" | "TOP", sheetId: UID, zone: Zone) {
    const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.history.update(borderKey, sheetId, col, row, undefined);
      }
    }
  }

  private setCellsBorder(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    zone: Zone,
    border: BorderDescrInternal
  ) {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.setCellBorder(borderType, sheetId, col, row, border);
      }
    }
  }

  private setCellBorder(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    border: BorderDescrInternal
  ) {
    const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
    this.history.update(borderKey, sheetId, col, row, border);
  }

  private getDefaultBorderInCell(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    zones: Zone[],
    newHasPriorityOver: { col?: boolean; row?: boolean; sheet?: boolean }
  ): [CellPosition, BorderDescrInternal][] {
    const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
    const defaultKey = borderType === "LEFT" ? "defaultLeft" : "defaultTop";

    const defaults: [CellPosition, BorderDescrInternal][] = [];
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellBorder = this[borderKey]?.[position.col]?.[position.row];
      if (cellBorder) {
        continue;
      }
      const rowDefault = this[defaultKey][sheetId]?.rowDefault?.[position.row];
      if (rowDefault) {
        if (newHasPriorityOver.row) {
          defaults.push([position, rowDefault]);
        }
        continue;
      }
      const colDefault = this[defaultKey][sheetId]?.colDefault?.[position.col];
      if (colDefault) {
        if (newHasPriorityOver.col) {
          defaults.push([position, colDefault]);
        }
        continue;
      }
      const sheetDefault = this[defaultKey][sheetId]?.sheetDefault;
      if (sheetDefault) {
        if (newHasPriorityOver.sheet) {
          defaults.push([position, sheetDefault]);
        }
        continue;
      }
    }
    return defaults;
  }

  /**
   * Move borders according to the inserted columns.
   * Ensure borders continuity.
   */
  private handleAddColumns(cmd: AddColumnsRowsCommand) {
    // The new columns have already been inserted in the sheet at this point.
    let colLeftOfInsertion: HeaderIndex;
    let colRightOfInsertion: HeaderIndex;
    if (cmd.position === "before") {
      this.shiftBordersHorizontally(cmd.sheetId, cmd.base, cmd.quantity);
      colLeftOfInsertion = cmd.base - 1;
      colRightOfInsertion = cmd.base + cmd.quantity;
    } else {
      this.shiftBordersHorizontally(cmd.sheetId, cmd.base + 1, cmd.quantity);
      colLeftOfInsertion = cmd.base;
      colRightOfInsertion = cmd.base + cmd.quantity + 1;
    }
    this.ensureColumnBorderContinuity(cmd.sheetId, colLeftOfInsertion, colRightOfInsertion);
  }

  /**
   * Move borders according to the inserted rows.
   * Ensure borders continuity.
   */
  private handleAddRows(cmd: AddColumnsRowsCommand) {
    // The new rows have already been inserted at this point.
    let rowAboveInsertion: HeaderIndex;
    let rowBelowInsertion: HeaderIndex;
    if (cmd.position === "before") {
      this.shiftBordersVertically(cmd.sheetId, cmd.base, cmd.quantity);
      rowAboveInsertion = cmd.base - 1;
      rowBelowInsertion = cmd.base + cmd.quantity;
    } else {
      this.shiftBordersVertically(cmd.sheetId, cmd.base + 1, cmd.quantity);
      rowAboveInsertion = cmd.base;
      rowBelowInsertion = cmd.base + cmd.quantity + 1;
    }
    this.ensureRowBorderContinuity(cmd.sheetId, rowAboveInsertion, rowBelowInsertion);
  }

  private getBorderValue(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex
  ): BorderDescrInternal | undefined {
    const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
    const value = this[borderKey][sheetId]?.[col]?.[row];
    if (value) {
      return value;
    }
    const defaultKey = borderType === "LEFT" ? "defaultLeft" : "defaultTop";
    const defaults = this[defaultKey][sheetId];
    return defaults?.rowDefault?.[row] ?? defaults?.colDefault?.[col] ?? defaults?.sheetDefault;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellBorder({ sheetId, col, row }: CellPosition): Border | null {
    const left = toDescr(this.getBorderValue("LEFT", sheetId, col, row), "external");
    const right = toDescr(this.getBorderValue("LEFT", sheetId, col + 1, row), "internal");
    const top = toDescr(this.getBorderValue("TOP", sheetId, col, row), "external");
    const bottom = toDescr(this.getBorderValue("TOP", sheetId, col, row + 1), "internal");
    if (left || right || top || bottom) {
      return { left, top, right, bottom };
    }
    return null;
  }

  getBordersColors(sheetId: UID): Color[] {
    const colors: Color[] = [];
    const tops = Object.values(this.bordersTop[sheetId] ?? {})
      .filter(isDefined)
      .flatMap((r) => Object.values(r).filter(isDefined))
      .map((b) => b.color);
    colors.push(...tops);

    const lefts = Object.values(this.bordersLeft[sheetId] ?? {})
      .filter(isDefined)
      .flatMap((r) => Object.values(r).filter(isDefined))
      .map((b) => b.color);
    colors.push(...lefts);

    const sheetLeft = this.defaultLeft[sheetId]?.sheetDefault?.color;
    if (sheetLeft) {
      colors.push(sheetLeft);
    }

    const sheetTop = this.defaultTop[sheetId]?.sheetDefault?.color;
    if (sheetTop) {
      colors.push(sheetTop);
    }

    const defaultColLeft = Object.values(this.defaultLeft[sheetId]?.colDefault ?? {})
      .filter(isDefined)
      .map((b) => b.color);
    colors.push(...defaultColLeft);

    const defaultColTop = Object.values(this.defaultTop[sheetId]?.colDefault ?? {})
      .filter(isDefined)
      .map((b) => b.color);
    colors.push(...defaultColTop);

    const defaultRowLeft = Object.values(this.defaultLeft[sheetId]?.rowDefault ?? {})
      .filter(isDefined)
      .map((b) => b.color);
    colors.push(...defaultRowLeft);

    const defaultRowTop = Object.values(this.defaultTop[sheetId]?.rowDefault ?? {})
      .filter(isDefined)
      .map((b) => b.color);
    colors.push(...defaultRowTop);

    return colors;
  }

  getBorderClipboardData(sheetId: UID, zone: Zone) {
    const bordersTop: Column<BorderDescrInternal>[] = [];
    const bordersLeft: Column<BorderDescrInternal>[] = [];

    for (let colIndex = 0; zone.left + colIndex <= zone.right; colIndex++) {
      bordersTop[colIndex] = this.bordersTop[sheetId]?.[zone.left + colIndex]?.slice(
        zone.top,
        zone.bottom + 2
      );
      bordersLeft[colIndex] = this.bordersLeft[sheetId]?.[zone.left + colIndex]?.slice(
        zone.top,
        zone.bottom + 1
      );
    }
    bordersLeft[zone.right + 1 - zone.left] = this.bordersLeft[sheetId]?.[zone.right + 1]?.slice(
      zone.top,
      zone.bottom + 1
    );

    const defaultTop: defaultValue<BorderDescrInternal> = {
      sheetDefault: this.defaultTop[sheetId]?.sheetDefault,
      colDefault: this.defaultTop[sheetId]?.colDefault?.slice(zone.left, zone.right + 1),
      rowDefault: this.defaultTop[sheetId]?.rowDefault?.slice(zone.top, zone.bottom + 2),
    };
    const defaultLeft: defaultValue<BorderDescrInternal> = {
      sheetDefault: this.defaultLeft[sheetId]?.sheetDefault,
      colDefault: this.defaultLeft[sheetId]?.colDefault?.slice(zone.left, zone.right + 2),
      rowDefault: this.defaultLeft[sheetId]?.rowDefault?.slice(zone.top, zone.bottom + 1),
    };

    return {
      bordersTop,
      bordersLeft,
      defaultLeft,
      defaultTop,
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Ensure border continuity between two columns.
   * If the two columns have the same borders (at each row respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureColumnBorderContinuity(
    sheetId: UID,
    leftColumn: HeaderIndex,
    rightColumn: HeaderIndex
  ) {
    for (let row: HeaderIndex = 0; row <= this.getters.getNumberRows(sheetId); row++) {
      for (const borderType of ["LEFT", "TOP"] as const) {
        const left = this.getBorderValue(borderType, sheetId, leftColumn, row);
        if (left && deepEquals(left, this.getBorderValue(borderType, sheetId, rightColumn, row))) {
          this.setBorder(
            borderType,
            sheetId,
            [{ left: leftColumn + 1, right: rightColumn - 1, top: row, bottom: row }],
            left
          );
        }
      }
    }
  }

  /**
   * Ensure border continuity between two rows.
   * If the two rows have the same borders (at each column respectively),
   * the same borders are applied to each cell in between.
   */
  private ensureRowBorderContinuity(sheetId: UID, topRow: HeaderIndex, bottomRow: HeaderIndex) {
    for (let col: HeaderIndex = 0; col < this.getters.getNumberCols(sheetId); col++) {
      for (const borderType of ["LEFT", "TOP"] as const) {
        const top = this.getBorderValue(borderType, sheetId, col, topRow);
        if (top && deepEquals(top, this.getBorderValue(borderType, sheetId, col, bottomRow))) {
          this.setBorder(
            borderType,
            sheetId,
            [{ left: col, right: col, top: topRow + 1, bottom: bottomRow - 1 }],
            top
          );
        }
      }
    }
  }

  private shiftDefaultColsRows(
    sheetId: UID,
    colRow: Dimension,
    start: HeaderIndex,
    quantity: number
  ) {
    const colRowDefault = colRow === "COL" ? "colDefault" : "rowDefault";
    for (const defaultKey of ["defaultTop", "defaultLeft"] as const) {
      const positionValue = Object.entries(this[defaultKey][sheetId]?.[colRowDefault] ?? []);
      if (quantity > 0) {
        positionValue.reverse();
      }
      for (const [headerIndex, value] of positionValue) {
        const header = parseInt(headerIndex);
        if (header < start) {
          continue;
        }
        this.history.update(defaultKey, sheetId, colRowDefault, header + quantity, value);
        this.history.update(defaultKey, sheetId, colRowDefault, header, undefined);
      }
    }
  }

  private getColumnsWithBorders(borderType: "LEFT" | "TOP", sheetId: UID): HeaderIndex[] {
    const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
    const sheetBorders = this[borderKey][sheetId];
    if (!sheetBorders) {
      return [];
    }
    return Object.keys(sheetBorders).map((index) => parseInt(index));
  }

  private splitInternalExternal(borders: Column<BorderDescrInternal>): {
    internal: Column<BorderDescrInternal>;
    external: Column<BorderDescrInternal>;
  } {
    if (!borders || borders.length === 0) {
      return { internal: undefined, external: undefined };
    }
    const internal = [];
    const external = [];
    for (const [key, value] of Object.entries(borders)) {
      if (!value) {
        continue;
      }
      if (value?.internal !== "external") {
        internal[key] = value;
      }
      if (value?.internal !== "internal") {
        external[key] = value;
      }
    }
    return { internal, external };
  }

  private shiftCols(sheetId: UID, start: HeaderIndex, quantity: number) {
    for (const borderType of ["LEFT", "TOP"] as const) {
      const cols = this.getColumnsWithBorders(borderType, sheetId);
      const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
      if (quantity > 0) {
        cols.reverse();
      }
      for (const col of cols) {
        if (col < start) {
          continue;
        }
        const value = this[borderKey][sheetId]?.[col];
        if (borderType === "LEFT" && col === start) {
          const { internal, external } = this.splitInternalExternal(value);
          this.history.update(borderKey, sheetId, col + quantity, internal);
          this.history.update(borderKey, sheetId, col, external);
          continue;
        }
        if (value) {
          this.history.update(borderKey, sheetId, col + quantity, value);
          this.history.update(borderKey, sheetId, col, undefined);
        }
      }
    }
  }

  private shiftRows(sheetId: UID, start: HeaderIndex, quantity: number) {
    for (const borderType of ["LEFT", "TOP"] as const) {
      const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
      const maxRow = Math.max(
        ...Object.values(this[borderKey][sheetId] ?? {})
          .filter(isDefined)
          .flatMap((col) => Object.keys(col).map((n) => parseInt(n, 10)))
      );
      if (Number.isNaN(maxRow) || start > maxRow) {
        continue;
      }
      const rows = range(start, maxRow + 1);
      if (quantity > 0) {
        rows.reverse();
      }
      const cols = this.getColumnsWithBorders(borderType, sheetId);
      for (const col of cols) {
        for (const row of rows) {
          const value = this[borderKey][sheetId]?.[col]?.[row];
          if (borderType === "TOP" && row === start) {
            if (value?.internal !== "external") {
              this.history.update(borderKey, sheetId, col, row + quantity, value);
            }
            if (value?.internal === "internal") {
              this.history.update(borderKey, sheetId, col, row, undefined);
            }
            continue;
          }
          // TODO check if === start + skip
          this.history.update(borderKey, sheetId, col, row + quantity, value);
          this.history.update(borderKey, sheetId, col, row, undefined);
        }
      }
    }
  }

  /**
   * Move borders of a sheet horizontally.
   * @param sheetId
   * @param start starting column (included)
   * @param delta how much borders will be moved (negative if moved to the left)
   */
  private shiftBordersHorizontally(sheetId: UID, start: HeaderIndex, delta: number) {
    this.shiftDefaultColsRows(sheetId, "COL", start, delta);
    this.shiftCols(sheetId, start, delta);
  }

  /**
   * Move borders of a sheet vertically.
   * @param sheetId
   * @param start starting row (included)
   * @param delta how much borders will be moved (negative if moved to the above)
   */
  private shiftBordersVertically(sheetId: UID, start: HeaderIndex, delta: number) {
    this.shiftDefaultColsRows(sheetId, "ROW", start, delta);
    this.shiftRows(sheetId, start, delta);
  }

  private removePartialBorder(
    borderType: "LEFT" | "TOP",
    sheetId: UID,
    zone: Zone,
    toRemove: "internal" | "external"
  ) {
    const borderKey = borderType === "LEFT" ? "bordersLeft" : "bordersTop";
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        if (this[borderKey][sheetId]?.[col]?.[row]?.internal === toRemove) {
          this.history.update(borderKey, sheetId, col, row, undefined);
        }
      }
    }
  }

  private clearBorders(sheetId: UID, zones: Zone[]) {
    for (const zone of zones) {
      // Remove internal borders
      this.clearsCellsBorder("LEFT", sheetId, extendZone(zone, "left", -1));
      this.clearsCellsBorder("TOP", sheetId, extendZone(zone, "top", -1));
      // Remove external borders
      this.removePartialBorder("LEFT", sheetId, leftCol(zone), "internal");
      this.removePartialBorder("LEFT", sheetId, rightCol(zone), "external");
      this.removePartialBorder("TOP", sheetId, topRow(zone), "internal");
      this.removePartialBorder("TOP", sheetId, bottomRow(zone), "external");
    }
  }

  /**
   * Set the borders of a zone by computing the borders to add from the given
   * command
   */
  private h(sheetId: UID, zones: Zone[], border: BorderDescr | undefined) {
    const internalZones = zones.map((z) => extendZone(z, "top", -1)).filter(isZoneOrdered);
    this.setBorder("TOP", sheetId, internalZones, both(border));
  }

  private v(sheetId: UID, zones: Zone[], border: BorderDescr | undefined) {
    const internalZones = zones.map((z) => extendZone(z, "left", -1)).filter(isZoneOrdered);
    this.setBorder("LEFT", sheetId, internalZones, both(border));
  }

  private left(sheetId: UID, zones: Zone[], border: BorderDescr | undefined) {
    this.setBorder("LEFT", sheetId, zones.map(leftCol), internal(border));
  }

  private right(sheetId: UID, zones: Zone[], border: BorderDescr | undefined) {
    this.setBorder("LEFT", sheetId, zones.map(rightCol), external(border));
  }

  private top(sheetId: UID, zones: Zone[], border: BorderDescr | undefined) {
    this.setBorder("TOP", sheetId, zones.map(topRow), internal(border));
  }

  private bottom(sheetId: UID, zones: Zone[], border: BorderDescr | undefined) {
    this.setBorder("TOP", sheetId, zones.map(bottomRow), external(border));
  }

  private setBorders(
    sheetId: UID,
    zones: Zone[],
    position: BorderPosition,
    border: BorderDescr | undefined
  ) {
    switch (position) {
      case "h":
        this.h(sheetId, zones, border);
        break;
      case "v":
        this.v(sheetId, zones, border);
        break;
      case "hv":
        this.h(sheetId, zones, border);
        this.v(sheetId, zones, border);
        break;
      case "left":
        this.left(sheetId, zones, border);
        break;
      case "right":
        this.right(sheetId, zones, border);
        break;
      case "top":
        this.top(sheetId, zones, border);
        break;
      case "bottom":
        this.bottom(sheetId, zones, border);
        break;
      case "external":
        this.left(sheetId, zones, border);
        this.right(sheetId, zones, border);
        this.top(sheetId, zones, border);
        this.bottom(sheetId, zones, border);
        break;
      case "clear":
      case "all":
        // TODO simplify ?
        border = position === "clear" ? undefined : border;
        this.left(sheetId, zones, border);
        this.right(sheetId, zones, border);
        this.top(sheetId, zones, border);
        this.bottom(sheetId, zones, border);
        this.h(sheetId, zones, border);
        this.v(sheetId, zones, border);
        break;
    }
  }

  /**
   * Compute the borders to add to the given zone merged.
   */
  private mergeBorders(sheetId: UID, zone: Zone) {
    // Adapt external borders
    const { left, right, top, bottom } = zone;
    const leftBorder = this.getBorderValue("LEFT", sheetId, left, top);
    if (leftBorder) {
      this.setBorder("LEFT", sheetId, [leftCol(zone)], leftBorder);
    }
    const topBorder = this.getBorderValue("TOP", sheetId, left, top);
    if (topBorder) {
      this.setBorder("TOP", sheetId, [topRow(zone)], topBorder);
    }
    const rightBorder =
      this.getBorderValue("LEFT", sheetId, right + 1, bottom) ??
      this.getBorderValue("LEFT", sheetId, left + 1, top);
    if (rightBorder) {
      this.setBorder("LEFT", sheetId, [rightCol(zone)], rightBorder);
    }
    const bottomBorder =
      this.getBorderValue("TOP", sheetId, right, bottom + 1) ??
      this.getBorderValue("TOP", sheetId, left, top + 1);
    if (bottomBorder) {
      this.setBorder("TOP", sheetId, [bottomRow(zone)], bottomBorder);
    }
    // Clear inside
    this.clearsCellsBorder("LEFT", sheetId, extendZone(zone, "left", -1));
    this.clearsCellsBorder("TOP", sheetId, extendZone(zone, "top", -1));
  }

  private checkBordersUnchanged(cmd: SetBorderCommand) {
    const currentBorder = this.getCellBorder(cmd);
    const areAllNewBordersUndefined =
      !cmd.border?.bottom && !cmd.border?.left && !cmd.border?.right && !cmd.border?.top;
    if ((!currentBorder && areAllNewBordersUndefined) || deepEquals(currentBorder, cmd.border)) {
      return CommandResult.NoChanges;
    }
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
          const { sheetId, col, row } = position;
          const border = data.borders[borderId];
          if (border?.left) {
            if (this.bordersLeft[sheetId]?.[col]?.[row]) {
              this.history.update("bordersLeft", sheetId, col, row, both(border.left));
            } else {
              this.history.update("bordersLeft", sheetId, col, row, internal(border.left));
            }
          }
          if (border?.top) {
            if (this.bordersTop[sheetId]?.[col]?.[row]) {
              this.history.update("bordersTop", sheetId, col, row, both(border.top));
            } else {
              this.history.update("bordersTop", sheetId, col, row, internal(border.top));
            }
          }
          if (border?.right) {
            if (this.bordersLeft[sheetId]?.[col + 1]?.[row]) {
              this.history.update("bordersLeft", sheetId, col + 1, row, both(border.right));
            } else {
              this.history.update("bordersLeft", sheetId, col + 1, row, external(border.right));
            }
          }
          if (border?.bottom) {
            if (this.bordersTop[sheetId]?.[col]?.[row + 1]) {
              this.history.update("bordersTop", sheetId, col, row + 1, both(border.bottom));
            } else {
              this.history.update("bordersTop", sheetId, col, row + 1, external(border.bottom));
            }
          }
        }
      }
    }
    // Merges
    for (const sheetData of data.sheets) {
      if (sheetData.merges) {
        for (const merge of sheetData.merges) {
          this.mergeBorders(sheetData.id, toZone(merge));
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
    data.borders = borders;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
