import {
  CellPosition,
  deepCopy,
  Dimension,
  Format,
  groupConsecutive,
  HeaderIndex,
  Style,
  UID,
  Zone,
} from "../..";
import { DEFAULT_STYLE } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { recomputeZones } from "../../helpers/recompute_zones";
import { cellPositions, getZoneArea } from "../../helpers/zones";
import { Cell } from "../../types/cells";
import { CommandResult, CoreCommand } from "../../types/commands";
import { CorePlugin } from "../core_plugin";

export type defaultValue<T> = {
  sheetDefault?: T | undefined;
  colDefault?: Record<HeaderIndex, T | undefined>;
  rowDefault?: Record<HeaderIndex, T | undefined>;
};
type defaultValues<T> = Record<UID, defaultValue<T> | undefined>;
type defaultStyle = { [J in keyof Style]: defaultValues<Style[J]> | undefined };

interface defaultState {
  readonly style: defaultStyle;
  readonly format: defaultValues<Format | undefined>;
}

export class DefaultPlugin extends CorePlugin<defaultState> implements defaultState {
  static getters = ["getCellStyle", "getDefaultStyle", "getCellFormat"] as const;
  public readonly style: defaultStyle = {};
  public readonly format: defaultValues<Format | undefined> = {};

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
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
        for (const key in this.style) {
          this.history.update(
            "style",
            key as keyof Style,
            cmd.sheetIdTo,
            deepCopy(this.style[key][cmd.sheetId])
          );
        }
        this.history.update("format", cmd.sheetIdTo, this.format[cmd.sheetId]);
        break;
    }
  }

  private clearColRows(sheetId: UID, colRow: Dimension, index: HeaderIndex) {
    const colRowDefault = colRow === "COL" ? "colDefault" : "rowDefault";
    for (const key in this.style) {
      this.history.update("style", key as keyof Style, sheetId, colRowDefault, index, undefined);
    }
    this.history.update("format", sheetId, colRowDefault, index, undefined);
  }

  private moveColRows(sheetId: UID, colRow: Dimension, start: HeaderIndex, quantity: number) {
    const colRowDefault = colRow === "COL" ? "colDefault" : "rowDefault";
    for (const key in this.style) {
      const positionValue = Object.entries(
        this.style[key as keyof Style]?.[sheetId]?.[colRowDefault] ?? []
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
          key as keyof Style,
          sheetId,
          colRowDefault,
          header + quantity,
          value
        );
        this.history.update("style", key as keyof Style, sheetId, colRowDefault, header, undefined);
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
    for (const key in this.style) {
      const value = this.style[key][sheetId]?.[colRowDefault]?.[copyFrom];
      this.history.update("style", key as keyof Style, sheetId, colRowDefault, copyTo, value);
    }
    this.history.update(
      "format",
      sheetId,
      colRowDefault,
      copyTo,
      this.format[sheetId]?.[colRowDefault]?.[copyFrom]
    );
  }

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
    this.setDefaultFormatInCell(sheetId, externalHorizontalZones, {
      sheet: true,
      row: true,
    });
    const verticalZone = this.getters.getColsZone(sheetId, zone.left, zone.right);
    const externalVerticalZones = recomputeZones([verticalZone], [zone]);
    this.setDefaultFormatInCell(sheetId, externalVerticalZones, {
      sheet: true,
      col: true,
    });
    const externalCornerZones = recomputeZones([sheetZone], [horizontalZone, verticalZone]);
    this.setDefaultFormatInCell(sheetId, externalCornerZones, { sheet: true });
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
  }

  private setColsFormat(sheetId: UID, zone: Zone, format: Format) {
    this.updateCellsFormat(sheetId, zone, null);
    const leftoverZones = recomputeZones(
      [this.getters.getColsZone(sheetId, zone.left, zone.right)],
      [zone]
    );
    this.setDefaultFormatInCell(sheetId, leftoverZones, {
      sheet: true,
      col: true,
    });
    const rowOverlap = Object.keys(this.format[sheetId]?.rowDefault ?? {});
    for (let col = zone.left; col <= zone.right; col++) {
      if (format !== this.format[sheetId]?.sheetDefault) {
        this.history.update("format", sheetId, "colDefault", col, format);
      } else {
        this.history.update("format", sheetId, "colDefault", col, undefined);
      }
      for (const rowIndex of rowOverlap) {
        const row = parseInt(rowIndex);
        if (zone.top <= row && row <= zone.bottom) {
          this.updateCellFormat({ col, row, sheetId }, format);
        }
      }
    }
  }

  private setRowsFormat(sheetId: UID, zone: Zone, format: Format) {
    this.updateCellsFormat(sheetId, zone, null);
    const leftoverZones = recomputeZones(
      [this.getters.getRowsZone(sheetId, zone.bottom, zone.top)],
      [zone]
    );
    this.setDefaultFormatInCell(sheetId, leftoverZones, {
      sheet: true,
      col: true,
      row: true,
    });
    for (let row = zone.top; row <= zone.bottom; row++) {
      this.history.update("format", sheetId, "rowDefault", row, format);
    }
  }

  private updateCellsFormat(
    sheetId: UID,
    zone: Zone,
    format: Format | null,
    option?: { cellPriority?: boolean }
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
    option?: { cellPriority?: boolean }
  ) {
    if (option?.cellPriority && this.getters.getCell(position)?.format) {
      return;
    }
    this.dispatch("UPDATE_CELL", {
      sheetId: position.sheetId,
      col: position.col,
      row: position.row,
      format,
    });
  }

  private setDefaultFormatInCell(
    sheetId: UID,
    zones: Zone[],
    newHasPriorityOver: { col?: boolean; row?: boolean; sheet?: boolean }
  ) {
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellFormat = this.getters.getCell(position)?.format;
      if (cellFormat) {
        continue;
      }
      const rowDefault = this.format[sheetId]?.rowDefault?.[position.row];
      if (rowDefault) {
        if (newHasPriorityOver.row) {
          this.updateCellFormat(position, rowDefault);
        }
        continue;
      }
      const colDefault = this.format[sheetId]?.colDefault?.[position.col];
      if (colDefault) {
        if (newHasPriorityOver.col) {
          this.updateCellFormat(position, colDefault);
        }
        continue;
      }
      const sheetDefault = this.format[sheetId]?.sheetDefault;
      if (sheetDefault) {
        if (newHasPriorityOver.sheet) {
          this.updateCellFormat(position, sheetDefault);
        }
        continue;
      }
    }
  }

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
    this.setPartialDefaultStyleInCell(sheetId, externalHorizontalZones, style, {
      sheet: true,
      row: true,
    });
    const verticalZone = this.getters.getColsZone(sheetId, zone.left, zone.right);
    const externalVerticalZones = recomputeZones([verticalZone], [zone]);
    this.setPartialDefaultStyleInCell(sheetId, externalVerticalZones, style, {
      sheet: true,
      col: true,
    });
    const externalCornerZones = recomputeZones([sheetZone], [horizontalZone, verticalZone]);
    this.setPartialDefaultStyleInCell(sheetId, externalCornerZones, style, { sheet: true });
    for (const key in style) {
      this.history.update("style", key as keyof Style, sheetId, "sheetDefault", style[key]);
      const rows = Object.keys(this.style[key]?.[sheetId]?.rowDefault ?? {});
      for (const rowIdx of rows) {
        const row = parseInt(rowIdx);
        if (zone.top <= row && row <= zone.bottom) {
          this.history.update("style", key as keyof Style, sheetId, "rowDefault", row, undefined);
        }
      }
      const cols = Object.keys(this.style[key]?.[sheetId]?.colDefault ?? {});
      for (const colIdx of cols) {
        const col = parseInt(colIdx);
        if (zone.left <= col && col <= zone.right) {
          this.history.update("style", key as keyof Style, sheetId, "colDefault", col, undefined);
        }
      }
    }
  }

  private setColsStyle(sheetId: UID, zone: Zone, style: Style) {
    this.clearCellStyle(sheetId, zone, style);
    const leftoverZones = recomputeZones(
      [this.getters.getColsZone(sheetId, zone.left, zone.right)],
      [zone]
    );
    this.setPartialDefaultStyleInCell(sheetId, leftoverZones, style, { sheet: true, col: true });
    const overlapUpdate = new PositionMap<Style>();
    for (const key in style) {
      const rowOverlap = Object.keys(this.style[key]?.[sheetId]?.rowDefault ?? {});
      for (let col = zone.left; col <= zone.right; col++) {
        this.history.update("style", key as keyof Style, sheetId, "colDefault", col, style[key]);
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
  }

  private setRowsStyle(sheetId: UID, zone: Zone, style: Style) {
    this.clearCellStyle(sheetId, zone, style);
    const leftoverZones = recomputeZones(
      [this.getters.getRowsZone(sheetId, zone.bottom, zone.top)],
      [zone]
    );
    this.setPartialDefaultStyleInCell(sheetId, leftoverZones, style, {
      sheet: true,
      col: true,
      row: true,
    });
    for (const key in style) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.history.update("style", key as keyof Style, sheetId, "rowDefault", row, style[key]);
      }
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
    // TODO use existing cell instead of loop
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        const cellStyle = this.getters.getCell({ sheetId, col, row })?.style;
        if (!cellStyle) {
          continue;
        }
        for (const key in style) {
          delete cellStyle[key];
        }
        this.dispatch("UPDATE_CELL", {
          sheetId,
          col,
          row,
          style: cellStyle,
        });
      }
    }
  }

  private setPartialDefaultStyleInCell(
    sheetId: UID,
    zones: Zone[],
    newDefaultStyle: Style,
    newHasPriorityOver: { col?: boolean; row?: boolean; sheet?: boolean }
  ) {
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellStyle = this.getters.getCell(position)?.style ?? {};
      const deltaStyle: Style = {};
      let hasDelta = false;
      for (const key in newDefaultStyle) {
        if (key in cellStyle) {
          continue;
        }
        const styleSheet = this.style[key]?.[position.sheetId];
        if (!styleSheet) {
          continue;
        }
        const rowDefault = styleSheet.rowDefault?.[position.row];
        if (rowDefault) {
          if (newHasPriorityOver.row) {
            deltaStyle[key] = rowDefault;
            hasDelta = true;
          }
          continue;
        }
        const colDefault = styleSheet.colDefault?.[position.col];
        if (colDefault) {
          if (newHasPriorityOver.col) {
            deltaStyle[key] = colDefault;
            hasDelta = true;
          }
          continue;
        }
        const sheetDefault = styleSheet.sheetDefault;
        if (sheetDefault) {
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
        this.updateCellStyle(position, deltaStyle);
      }
    }
  }

  // GETTERS

  getCellStyle(position: CellPosition, cell?: Cell): Style {
    cell = cell || this.getters.getCell(position);
    const style = { ...cell?.style };
    for (const key in this.style) {
      if (!(key in style)) {
        const styleSheet = this.style[key][position.sheetId];
        if (!styleSheet) {
          continue;
        }
        style[key] =
          styleSheet?.rowDefault?.[position.row] ??
          styleSheet?.colDefault?.[position.col] ??
          styleSheet?.sheetDefault;
      }
    }
    return style;
  }

  getCellFormat(position: CellPosition, cell?: Cell): Format | undefined {
    cell = cell || this.getters.getCell(position);
    if (cell?.format !== undefined) {
      return cell?.format;
    }
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
      return this.style[key]?.[sheetId]?.sheetDefault;
    } else if (dimension === "COL") {
      return this.style[key]?.[sheetId]?.colDefault?.[index as HeaderIndex];
    } else {
      return this.style[key]?.[sheetId]?.rowDefault?.[index as HeaderIndex];
    }
  }
}
