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

type defaultValue<T> = Record<
  UID,
  {
    sheetDefault: T;
    colDefault: Record<HeaderIndex, T>;
    rowDefault: Record<HeaderIndex, T>;
  }
>;

type defaultStyle = { [J in keyof Style]: defaultValue<Style[J]> };

interface defaultState {
  readonly style: defaultStyle;
  readonly format: defaultValue<Format>;
}

export class DefaultPlugin extends CorePlugin<defaultState> implements defaultState {
  static getters = ["getCellStyle"] as const;
  public readonly style: defaultStyle = {};
  public readonly format: defaultValue<Format> = {};

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
        this.setFormat(cmd.sheetId, cmd.target, "");
        break;
      case "ADD_COLUMNS_ROWS":
        const startingIdx = cmd.position === "before" ? cmd.base - 1 : cmd.base;
        this.moveColRows(cmd.sheetId, cmd.dimension, startingIdx, cmd.quantity);
        // copy style
        break;
      case "REMOVE_COLUMNS_ROWS":
        for (const el of groupConsecutive(cmd.elements).toReversed()) {
          for (const i in el) {
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
    // @ts-ignore ask lul about undefined in update typing
    this.history.update("format", sheetId, colRowDefault, index, undefined);
  }

  private moveColRows(sheetId: UID, colRow: Dimension, start: HeaderIndex, quantity: number) {
    const colRowDefault = colRow === "COL" ? "colDefault" : "rowDefault";
    for (const key in this.style) {
      for (const [headerIndex, value] of Object.entries(
        this.style[key][sheetId][colRowDefault] ?? []
      )) {
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
      }
    }
  }

  private setFormat(sheetId: UID, zones: Zone[], format: Format) {}

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
        for (const row of rowOverlap) {
          const position = { col, row: parseInt(row), sheetId };
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
    // TODO ??? keep default priority also :eyes:
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
        const styleSheet = this.style[key as keyof Style]?.[position.sheetId];
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
}
