import { CellPosition, Dimension, Format, HeaderIndex, Style, UID, Zone } from "../..";
import { DEFAULT_STYLE } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { deepEquals } from "../../helpers/misc";
import { recomputeZones } from "../../helpers/recompute_zones";
import { cellPositions, getZoneArea } from "../../helpers/zones";
import {
  CommandResult,
  CoreCommand,
  DefaultStyleUpdate,
  SetFormattingCommand,
} from "../../types/commands";
import { CorePlugin } from "../core_plugin";
import { CellPlugin } from "./cell";

/** Which default levels may be materialized on a cell to preserve its appearance */
interface DefaultPriorities {
  shouldUseDefaultCol?: boolean;
  shouldUseDefaultRow?: boolean;
  shouldUseDefaultSheet?: boolean;
}

/**
 * Formatting Plugin
 *
 * Translates a `SET_FORMATTING` on an arbitrary target into the lower level
 * changes it implies: a new sheet/column/row default when the target is wide
 * enough to be worth it, and the cell updates keeping the cells outside of the
 * target unchanged.
 *
 * It sits on top of the cells: changing a default means rewriting the cells
 * which were relying on the previous one, which can only be decided once both
 * the defaults and the cells are known.
 */
export class FormattingPlugin extends CorePlugin<typeof FormattingPlugin> {
  static readonly dependencies = [CellPlugin] as const;
  static getters = [] as const;

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
    }
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
      shouldUseDefaultSheet: true,
      shouldUseDefaultRow: true,
    });
    const verticalZone = this.getters.getColsZone(sheetId, zone.left, zone.right);
    const externalVerticalZones = recomputeZones([verticalZone], [zone]);
    defaults.push(
      ...this.getDefaultFormatInCell(sheetId, externalVerticalZones, {
        shouldUseDefaultSheet: true,
        shouldUseDefaultCol: true,
      })
    );
    const externalCornerZones = recomputeZones([sheetZone], [horizontalZone, verticalZone]);
    defaults.push(
      ...this.getDefaultFormatInCell(sheetId, externalCornerZones, { shouldUseDefaultSheet: true })
    );
    this.dispatch("SET_SHEET_DEFAULT_FORMAT", { sheetId, format });
    this.clearHeadersDefaultFormat(sheetId, "ROW", zone.top, zone.bottom);
    this.clearHeadersDefaultFormat(sheetId, "COL", zone.left, zone.right);
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
      shouldUseDefaultSheet: true,
      shouldUseDefaultCol: true,
    });
    const rowOverlap = this.getters.getDefaultFormatHeaders(sheetId, "ROW");
    const sheetDefault = this.getters.getDefaultFormat(sheetId, "SHEET", undefined);
    const colFormat = format !== (sheetDefault ?? "") ? format : null;
    this.setHeadersDefaultFormat(sheetId, "COL", zone.left, zone.right, colFormat);
    for (let col = zone.left; col <= zone.right; col++) {
      for (const row of rowOverlap) {
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
      [this.getters.getRowsZone(sheetId, zone.top, zone.bottom)],
      [zone]
    );
    const defaults = this.getDefaultFormatInCell(sheetId, leftoverZones, {
      shouldUseDefaultSheet: true,
      shouldUseDefaultCol: true,
      shouldUseDefaultRow: true,
    });
    this.setHeadersDefaultFormat(sheetId, "ROW", zone.top, zone.bottom, format);
    for (const [position, value] of defaults) {
      this.updateCellFormat(position, value);
    }
  }

  private setHeadersDefaultFormat(
    sheetId: UID,
    dimension: Dimension,
    start: HeaderIndex,
    end: HeaderIndex,
    format: Format | null
  ) {
    const elements: HeaderIndex[] = [];
    for (let index = start; index <= end; index++) {
      elements.push(index);
    }
    if (elements.length) {
      this.dispatch("SET_HEADERS_DEFAULT_FORMAT", { sheetId, dimension, elements, format });
    }
  }

  private clearHeadersDefaultFormat(
    sheetId: UID,
    dimension: Dimension,
    start: HeaderIndex,
    end: HeaderIndex
  ) {
    const elements = this.getters
      .getDefaultFormatHeaders(sheetId, dimension)
      .filter((index) => start <= index && index <= end);
    if (elements.length) {
      this.dispatch("SET_HEADERS_DEFAULT_FORMAT", { sheetId, dimension, elements, format: null });
    }
  }

  private updateCellsFormat(sheetId: UID, zone: Zone, format: Format | null) {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.updateCellFormat({ sheetId, col, row }, format);
      }
    }
  }

  private updateCellFormat(position: CellPosition, format: Format | null) {
    const isDefault = (format ?? "") === (this.getters.getCellDefaultFormat(position) ?? "");
    this.dispatch("UPDATE_CELL", {
      sheetId: position.sheetId,
      col: position.col,
      row: position.row,
      format: isDefault ? null : format,
    });
  }

  private getDefaultFormatInCell(
    sheetId: UID,
    zones: Zone[],
    priorities: DefaultPriorities
  ): [CellPosition, Format][] {
    const defaults: [CellPosition, Format][] = [];
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellFormat = this.getters.getCell(position)?.format;
      if (cellFormat !== undefined) {
        continue;
      }
      const rowDefault = this.getters.getDefaultFormat(sheetId, "ROW", position.row);
      if (rowDefault !== undefined) {
        if (priorities.shouldUseDefaultRow) {
          defaults.push([position, rowDefault]);
        }
        continue;
      }
      const colDefault = this.getters.getDefaultFormat(sheetId, "COL", position.col);
      if (colDefault !== undefined) {
        if (priorities.shouldUseDefaultCol) {
          defaults.push([position, colDefault]);
        }
        continue;
      }
      const sheetDefault = this.getters.getDefaultFormat(sheetId, "SHEET", undefined) ?? "";
      if (priorities.shouldUseDefaultSheet) {
        defaults.push([position, sheetDefault]);
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
      shouldUseDefaultSheet: true,
      shouldUseDefaultRow: true,
    });
    const verticalZone = this.getters.getColsZone(sheetId, zone.left, zone.right);
    const externalVerticalZones = recomputeZones([verticalZone], [zone]);
    defaults.push(
      ...this.getPartialDefaultStyleInCell(sheetId, externalVerticalZones, style, {
        shouldUseDefaultSheet: true,
        shouldUseDefaultCol: true,
      })
    );
    const externalCornerZones = recomputeZones([sheetZone], [horizontalZone, verticalZone]);
    defaults.push(
      ...this.getPartialDefaultStyleInCell(sheetId, externalCornerZones, style, {
        shouldUseDefaultSheet: true,
      })
    );
    const sheetStyle: DefaultStyleUpdate = {};
    for (const key in style) {
      sheetStyle[key] = style[key] !== DEFAULT_STYLE[key] ? style[key] : null;
    }
    this.dispatch("SET_SHEET_DEFAULT_STYLE", { sheetId, style: sheetStyle });
    const keys = Object.keys(style) as (keyof Style)[];
    this.clearHeadersDefaultStyle(sheetId, "ROW", keys, zone.top, zone.bottom);
    this.clearHeadersDefaultStyle(sheetId, "COL", keys, zone.left, zone.right);
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
      shouldUseDefaultSheet: true,
      shouldUseDefaultCol: true,
    });
    const overlapUpdate = new PositionMap<Style>();
    for (const key in style) {
      const rowOverlap = this.getters.getDefaultStyleHeaders(sheetId, key as keyof Style, "ROW");
      const sheetDefault = this.getters.getDefaultStyle(
        sheetId,
        key as keyof Style,
        "SHEET",
        undefined
      );
      const colStyle = style[key] !== (sheetDefault ?? DEFAULT_STYLE[key]) ? style[key] : null;
      this.setHeadersDefaultStyle(sheetId, "COL", { [key]: colStyle }, zone.left, zone.right);
      for (let col = zone.left; col <= zone.right; col++) {
        for (const row of rowOverlap) {
          if (zone.top <= row && row <= zone.bottom) {
            const position = { col, row, sheetId };
            const s = overlapUpdate.get(position);
            if (s) {
              s[key] = style[key];
            } else {
              overlapUpdate.set(position, { [key]: style[key] });
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
      [this.getters.getRowsZone(sheetId, zone.top, zone.bottom)],
      [zone]
    );
    const defaults = this.getPartialDefaultStyleInCell(sheetId, leftoverZones, style, {
      shouldUseDefaultSheet: true,
      shouldUseDefaultCol: true,
      shouldUseDefaultRow: true,
    });
    for (const key in style) {
      const hasColStyle =
        this.getters.getDefaultStyleHeaders(sheetId, key as keyof Style, "COL").length !== 0;
      const sheetDefault = this.getters.getDefaultStyle(
        sheetId,
        key as keyof Style,
        "SHEET",
        undefined
      );
      const rowStyle =
        hasColStyle || style[key] !== (sheetDefault ?? DEFAULT_STYLE[key]) ? style[key] : null;
      this.setHeadersDefaultStyle(sheetId, "ROW", { [key]: rowStyle }, zone.top, zone.bottom);
    }
    for (const [position, value] of defaults) {
      this.updateCellStyle(position, value);
    }
  }

  private setHeadersDefaultStyle(
    sheetId: UID,
    dimension: Dimension,
    style: DefaultStyleUpdate,
    start: HeaderIndex,
    end: HeaderIndex
  ) {
    const elements: HeaderIndex[] = [];
    for (let index = start; index <= end; index++) {
      elements.push(index);
    }
    if (elements.length) {
      this.dispatch("SET_HEADERS_DEFAULT_STYLE", { sheetId, dimension, elements, style });
    }
  }

  private clearHeadersDefaultStyle(
    sheetId: UID,
    dimension: Dimension,
    keys: (keyof Style)[],
    start: HeaderIndex,
    end: HeaderIndex
  ) {
    for (const key of keys) {
      const elements = this.getters
        .getDefaultStyleHeaders(sheetId, key, dimension)
        .filter((index) => start <= index && index <= end);
      if (elements.length) {
        this.dispatch("SET_HEADERS_DEFAULT_STYLE", {
          sheetId,
          dimension,
          elements,
          style: { [key]: null },
        });
      }
    }
  }

  private updateCellsStyle(sheetId: UID, zone: Zone, style: Style) {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        this.updateCellStyle({ sheetId, col, row }, style);
      }
    }
  }

  private updateCellStyle(position: CellPosition, style: Style) {
    const cell = this.getters.getCell(position);
    this.dispatch("UPDATE_CELL", {
      sheetId: position.sheetId,
      col: position.col,
      row: position.row,
      style: { ...cell?.style, ...style },
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
    priorities: DefaultPriorities
  ): [CellPosition, Style][] {
    const partialDefaults: [CellPosition, Style][] = [];
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellStyle = this.getters.getCell(position)?.style ?? {};
      const deltaStyle: Style = {};
      let hasDelta = false;
      for (const key in newDefaultStyle) {
        if (key in cellStyle) {
          continue;
        }
        const styleKey = key as keyof Style;
        const rowDefault = this.getters.getDefaultStyle(sheetId, styleKey, "ROW", position.row);
        if (rowDefault !== undefined) {
          if (priorities.shouldUseDefaultRow) {
            deltaStyle[key] = rowDefault;
            hasDelta = true;
          }
          continue;
        }
        const colDefault = this.getters.getDefaultStyle(sheetId, styleKey, "COL", position.col);
        if (colDefault !== undefined) {
          if (priorities.shouldUseDefaultCol) {
            deltaStyle[key] = colDefault;
            hasDelta = true;
          }
          continue;
        }
        const sheetDefault = this.getters.getDefaultStyle(sheetId, styleKey, "SHEET", undefined);
        if (sheetDefault !== undefined) {
          if (priorities.shouldUseDefaultSheet) {
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
          if (
            (hasStyle && !deepEquals(this.getters.getCellStyle(position), cmd.style)) ||
            (hasFormat && this.getters.getCellFormat(position) !== cmd.format)
          ) {
            return CommandResult.Success;
          }
        }
      }
    }
    return CommandResult.NoChanges;
  }
}
