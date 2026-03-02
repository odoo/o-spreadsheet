import {
  CellPosition,
  deepCopy,
  deepEquals,
  defaultDict,
  Dimension,
  Format,
  groupConsecutive,
  HeaderIndex,
  isObjectEmpty,
  Style,
  UID,
  Zone,
} from "../..";
import { DEFAULT_STYLE } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { getItemId, ItemsDic } from "../../helpers/data_normalization";
import { recomputeZones } from "../../helpers/recompute_zones";
import { cellPositions, getZoneArea } from "../../helpers/zones";
import { Cell } from "../../types/cells";
import { CommandResult, CoreCommand, SetFormattingCommand } from "../../types/commands";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

export type defaultValue<T> = {
  sheetDefault?: T | undefined;
  colDefault?: Record<HeaderIndex, T | undefined>;
  rowDefault?: Record<HeaderIndex, T | undefined>;
};
export type defaultValues<T> = Record<UID, defaultValue<T> | undefined>;
export type defaultStyle = { [J in keyof Style]: defaultValue<Style[J]> };
export type defaultStyles = Record<UID, defaultStyle | undefined>;

interface defaultState {
  readonly style: defaultStyles;
  readonly format: defaultValues<Format>;
}

export class DefaultPlugin extends CorePlugin<defaultState> implements defaultState {
  static getters = [
    "getCellStyle",
    "getDefaultStyle",
    "getCellDefaultStyleValue",
    "getCellFormat",
    "getCellDefaultFormat",
    "getDefaultFormat",
  ] as const;
  public readonly style: defaultStyles = {};
  public readonly format: defaultValues<Format> = {};

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    if (cmd.type === "SET_FORMATTING") {
      return this.checkUselessSetFormatting(cmd);
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand): void {
    switch (cmd.type) {
      case "SET_FORMATTING":
        if (cmd.style !== undefined) {
          this.setStyle(cmd.sheetId, cmd.target, cmd.style);
        }
        if (cmd.format !== undefined) {
          this.setFormat(cmd.sheetId, cmd.target, cmd.format);
        }
        break;
      case "CLEAR_FORMATTING":
        this.setStyle(cmd.sheetId, cmd.target, DEFAULT_STYLE);
        this.setFormat(cmd.sheetId, cmd.target, null);
        break;
      case "ADD_COLUMNS_ROWS":
        const startingIdx = cmd.position === "before" ? cmd.base : cmd.base + 1;
        this.moveColRows(cmd.sheetId, cmd.dimension, startingIdx, cmd.quantity);
        const indexToCopy = cmd.position === "before" ? cmd.base + cmd.quantity : cmd.base;
        for (let index = startingIdx; index < startingIdx + cmd.quantity; index++) {
          this.copyColRow(cmd.sheetId, cmd.dimension, indexToCopy, index);
        }
        break;
      case "REMOVE_COLUMNS_ROWS":
        for (const el of groupConsecutive(cmd.elements).toReversed()) {
          for (const i of el) {
            this.clearColRows(cmd.sheetId, cmd.dimension, i);
          }
          this.moveColRows(cmd.sheetId, cmd.dimension, el[0], -el.length);
        }
        break;
      case "DUPLICATE_SHEET":
        this.history.update("style", cmd.sheetIdTo, deepCopy(this.style[cmd.sheetId]));
        this.history.update("format", cmd.sheetIdTo, deepCopy(this.format[cmd.sheetId]));
        break;
    }
  }

  private clearColRows(sheetId: UID, colRow: Dimension, index: HeaderIndex) {
    const colRowDefault = colRow === "COL" ? "colDefault" : "rowDefault";
    for (const key in this.style[sheetId]) {
      this.history.update("style", sheetId, key as keyof Style, colRowDefault, index, undefined);
    }
    this.history.update("format", sheetId, colRowDefault, index, undefined);
  }

  private moveColRows(sheetId: UID, colRow: Dimension, start: HeaderIndex, quantity: number) {
    const colRowDefault = colRow === "COL" ? "colDefault" : "rowDefault";
    for (const key in this.style[sheetId]) {
      const positionValue = Object.entries(
        this.style[sheetId][key as keyof Style]?.[colRowDefault] ?? []
      );
      if (quantity > 0) {
        positionValue.reverse();
      }
      for (const [headerIndex, value] of positionValue) {
        const header = parseInt(headerIndex);
        if (header < start) {
          continue;
        }
        this.history.update(
          "style",
          sheetId,
          key as keyof Style,
          colRowDefault,
          header + quantity,
          value
        );
        this.history.update("style", sheetId, key as keyof Style, colRowDefault, header, undefined);
      }
    }
    const positionValue = Object.entries(this.format[sheetId]?.[colRowDefault] ?? []);
    if (quantity > 0) {
      positionValue.reverse();
    }
    for (const [headerIndex, value] of positionValue) {
      const header = parseInt(headerIndex);
      if (header < start) {
        continue;
      }
      this.history.update("format", sheetId, colRowDefault, header + quantity, value);
      this.history.update("format", sheetId, colRowDefault, header, undefined);
    }
  }

  private copyColRow(sheetId: UID, colRow: Dimension, copyFrom: HeaderIndex, copyTo: HeaderIndex) {
    const colRowDefault = colRow === "COL" ? "colDefault" : "rowDefault";
    for (const key in this.style[sheetId]) {
      const value = this.style[sheetId][key]?.[colRowDefault]?.[copyFrom];
      this.history.update("style", sheetId, key as keyof Style, colRowDefault, copyTo, value);
    }
    this.history.update(
      "format",
      sheetId,
      colRowDefault,
      copyTo,
      this.format[sheetId]?.[colRowDefault]?.[copyFrom]
    );
  }

  // ---------------------------------------------------------------------------
  // Format
  // ---------------------------------------------------------------------------

  private setFormat(sheetId: UID, zones: Zone[], format: Format | null) {
    zones = recomputeZones(zones);
    const { numberOfCols, numberOfRows } = this.getters.getSheetSize(sheetId);
    const sheetArea = numberOfCols * numberOfRows;
    for (const zone of zones) {
      const defaultCol = zone.bottom - zone.top + 1 > numberOfRows / 2;
      const defaultRow = zone.right - zone.left + 1 > numberOfCols / 2;
      if (defaultRow && defaultCol && getZoneArea(zone) > sheetArea / 2) {
        this.setSheetFormat(sheetId, zone, format);
      } else if (defaultCol) {
        this.setColsFormat(sheetId, zone, format ?? "");
      } else if (defaultRow) {
        this.setRowsFormat(sheetId, zone, format ?? "");
      } else {
        this.updateCellsFormat(sheetId, zone, format ?? "");
      }
    }
  }

  private setSheetFormat(sheetId: UID, zone: Zone, format: Format | null) {
    this.updateCellsFormat(sheetId, zone, null);
    const sheetZone = this.getters.getSheetZone(sheetId);
    const horizontalZone = this.getters.getRowsZone(sheetId, zone.top, zone.bottom);
    const externalHorizontalZones = recomputeZones([horizontalZone], [zone]);
    const defaults = this.getDefaultFormatInCell(sheetId, externalHorizontalZones, {
      sheet: true,
      row: true,
    });
    const verticalZone = this.getters.getColsZone(sheetId, zone.left, zone.right);
    const externalVerticalZones = recomputeZones([verticalZone], [zone]);
    defaults.push(
      ...this.getDefaultFormatInCell(sheetId, externalVerticalZones, {
        sheet: true,
        col: true,
      })
    );
    const externalCornerZones = recomputeZones([sheetZone], [horizontalZone, verticalZone]);
    defaults.push(...this.getDefaultFormatInCell(sheetId, externalCornerZones, { sheet: true }));
    this.history.update("format", sheetId, "sheetDefault", format ?? undefined);
    const rows = Object.keys(this.format[sheetId]?.rowDefault ?? {});
    for (const rowIdx of rows) {
      const row = parseInt(rowIdx);
      if (zone.top <= row && row <= zone.bottom) {
        this.history.update("format", sheetId, "rowDefault", row, undefined);
      }
    }
    const cols = Object.keys(this.format[sheetId]?.colDefault ?? {});
    for (const colIdx of cols) {
      const col = parseInt(colIdx);
      if (zone.left <= col && col <= zone.right) {
        this.history.update("format", sheetId, "colDefault", col, undefined);
      }
    }
    for (const [position, value] of defaults) {
      this.updateCellFormat(position, value);
    }
  }

  private setColsFormat(sheetId: UID, zone: Zone, format: Format) {
    this.updateCellsFormat(sheetId, zone, null);
    const leftoverZones = recomputeZones(
      [this.getters.getColsZone(sheetId, zone.left, zone.right)],
      [zone]
    );
    const defaults = this.getDefaultFormatInCell(sheetId, leftoverZones, {
      sheet: true,
      col: true,
    });
    const rowOverlap = Object.keys(this.format[sheetId]?.rowDefault ?? {});
    const colFormat = format !== (this.format[sheetId]?.sheetDefault ?? "") ? format : undefined;
    for (let col = zone.left; col <= zone.right; col++) {
      this.history.update("format", sheetId, "colDefault", col, colFormat);
      for (const rowIndex of rowOverlap) {
        const row = parseInt(rowIndex);
        if (zone.top <= row && row <= zone.bottom) {
          this.updateCellFormat({ col, row, sheetId }, format);
        }
      }
    }
    for (const [position, value] of defaults) {
      this.updateCellFormat(position, value);
    }
  }

  private setRowsFormat(sheetId: UID, zone: Zone, format: Format) {
    this.updateCellsFormat(sheetId, zone, null);
    const leftoverZones = recomputeZones(
      [this.getters.getRowsZone(sheetId, zone.bottom, zone.top)],
      [zone]
    );
    const defaults = this.getDefaultFormatInCell(sheetId, leftoverZones, {
      sheet: true,
      col: true,
      row: true,
    });
    for (let row = zone.top; row <= zone.bottom; row++) {
      this.history.update("format", sheetId, "rowDefault", row, format);
    }
    for (const [position, value] of defaults) {
      this.updateCellFormat(position, value);
    }
  }

  private updateCellsFormat(
    sheetId: UID,
    zone: Zone,
    format: Format | null,
    option?: { cellPriority?: boolean; force?: boolean }
  ) {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.updateCellFormat({ sheetId, col, row }, format, option);
      }
    }
  }

  private updateCellFormat(
    position: CellPosition,
    format: Format | null,
    option?: { cellPriority?: boolean; force?: boolean }
  ) {
    if (option?.cellPriority && this.getters.getCell(position)?.format) {
      return;
    }
    if (option?.force || (format ?? "") !== (this.getCellDefaultFormat(position) ?? "")) {
      this.dispatch("UPDATE_CELL", {
        sheetId: position.sheetId,
        col: position.col,
        row: position.row,
        format,
      });
    } else {
      this.dispatch("UPDATE_CELL", {
        sheetId: position.sheetId,
        col: position.col,
        row: position.row,
        format: null,
      });
    }
  }

  private getDefaultFormatInCell(
    sheetId: UID,
    zones: Zone[],
    newHasPriorityOver: { col?: boolean; row?: boolean; sheet?: boolean }
  ): [CellPosition, Format][] {
    const defaults: [CellPosition, Format][] = [];
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellFormat = this.getters.getCell(position)?.format;
      if (cellFormat) {
        continue;
      }
      const rowDefault = this.format[sheetId]?.rowDefault?.[position.row];
      if (rowDefault) {
        if (newHasPriorityOver.row) {
          defaults.push([position, rowDefault]);
        }
        continue;
      }
      const colDefault = this.format[sheetId]?.colDefault?.[position.col];
      if (colDefault) {
        if (newHasPriorityOver.col) {
          defaults.push([position, colDefault]);
        }
        continue;
      }
      const sheetDefault = this.format[sheetId]?.sheetDefault;
      if (sheetDefault) {
        if (newHasPriorityOver.sheet) {
          defaults.push([position, sheetDefault]);
        }
        continue;
      }
    }
    return defaults;
  }

  // ---------------------------------------------------------------------------
  // Style
  // ---------------------------------------------------------------------------

  private setStyle(sheetId: UID, zones: Zone[], style: Style) {
    zones = recomputeZones(zones);
    const { numberOfCols, numberOfRows } = this.getters.getSheetSize(sheetId);
    const sheetArea = numberOfCols * numberOfRows;
    for (const zone of zones) {
      const defaultCol = zone.bottom - zone.top + 1 > numberOfRows / 2;
      const defaultRow = zone.right - zone.left + 1 > numberOfCols / 2;
      if (defaultRow && defaultCol && getZoneArea(zone) > sheetArea / 2) {
        this.setSheetStyle(sheetId, zone, style);
      } else if (defaultCol) {
        this.setColsStyle(sheetId, zone, style);
      } else if (defaultRow) {
        this.setRowsStyle(sheetId, zone, style);
      } else {
        this.updateCellsStyle(sheetId, zone, style);
      }
    }
  }

  private setSheetStyle(sheetId: UID, zone: Zone, style: Style) {
    this.clearCellStyle(sheetId, zone, style);
    const sheetZone = this.getters.getSheetZone(sheetId);
    const horizontalZone = this.getters.getRowsZone(sheetId, zone.top, zone.bottom);
    const externalHorizontalZones = recomputeZones([horizontalZone], [zone]);
    const defaults = this.getPartialDefaultStyleInCell(sheetId, externalHorizontalZones, style, {
      sheet: true,
      row: true,
    });
    const verticalZone = this.getters.getColsZone(sheetId, zone.left, zone.right);
    const externalVerticalZones = recomputeZones([verticalZone], [zone]);
    defaults.push(
      ...this.getPartialDefaultStyleInCell(sheetId, externalVerticalZones, style, {
        sheet: true,
        col: true,
      })
    );
    const externalCornerZones = recomputeZones([sheetZone], [horizontalZone, verticalZone]);
    defaults.push(
      ...this.getPartialDefaultStyleInCell(sheetId, externalCornerZones, style, { sheet: true })
    );
    for (const key in style) {
      if (style[key] !== DEFAULT_STYLE[key]) {
        this.history.update("style", sheetId, key as keyof Style, "sheetDefault", style[key]);
      } else {
        this.history.update("style", sheetId, key as keyof Style, "sheetDefault", undefined);
      }
      const rows = Object.keys(this.style[sheetId]?.[key]?.rowDefault ?? {});
      for (const rowIdx of rows) {
        const row = parseInt(rowIdx);
        if (zone.top <= row && row <= zone.bottom) {
          this.history.update("style", sheetId, key as keyof Style, "rowDefault", row, undefined);
        }
      }
      const cols = Object.keys(this.style[sheetId]?.[key]?.colDefault ?? {});
      for (const colIdx of cols) {
        const col = parseInt(colIdx);
        if (zone.left <= col && col <= zone.right) {
          this.history.update("style", sheetId, key as keyof Style, "colDefault", col, undefined);
        }
      }
    }
    for (const [position, value] of defaults) {
      this.updateCellStyle(position, value);
    }
  }

  private setColsStyle(sheetId: UID, zone: Zone, style: Style) {
    this.clearCellStyle(sheetId, zone, style);
    const leftoverZones = recomputeZones(
      [this.getters.getColsZone(sheetId, zone.left, zone.right)],
      [zone]
    );
    const defaults = this.getPartialDefaultStyleInCell(sheetId, leftoverZones, style, {
      sheet: true,
      col: true,
    });
    const overlapUpdate = new PositionMap<Style>();
    for (const key in style) {
      const rowOverlap = Object.keys(this.style[sheetId]?.[key]?.rowDefault ?? {});
      const colStyle =
        style[key] !== (this.style[sheetId]?.[key]?.sheetDefault ?? DEFAULT_STYLE[key])
          ? style[key]
          : undefined;
      for (let col = zone.left; col <= zone.right; col++) {
        this.history.update("style", sheetId, key as keyof Style, "colDefault", col, colStyle);
        for (const rowIndex of rowOverlap) {
          const row = parseInt(rowIndex);
          if (zone.top <= row && row <= zone.bottom) {
            const position = { col, row, sheetId };
            const s = overlapUpdate.get(position);
            if (s) {
              s[key] = style[key];
            } else {
              const s = {};
              s[key] = style[key];
              overlapUpdate.set(position, s);
            }
          }
        }
      }
    }
    for (const [position, style] of overlapUpdate.entries()) {
      this.updateCellStyle(position, style);
    }
    for (const [position, value] of defaults) {
      this.updateCellStyle(position, value);
    }
  }

  private setRowsStyle(sheetId: UID, zone: Zone, style: Style) {
    this.clearCellStyle(sheetId, zone, style);
    const leftoverZones = recomputeZones(
      [this.getters.getRowsZone(sheetId, zone.bottom, zone.top)],
      [zone]
    );
    const defaults = this.getPartialDefaultStyleInCell(sheetId, leftoverZones, style, {
      sheet: true,
      col: true,
      row: true,
    });
    for (const key in style) {
      const hasColStyle = Object.keys(this.style[sheetId]?.[key]?.colDefault ?? {}).length !== 0;
      for (let row = zone.top; row <= zone.bottom; row++) {
        if (
          hasColStyle ||
          style[key] !== (this.style[sheetId]?.[key]?.sheetDefault ?? DEFAULT_STYLE[key])
        ) {
          this.history.update("style", sheetId, key as keyof Style, "rowDefault", row, style[key]);
        } else {
          this.history.update("style", sheetId, key as keyof Style, "rowDefault", row, undefined);
        }
      }
    }
    for (const [position, value] of defaults) {
      this.updateCellStyle(position, value);
    }
  }

  private updateCellsStyle(
    sheetId: UID,
    zone: Zone,
    style: Style,
    option?: { cellPriority?: boolean }
  ) {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.updateCellStyle({ sheetId, col, row }, style, option);
      }
    }
  }

  private updateCellStyle(
    position: CellPosition,
    style: Style,
    option?: { cellPriority?: boolean }
  ) {
    const cell = this.getters.getCell(position);
    const cellStyle = option?.cellPriority
      ? { ...style, ...cell?.style }
      : { ...cell?.style, ...style };
    this.dispatch("UPDATE_CELL", {
      sheetId: position.sheetId,
      col: position.col,
      row: position.row,
      style: cellStyle,
    });
  }

  private clearCellStyle(sheetId: UID, zone: Zone, style: Style) {
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (const cellId of this.getters.getRowCellIds(sheetId, row)) {
        const col = this.getters.getCellPosition(cellId).col;
        if (col < zone.left || zone.right < col) {
          continue;
        }
        let cellStyle = this.getters.getCellById(cellId)?.style;
        if (!cellStyle) {
          continue;
        }
        cellStyle = { ...cellStyle };
        let dispatch = false;
        for (const key in style) {
          if (cellStyle[key] !== undefined) {
            dispatch = true;
            delete cellStyle[key];
          }
        }
        if (dispatch) {
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: Object.keys(cellStyle).length === 0 ? null : cellStyle,
          });
        }
      }
    }
  }

  private getPartialDefaultStyleInCell(
    sheetId: UID,
    zones: Zone[],
    newDefaultStyle: Style,
    newHasPriorityOver: { col?: boolean; row?: boolean; sheet?: boolean }
  ): [CellPosition, Style][] {
    const partialDefaults: [CellPosition, Style][] = [];
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellStyle = this.getters.getCell(position)?.style ?? {};
      const deltaStyle: Style = {};
      let hasDelta = false;
      const styleSheet = this.style[position.sheetId];
      if (!styleSheet) {
        continue;
      }
      for (const key in newDefaultStyle) {
        if (key in cellStyle) {
          continue;
        }
        const defaults = styleSheet[key];
        if (!defaults) {
          continue;
        }
        const rowDefault = defaults.rowDefault?.[position.row];
        if (rowDefault !== undefined) {
          if (newHasPriorityOver.row) {
            deltaStyle[key] = rowDefault;
            hasDelta = true;
          }
          continue;
        }
        const colDefault = defaults.colDefault?.[position.col];
        if (colDefault !== undefined) {
          if (newHasPriorityOver.col) {
            deltaStyle[key] = colDefault;
            hasDelta = true;
          }
          continue;
        }
        const sheetDefault = defaults.sheetDefault;
        if (sheetDefault !== undefined) {
          if (newHasPriorityOver.sheet) {
            deltaStyle[key] = sheetDefault;
            hasDelta = true;
          }
          continue;
        }
        if (newDefaultStyle[key] !== DEFAULT_STYLE[key]) {
          deltaStyle[key] = DEFAULT_STYLE[key];
          hasDelta = true;
        }
      }
      if (hasDelta) {
        partialDefaults.push([position, deltaStyle]);
      }
    }
    return partialDefaults;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellStyle(position: CellPosition, cell?: Cell): Style {
    cell = cell || this.getters.getCell(position);
    const style = { ...cell?.style };
    const styleSheet = this.style[position.sheetId];
    if (!styleSheet) {
      return style;
    }
    for (const key in styleSheet) {
      if (!(key in style)) {
        const defaults = styleSheet[key];
        if (!defaults) {
          continue;
        }
        style[key] =
          defaults.rowDefault?.[position.row] ??
          defaults.colDefault?.[position.col] ??
          defaults.sheetDefault;
      }
    }
    return style;
  }

  getCellDefaultStyleValue<J extends keyof Style>(position: CellPosition, key: J): Style[J] {
    const styleSheet = this.style[position.sheetId]?.[key];
    return (
      styleSheet?.rowDefault?.[position.row] ??
      styleSheet?.colDefault?.[position.col] ??
      styleSheet?.sheetDefault ??
      DEFAULT_STYLE[key]
    );
  }

  getCellFormat(position: CellPosition, cell?: Cell): Format | undefined {
    cell = cell || this.getters.getCell(position);
    if (cell?.format !== undefined) {
      return cell?.format;
    }
    return this.getCellDefaultFormat(position);
  }

  getCellDefaultFormat(position: CellPosition): Format | undefined {
    const formatSheet = this.format[position.sheetId];
    return (
      formatSheet?.rowDefault?.[position.row] ??
      formatSheet?.colDefault?.[position.col] ??
      formatSheet?.sheetDefault
    );
  }

  getDefaultStyle<J extends keyof Style, D extends "COL" | "ROW" | "SHEET">(
    sheetId: UID,
    key: J,
    dimension: D,
    index: D extends "COL" | "ROW" ? HeaderIndex : undefined
  ): Style[J] {
    if (dimension === "SHEET") {
      return this.style[sheetId]?.[key]?.sheetDefault;
    } else if (dimension === "COL") {
      return this.style[sheetId]?.[key]?.colDefault?.[index as HeaderIndex];
    } else {
      return this.style[sheetId]?.[key]?.rowDefault?.[index as HeaderIndex];
    }
  }

  getDefaultFormat<D extends "COL" | "ROW" | "SHEET">(
    sheetId: UID,
    dimension: D,
    index: D extends "COL" | "ROW" ? HeaderIndex : undefined
  ): Format | undefined {
    if (dimension === "SHEET") {
      return this.format[sheetId]?.sheetDefault;
    } else if (dimension === "COL") {
      return this.format[sheetId]?.colDefault?.[index as HeaderIndex];
    } else {
      return this.format[sheetId]?.rowDefault?.[index as HeaderIndex];
    }
  }

  private checkUselessSetFormatting(cmd: SetFormattingCommand) {
    const { sheetId, target } = cmd;
    const hasStyle = "style" in cmd;
    const hasFormat = "format" in cmd;
    if (!hasStyle && !hasFormat) {
      return CommandResult.NoChanges;
    }
    for (const zone of recomputeZones(target)) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const position = { sheetId, col, row };
          const cell = this.getters.getCell(position);
          if (
            (hasStyle && !deepEquals(this.getCellStyle(position, cell), cmd.style)) ||
            (hasFormat && this.getCellFormat(position, cell) !== cmd.format)
          ) {
            return CommandResult.Success;
          }
        }
      }
    }
    return CommandResult.NoChanges;
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  mapToId<T>(defaults: defaultValue<T>, dict: ItemsDic<T>): defaultValue<number> {
    const defaultsIds: defaultValue<number> = {
      colDefault: {},
      rowDefault: {},
    };
    if (defaults.sheetDefault) {
      defaultsIds.sheetDefault = getItemId(defaults.sheetDefault, dict);
    }
    for (const colIndex in defaults.colDefault) {
      defaultsIds.colDefault![colIndex] = getItemId(defaults.colDefault[colIndex], dict);
    }
    for (const rowIndex in defaults.rowDefault) {
      defaultsIds.rowDefault![rowIndex] = getItemId(defaults.rowDefault[rowIndex], dict);
    }
    return defaultsIds;
  }

  mapToValue<T>(defaultIds: defaultValue<number>, dict: ItemsDic<T>): defaultValue<T> {
    const defaults: defaultValue<T> = {
      colDefault: {},
      rowDefault: {},
    };
    if (defaultIds.sheetDefault) {
      defaults.sheetDefault = dict[defaultIds.sheetDefault];
    }
    for (const colIndex in defaultIds.colDefault) {
      defaults.colDefault![colIndex] = dict[defaultIds.colDefault[colIndex]];
    }
    for (const rowIndex in defaultIds.rowDefault) {
      defaults.rowDefault![rowIndex] = dict[defaultIds.rowDefault[rowIndex]];
    }
    return defaults;
  }

  mapStyleToId(defaults: defaultStyle, dict: ItemsDic<Style>): defaultValue<number> {
    const defaultStyle = {
      colDefault: defaultDict({}),
      rowDefault: defaultDict({}),
      sheetDefault: {},
    };

    for (const key in defaults) {
      const keyDefault = defaults[key];
      if (keyDefault.sheetDefault) {
        defaultStyle.sheetDefault[key] = keyDefault.sheetDefault;
      }
      for (const colIndex in keyDefault.colDefault) {
        defaultStyle.colDefault.get(colIndex)[key] = keyDefault.colDefault[colIndex];
      }
      for (const rowIndex in keyDefault.rowDefault) {
        defaultStyle.rowDefault.get(rowIndex)[key] = keyDefault.rowDefault[rowIndex];
      }
    }

    return this.mapToId(
      {
        colDefault: defaultStyle.colDefault.state,
        rowDefault: defaultStyle.rowDefault.state,
        sheetDefault: defaultStyle.sheetDefault,
      },
      dict
    );
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const sheetFormat = this.format[sheet.id];
      sheet.defaultFormat =
        sheetFormat && !isObjectEmpty(sheetFormat)
          ? this.mapToId(sheetFormat, data.formats)
          : undefined;
      const sheetStyle = this.style[sheet.id];
      sheet.defaultStyle =
        sheetStyle && !isObjectEmpty(sheetStyle)
          ? this.mapStyleToId(sheetStyle, data.styles)
          : undefined;
    }
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      this.history.update(
        "format",
        sheet.id,
        sheet.defaultFormat && this.mapToValue(sheet.defaultFormat, data.formats)
      );
      if (sheet.defaultStyle) {
        const defaultStyle = this.mapToValue(sheet.defaultStyle, data.styles);
        for (const key in defaultStyle.sheetDefault) {
          this.history.update(
            "style",
            sheet.id,
            key as keyof Style,
            "sheetDefault",
            defaultStyle.sheetDefault[key]
          );
        }
        for (const colIndex in defaultStyle.colDefault ?? []) {
          const colInt = parseInt(colIndex);
          const colStyle = defaultStyle.colDefault?.[colIndex];
          for (const key in colStyle) {
            this.history.update(
              "style",
              sheet.id,
              key as keyof Style,
              "colDefault",
              colInt,
              colStyle[key]
            );
          }
        }
        for (const rowIndex in defaultStyle.rowDefault ?? []) {
          const rowInt = parseInt(rowIndex);
          const rowStyle = defaultStyle.rowDefault?.[rowIndex];
          for (const key in rowStyle) {
            this.history.update(
              "style",
              sheet.id,
              key as keyof Style,
              "rowDefault",
              rowInt,
              rowStyle[key]
            );
          }
        }
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
