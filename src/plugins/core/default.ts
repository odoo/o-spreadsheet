import { CellPosition, Color, Dimension, Format, HeaderIndex, Style, UID } from "../..";
import { DEFAULT_STYLE } from "../../constants";
import { getItemId, ItemsDic } from "../../helpers/data_normalization";
import {
  deepCopy,
  defaultDict,
  groupConsecutive,
  isObjectEmptyRecursive,
} from "../../helpers/misc";
import { CoreCommand } from "../../types/commands";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";
import { SheetPlugin } from "./sheet";

export type defaultValue<T> = {
  sheetDefault?: T | undefined;
  colDefault?: (T | undefined)[];
  rowDefault?: (T | undefined)[];
};
export type sparseDefaultValue<T> = {
  sheetDefault?: T | undefined;
  colDefault?: Record<number, T | undefined>;
  rowDefault?: Record<number, T | undefined>;
};
export type defaultValues<T> = Record<UID, defaultValue<T> | undefined>;
export type defaultStyle = { [J in keyof Style]: defaultValue<Style[J]> };
export type defaultStyles = Record<UID, defaultStyle | undefined>;

interface defaultState {
  readonly style: defaultStyles;
  readonly format: defaultValues<Format>;
}

/**
 * Default Plugin
 *
 * Holds the style and format defaults of a sheet, of its columns and of its
 * rows. It knows nothing about the cells: a cell only reads those defaults to
 * avoid storing a value it would inherit anyway. Deciding which cells must be
 * updated when a default changes is the job of the FormattingPlugin, which sits
 * on top of the cells.
 */
export class DefaultPlugin
  extends CorePlugin<typeof DefaultPlugin, defaultState>
  implements defaultState
{
  static readonly dependencies = [SheetPlugin] as const;
  static getters = [
    "getDefaultStyle",
    "getDefaultStyleHeaders",
    "getCellDefaultStyle",
    "getCellDefaultStyleValue",
    "getCellDefaultFormat",
    "getDefaultFormat",
    "getDefaultFormatHeaders",
    "getDefaultStyleColors",
  ] as const;
  public readonly style: defaultStyles = {};
  public readonly format: defaultValues<Format> = {};

  handle(cmd: CoreCommand): void {
    switch (cmd.type) {
      case "SET_SHEET_DEFAULT_STYLE":
        for (const key in cmd.style) {
          this.history.update(
            "style",
            cmd.sheetId,
            key as keyof Style,
            "sheetDefault",
            cmd.style[key] ?? undefined
          );
        }
        break;
      case "SET_HEADERS_DEFAULT_STYLE": {
        const headerDefault = cmd.dimension === "COL" ? "colDefault" : "rowDefault";
        for (const key in cmd.style) {
          for (const index of cmd.elements) {
            this.history.update(
              "style",
              cmd.sheetId,
              key as keyof Style,
              headerDefault,
              index,
              cmd.style[key] ?? undefined
            );
          }
        }
        break;
      }
      case "SET_SHEET_DEFAULT_FORMAT":
        this.history.update("format", cmd.sheetId, "sheetDefault", cmd.format ?? undefined);
        break;
      case "SET_HEADERS_DEFAULT_FORMAT": {
        const headerDefault = cmd.dimension === "COL" ? "colDefault" : "rowDefault";
        for (const index of cmd.elements) {
          this.history.update("format", cmd.sheetId, headerDefault, index, cmd.format ?? undefined);
        }
        break;
      }
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
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * The style a cell inherits from its row, its column or its sheet. Only the
   * properties having an actual default are set.
   */
  getCellDefaultStyle(position: CellPosition): Style {
    const styleSheet = this.style[position.sheetId];
    const style: Style = {};
    if (!styleSheet) {
      return style;
    }
    for (const key in styleSheet) {
      const defaults = styleSheet[key];
      if (!defaults) {
        continue;
      }
      const styleValue =
        defaults.rowDefault?.[position.row] ??
        defaults.colDefault?.[position.col] ??
        defaults.sheetDefault;
      if (styleValue !== undefined) {
        style[key] = styleValue;
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

  /**
   * Indexes of the columns (or rows) holding a default for the given style property.
   */
  getDefaultStyleHeaders(sheetId: UID, key: keyof Style, dimension: Dimension): HeaderIndex[] {
    const headerDefault = dimension === "COL" ? "colDefault" : "rowDefault";
    return Object.keys(this.style[sheetId]?.[key]?.[headerDefault] ?? {}).map(Number);
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

  /**
   * Indexes of the columns (or rows) holding a default format.
   */
  getDefaultFormatHeaders(sheetId: UID, dimension: Dimension): HeaderIndex[] {
    const headerDefault = dimension === "COL" ? "colDefault" : "rowDefault";
    return Object.keys(this.format[sheetId]?.[headerDefault] ?? {}).map(Number);
  }

  getDefaultStyleColors(): Color[] {
    const colors = new Set<Color>();
    for (const sheetId in this.style) {
      const styleSheet = this.style[sheetId];
      if (!styleSheet) {
        continue;
      }
      for (const key of ["fillColor", "textColor"]) {
        const defaults: defaultValue<Color> = styleSheet[key];
        if (!defaults) {
          continue;
        }
        if (defaults.sheetDefault) {
          colors.add(defaults.sheetDefault);
        }
        for (const value of Object.values(defaults.colDefault ?? [])) {
          if (value) {
            colors.add(value);
          }
        }
        for (const value of Object.values(defaults.rowDefault ?? [])) {
          if (value) {
            colors.add(value);
          }
        }
      }
    }
    return [...colors];
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  mapToId<T>(defaults: defaultValue<T>, dict: ItemsDic<T>): sparseDefaultValue<number> {
    const defaultsIds: sparseDefaultValue<number> = {
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

  mapToValue<T>(defaultIds: sparseDefaultValue<number>, dict: ItemsDic<T>): defaultValue<T> {
    const defaults: defaultValue<T> = {
      colDefault: [],
      rowDefault: [],
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

  mapStyleToId(defaults: defaultStyle, dict: ItemsDic<Style>): sparseDefaultValue<number> {
    const colDefaultDict = defaultDict({});
    const rowDefaultDict = defaultDict({});
    const sheetDefault = {};

    for (const key in defaults) {
      const keyDefault = defaults[key];
      if (keyDefault.sheetDefault) {
        sheetDefault[key] = keyDefault.sheetDefault;
      }
      for (const colIndex in keyDefault.colDefault) {
        colDefaultDict.get(colIndex)[key] = keyDefault.colDefault[colIndex];
      }
      for (const rowIndex in keyDefault.rowDefault) {
        rowDefaultDict.get(rowIndex)[key] = keyDefault.rowDefault[rowIndex];
      }
    }

    const colDefault = [];
    for (const [col, value] of Object.entries(colDefaultDict.state)) {
      colDefault[col] = value;
    }
    const rowDefault = [];
    for (const [row, value] of Object.entries(rowDefaultDict.state)) {
      rowDefault[row] = value;
    }

    return this.mapToId(
      {
        colDefault,
        rowDefault,
        sheetDefault,
      },
      dict
    );
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const sheetFormat = this.format[sheet.id];
      sheet.defaultFormat =
        sheetFormat && !isObjectEmptyRecursive(sheetFormat)
          ? this.mapToId(sheetFormat, data.formats)
          : undefined;
      const sheetStyle = this.style[sheet.id];
      sheet.defaultStyle =
        sheetStyle && !isObjectEmptyRecursive(sheetStyle)
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
