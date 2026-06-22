import { PositionMap } from "../../helpers/cells/position_map";
import {
  getItemId,
  groupItemIdsByZones,
  iterateItemIdsPositions,
} from "../../helpers/data_normalization";
import {
  deepCopy,
  deepEquals,
  isObjectEmptyRecursive,
  range,
  replaceNewLines,
} from "../../helpers/misc";

import { DEFAULT_STYLE } from "../../constants";
import { toXC } from "../../helpers/coordinates";
import { CorePlugin } from "../core_plugin";
import { DefaultPlugin, defaultStyle, defaultValue } from "./default";
import { SettingsPlugin } from "./settings";
import { SheetPlugin } from "./sheet";

import { getDateTimeFormat } from "../../helpers/locale";
import { cellPositions, getZoneArea, isInside } from "../../helpers/zones";
import { Cell } from "../../types/cells";
import {
  AddColumnsRowsCommand,
  ClearCellCommand,
  CommandResult,
  CoreCommand,
  PositionDependentCommand,
  SetFormattingCommand,
  UpdateCellCommand,
} from "../../types/commands";
import { CellPosition, HeaderIndex, RangeAdapterFunctions, UID } from "../../types/misc";

import { CompiledFormula, SerializedCompiledFormula } from "../../formulas/compiler";
import {
  createCell,
  createFormulaCellFromCompiledFormula,
} from "../../helpers/cells/cell_evaluation";
import { isExcelCompatible } from "../../helpers/format/format";
import { recomputeZones } from "../../helpers/recompute_zones";
import { Format } from "../../types/format";
import { Locale } from "../../types/locale";
import { Style, UpdateCellData, Zone } from "../../types/misc";
import { Range } from "../../types/range";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { SquishedContent, Squisher } from "./squisher";
import { Unsquisher } from "./unsquisher";

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<number, Cell | undefined> | undefined>;
  nextId: number;
  previousLocale: Locale;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CellPlugin extends CorePlugin<typeof CellPlugin, CoreState> implements CoreState {
  static readonly dependencies = [SheetPlugin, SettingsPlugin, DefaultPlugin] as const;
  static getters = [
    "getCells",
    "getTranslatedCellFormula",
    "getCellById",
    "getFormulaString",
    "getFormulaMovedInSheet",
    "getCell",
    "getCellStyle",
    "getCellFormat",
  ] as const;
  readonly nextId = 1;
  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};
  previousLocale: Locale = this.getters.getLocale();

  /**
   * Snapshots of the default style/format taken in `beforeHandle`, before the
   * DefaultPlugin overwrites them in its `handle`. The cell-side of a formatting
   * command needs the *previous* defaults to know which values must be baked
   * into cells to preserve their appearance.
   */
  private previousDefaultStyle: defaultStyle | undefined;
  private previousDefaultFormat: defaultValue<Format> | undefined;

  adaptRanges(adapters: RangeAdapterFunctions) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.isFormula) {
          const newCompiledFormula = adapters.adaptCompiledFormula(cell.compiledFormula);
          if (newCompiledFormula !== cell.compiledFormula) {
            this.history.update(
              "cells",
              sheet,
              cell.id,
              "compiledFormula" as any,
              newCompiledFormula
            );
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "UPDATE_CELL":
        return this.checkValidations(cmd, this.checkCellOutOfSheet, this.checkUselessUpdateCell);
      case "CLEAR_CELL":
        return this.checkValidations(cmd, this.checkCellOutOfSheet, this.checkUselessClearCell);
      case "UPDATE_CELL_POSITION":
        return !cmd.cellId || this.cells[cmd.sheetId]?.[cmd.cellId]
          ? CommandResult.Success
          : CommandResult.InvalidCellId;
      case "SET_FORMATTING":
        return this.checkUselessSetFormatting(cmd);
      default:
        return CommandResult.Success;
    }
  }

  beforeHandle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_FORMATTING":
      case "CLEAR_FORMATTING":
        // Snapshot the defaults before the DefaultPlugin overwrites them in its
        // `handle`, so the cell baking (done in our `handle`) can preserve the
        // previous appearance of the impacted cells.
        this.previousDefaultStyle = deepCopy(this.getters.getSheetDefaultStyle(cmd.sheetId));
        this.previousDefaultFormat = deepCopy(this.getters.getSheetDefaultFormat(cmd.sheetId));
        break;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.handleAddColumnsRows(cmd, this.copyColumnStyle.bind(this));
        } else {
          this.handleAddColumnsRows(cmd, this.copyRowStyle.bind(this));
        }
        break;
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
      case "UPDATE_CELL":
        this.updateCell(cmd.sheetId, cmd.col, cmd.row, cmd);
        break;

      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
          content: "",
          style: null,
          format: null,
        });
        break;

      case "CLEAR_CELLS":
        this.clearCells(cmd.sheetId, cmd.target);
        break;

      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "DELETE_SHEET": {
        this.history.update("cells", cmd.sheetId, undefined);
        break;
      }
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetId, cmd.sheetIdTo);
        break;
      case "UPDATE_LOCALE": {
        this.changeCellsDateFormatWithLocale(this.previousLocale, cmd.locale);
        this.history.update("previousLocale", cmd.locale);
      }
    }
  }

  private clearZones(sheetId: UID, zones: Zone[]) {
    for (const zone of recomputeZones(zones)) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.getters.getCell({ sheetId, col, row });
          if (cell?.isFormula || cell?.content) {
            this.dispatch("UPDATE_CELL", {
              sheetId: sheetId,
              content: "",
              col,
              row,
            });
          }
        }
      }
    }
  }

  /**
   * Clear the styles, the format and the content of zones
   */
  private clearCells(sheetId: UID, zones: Zone[]) {
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.dispatch("UPDATE_CELL", {
            sheetId: sheetId,
            col,
            row,
            content: "",
            style: null,
            format: null,
          });
        }
      }
    }
  }

  /**
   * Copy the style of the reference column/row to the new columns/rows.
   */
  private handleAddColumnsRows(
    cmd: AddColumnsRowsCommand,
    fn: (sheetId: UID, styleRef: HeaderIndex, elements: HeaderIndex[]) => void
  ) {
    // The new elements have already been inserted in the sheet at this point.
    let insertedElements: HeaderIndex[];
    let styleReference: HeaderIndex;
    if (cmd.position === "before") {
      insertedElements = range(cmd.base, cmd.base + cmd.quantity);
      styleReference = cmd.base + cmd.quantity;
    } else {
      insertedElements = range(cmd.base + 1, cmd.base + cmd.quantity + 1);
      styleReference = cmd.base;
    }
    fn(cmd.sheetId, styleReference, insertedElements);
  }

  private duplicateSheet(sheetIdFrom: UID, sheetIdTo: UID) {
    for (const cell of this.getters.getCells(sheetIdFrom)) {
      const { col, row } = this.getters.getCellPosition(cell.id);
      this.dispatch("UPDATE_CELL", {
        sheetId: sheetIdTo,
        col,
        row,
        content: !cell.isFormula
          ? cell.content
          : cell.compiledFormula.toFormulaString(this.getters),
        format: cell.format,
        style: cell.style,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    const start = performance.now();
    for (const sheet of data.sheets) {
      const sheetId = sheet.id;
      const cellsData = new PositionMap<{
        compiledFormula?: CompiledFormula;
        content?: string;
        style?: number;
        format?: number;
      }>();
      // cells content
      const unsquisher = new Unsquisher();
      for (const unsquishedItem of unsquisher.unsquishSheet(sheet.cells, sheet.id, this.getters)) {
        if (unsquishedItem.content || unsquishedItem.compiled) {
          const position = {
            sheetId: sheet.id,
            col: unsquishedItem.position.col,
            row: unsquishedItem.position.row,
          };
          if (unsquishedItem.compiled) {
            cellsData.set(position, { compiledFormula: unsquishedItem.compiled });
          } else {
            cellsData.set(position, { content: unsquishedItem.content });
          }
        }
      }
      // cells style and format
      for (const [cellProperty, valuesByZones] of [
        ["style", sheet.styles],
        ["format", sheet.formats],
      ] as const) {
        for (const [position, itemId] of iterateItemIdsPositions(sheet.id, valuesByZones)) {
          const cellData = cellsData.get(position);
          if (cellData) {
            cellData[cellProperty] = itemId;
          } else {
            cellsData.set(position, { [cellProperty]: itemId });
          }
        }
      }
      for (const position of cellsData.keysForSheet(sheetId)) {
        const cellData = cellsData.get(position);
        if (cellData?.content || cellData?.format || cellData?.style || cellData?.compiledFormula) {
          const cell = this.importCell(
            sheet.id,
            cellData?.content,
            cellData?.style ? data.styles[cellData?.style] : undefined,
            cellData?.format ? data.formats[cellData?.format] : undefined,
            cellData?.compiledFormula
          );
          this.history.update("cells", sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cellId: cell.id,
            ...position,
          });
        }
      }
    }
    console.debug("cells imported in", performance.now() - start, "ms");
  }

  export(data: WorkbookData, shouldSquish: boolean) {
    const styles: { [styleId: number]: Style } = {};
    const formats: { [formatId: number]: string } = {};
    for (const _sheet of data.sheets) {
      const squisher = new Squisher(this.getters);
      const positionsByStyle: Record<number, CellPosition[]> = [];
      const positionsByFormat: Record<number, CellPosition[]> = [];
      const cells: { [key: string]: SquishedContent } = {};
      const positions = Object.values(this.cells[_sheet.id] || {})
        .map((cell) => this.getters.getCellPosition(cell.id))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const position of positions) {
        const cell = this.getters.getCell(position)!;
        const xc = toXC(position.col, position.row);
        if (cell.style && Object.keys(cell.style).length) {
          const styleId = getItemId<Style>(cell.style, styles);
          positionsByStyle[styleId] ??= [];
          positionsByStyle[styleId].push(position);
        }
        if (cell.format) {
          const formatId = getItemId<Format>(cell.format, formats);
          positionsByFormat[formatId] ??= [];
          positionsByFormat[formatId].push(position);
        }
        if (cell.isFormula) {
          cells[xc] = shouldSquish
            ? squisher.squish(cell, _sheet.id)
            : cell.compiledFormula.toFormulaString(this.getters);
        } else if (cell.content) {
          cells[xc] = shouldSquish ? squisher.squish(cell, _sheet.id) : cell.content;
        }
      }
      _sheet.styles = groupItemIdsByZones(positionsByStyle);
      _sheet.formats = groupItemIdsByZones(positionsByFormat);
      _sheet.cells = shouldSquish ? squisher.squishSheet(cells, _sheet.id) : cells;
    }
    data.styles = styles;
    data.formats = formats;
  }

  importCell(
    sheetId: UID,
    content?: string,
    style?: Style,
    format?: Format,
    compiledFormula?: CompiledFormula | undefined
  ): Cell {
    const cellId = this.getNextCellId();
    if (compiledFormula) {
      return createFormulaCellFromCompiledFormula(cellId, compiledFormula, format, style);
    }
    return createCell(this.getters, cellId, content || "", format, style, sheetId, {
      avoidAutomaticDateFormat: true,
    });
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data, false);
    const incompatibleIds: number[] = [];
    for (const formatId in data.formats || []) {
      if (!isExcelCompatible(data.formats[formatId])) {
        incompatibleIds.push(Number(formatId));
        delete data.formats[formatId];
      }
    }
    if (incompatibleIds.length) {
      for (const sheet of data.sheets) {
        for (const zoneXc in sheet.formats) {
          const formatId = sheet.formats[zoneXc];
          if (formatId && incompatibleIds.includes(formatId)) {
            delete sheet.formats[zoneXc];
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Cell[] {
    return Object.values(this.cells[sheetId] || {});
  }

  /**
   * get a cell by ID. Used in evaluation when evaluating an async cell, we need to be able to find it back after
   * starting an async evaluation even if it has been moved or re-allocated
   */
  getCellById(cellId: number): Cell | undefined {
    // this must be as fast as possible
    const position = this.getters.getCellPosition(cellId);
    const sheet = this.cells[position.sheetId];
    return sheet[cellId];
  }

  /*
   * Reconstructs the original formula string based on new dependencies
   */
  getFormulaString(
    sheetId: UID,
    compiledFormula: CompiledFormula,
    dependencies: Range[],
    useBoundedReference: boolean = false
  ): string {
    const newFormula = CompiledFormula.CopyWithDependencies(compiledFormula, sheetId, dependencies);

    return newFormula.toFormulaString(this.getters, { useBoundedReference });
  }

  /**
   * Constructs a formula string based on an initial formula and a translation vector
   */
  getTranslatedCellFormula(
    sheetId: UID,
    offsetX: number,
    offsetY: number,
    compiledFormula: CompiledFormula | SerializedCompiledFormula
  ) {
    if (!(compiledFormula instanceof CompiledFormula)) {
      compiledFormula = CompiledFormula.CompileForSerializedFormula(sheetId, compiledFormula);
    }
    const adaptedDependencies = this.getters.createAdaptedRanges(
      compiledFormula.rangeDependencies,
      offsetX,
      offsetY,
      sheetId
    );

    return this.getFormulaString(sheetId, compiledFormula as CompiledFormula, adaptedDependencies);
  }

  getFormulaMovedInSheet(targetSheetId: UID, compiledFormula: CompiledFormula) {
    const adaptedDependencies = this.getters.removeRangesSheetPrefix(
      targetSheetId,
      compiledFormula.rangeDependencies
    );
    return CompiledFormula.CopyWithDependencies(
      compiledFormula,
      targetSheetId,
      adaptedDependencies
    ).toFormulaString(this.getters);
  }

  /**
   * Copy the style of one column to other columns.
   */
  private copyColumnStyle(sheetId: UID, refColumn: HeaderIndex, targetCols: HeaderIndex[]) {
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const format = this.getFormat(sheetId, refColumn, row);
      if (format.style || format.format) {
        for (const col of targetCols) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * Copy the style of one row to other rows.
   */
  private copyRowStyle(sheetId: UID, refRow: HeaderIndex, targetRows: HeaderIndex[]) {
    for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
      const format = this.getFormat(sheetId, col, refRow);
      if (format.style || format.format) {
        for (const row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex
  ): { style?: Style; format?: Format } {
    const format: { style?: Style; format?: string } = {};
    const cell = this.getters.getCell({ sheetId, col, row });
    if (cell) {
      if (cell.style) {
        format["style"] = cell.style;
      }
      if (cell.format) {
        format["format"] = cell.format;
      }
    }
    return format;
  }

  private getNextCellId(): number {
    const id = this.nextId;
    this.history.update("nextId", this.nextId + 1);
    return id;
  }

  private updateCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex, after: UpdateCellData) {
    const position = { sheetId, col, row };
    const before = this.getters.getCell(position);
    const hasContent = after.content !== undefined || "formula" in after;

    // Compute the new cell properties
    let afterContent: string;
    if (hasContent) {
      afterContent = replaceNewLines(after?.content);
    } else {
      afterContent = before?.isFormula
        ? before.compiledFormula.toFormulaString(this.getters)
        : before?.content || "";
    }
    let style: Style | undefined;
    if (after.style !== undefined) {
      const styleWithoutDefaults = Object.fromEntries(
        Object.entries(after.style ?? {}).filter(
          ([key, value]) =>
            value !== this.getters.getCellDefaultStyleValue(position, key as keyof Style)
        )
      ) as Style;
      if (isObjectEmptyRecursive(styleWithoutDefaults)) {
        style = undefined;
      } else {
        style = styleWithoutDefaults;
      }
    } else {
      style = before?.style;
    }
    let format: Format | undefined;
    if (after.format !== undefined) {
      const defaultFormat = this.getters.getCellDefaultFormat(position);
      format = after.format === null ? undefined : after.format;
      if ((format ?? "") === (defaultFormat ?? "")) {
        format = undefined;
      }
    } else {
      format = before?.format;
    }

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it is completely empty if:
     * - the command says the new content is empty and has no border/format/style
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says border/format/style is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says border/format/style is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (!before || (!before.isFormula && before.content === "")))) &&
      !style &&
      format === undefined
    ) {
      if (before) {
        this.history.update("cells", sheetId, before.id, undefined);
        this.dispatch("UPDATE_CELL_POSITION", {
          cellId: undefined,
          col,
          row,
          sheetId,
        });
      }
      return;
    }

    const cellId = before?.id || this.getNextCellId();
    const cell = createCell(this.getters, cellId, afterContent, format, style, sheetId);
    this.history.update("cells", sheetId, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cellId: cell.id, col, row, sheetId });
  }

  private checkCellOutOfSheet(cmd: PositionDependentCommand): CommandResult {
    const { sheetId, col, row } = cmd;
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) {
      return CommandResult.InvalidSheetId;
    }
    const sheetZone = this.getters.getSheetZone(sheetId);
    return isInside(col, row, sheetZone) ? CommandResult.Success : CommandResult.TargetOutOfSheet;
  }

  getCell({ sheetId, col, row }: CellPosition): Cell | undefined {
    const sheet = this.getters.tryGetSheet(sheetId);
    const cellId = sheet?.rows[row]?.cells[col];
    if (cellId === undefined) {
      return undefined;
    }
    return this.getters.getCellById(cellId);
  }

  getCellStyle(position: CellPosition): Style {
    const cell = this.getters.getCell(position);
    return { ...this.getters.getCellDefaultStyle(position), ...cell?.style };
  }

  getCellFormat(position: CellPosition): Format | undefined {
    const cell = this.getters.getCell(position);
    if (cell?.format !== undefined) {
      return cell?.format;
    }
    return this.getters.getCellDefaultFormat(position);
  }

  // ---------------------------------------------------------------------------
  // Formatting (cell side of SET_FORMATTING / CLEAR_FORMATTING)
  //
  // The default style/format state is owned and updated by the DefaultPlugin.
  // Here we only update the individual cells: clearing cell styles overridden by
  // a new default, and baking the previous defaults into cells whose appearance
  // would otherwise change. These run in `handle`, after the DefaultPlugin has
  // updated its state, so the default comparisons (in `updateCell`) use the new
  // defaults; the *previous* defaults are read from the snapshots taken in
  // `beforeHandle`.
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
    const rowOverlap = Object.keys(this.previousDefaultFormat?.rowDefault ?? {});
    for (let col = zone.left; col <= zone.right; col++) {
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
      [this.getters.getRowsZone(sheetId, zone.top, zone.bottom)],
      [zone]
    );
    const defaults = this.getDefaultFormatInCell(sheetId, leftoverZones, {
      shouldUseDefaultSheet: true,
      shouldUseDefaultCol: true,
      shouldUseDefaultRow: true,
    });
    for (const [position, value] of defaults) {
      this.updateCellFormat(position, value);
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
    if ((format ?? "") !== (this.getters.getCellDefaultFormat(position) ?? "")) {
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
    priorities: {
      shouldUseDefaultCol?: boolean;
      shouldUseDefaultRow?: boolean;
      shouldUseDefaultSheet?: boolean;
    }
  ): [CellPosition, Format][] {
    const defaults: [CellPosition, Format][] = [];
    const formatSheet = this.previousDefaultFormat;
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellFormat = this.getters.getCell(position)?.format;
      if (cellFormat) {
        continue;
      }
      const rowDefault = formatSheet?.rowDefault?.[position.row];
      if (rowDefault) {
        if (priorities.shouldUseDefaultRow) {
          defaults.push([position, rowDefault]);
        }
        continue;
      }
      const colDefault = formatSheet?.colDefault?.[position.col];
      if (colDefault) {
        if (priorities.shouldUseDefaultCol) {
          defaults.push([position, colDefault]);
        }
        continue;
      }
      const sheetDefault = formatSheet?.sheetDefault;
      if (sheetDefault) {
        if (priorities.shouldUseDefaultSheet) {
          defaults.push([position, sheetDefault]);
        }
        continue;
      }
    }
    return defaults;
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
    const styleSheet = this.previousDefaultStyle;
    for (const key in style) {
      const rowOverlap = Object.keys(styleSheet?.[key]?.rowDefault ?? {});
      for (let col = zone.left; col <= zone.right; col++) {
        for (const rowIndex of rowOverlap) {
          const row = parseInt(rowIndex);
          if (zone.top <= row && row <= zone.bottom) {
            const position = { col, row, sheetId };
            const s = overlapUpdate.get(position);
            if (s) {
              s[key] = style[key];
            } else {
              const newStyle = {};
              newStyle[key] = style[key];
              overlapUpdate.set(position, newStyle);
            }
          }
        }
      }
    }
    for (const [position, overlapStyle] of overlapUpdate.entries()) {
      this.updateCellStyle(position, overlapStyle);
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
    for (const [position, value] of defaults) {
      this.updateCellStyle(position, value);
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
    const cellStyle = { ...cell?.style, ...style };
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
    priorities: {
      shouldUseDefaultCol?: boolean;
      shouldUseDefaultRow?: boolean;
      shouldUseDefaultSheet?: boolean;
    }
  ): [CellPosition, Style][] {
    const partialDefaults: [CellPosition, Style][] = [];
    const styleSheet = this.previousDefaultStyle;
    if (!styleSheet) {
      return partialDefaults;
    }
    for (const position of zones.flatMap((zone) => cellPositions(sheetId, zone))) {
      const cellStyle = this.getters.getCell(position)?.style ?? {};
      const deltaStyle: Style = {};
      let hasDelta = false;
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
          if (priorities.shouldUseDefaultRow) {
            deltaStyle[key] = rowDefault;
            hasDelta = true;
          }
          continue;
        }
        const colDefault = defaults.colDefault?.[position.col];
        if (colDefault !== undefined) {
          if (priorities.shouldUseDefaultCol) {
            deltaStyle[key] = colDefault;
            hasDelta = true;
          }
          continue;
        }
        const sheetDefault = defaults.sheetDefault;
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

  private changeCellsDateFormatWithLocale(oldLocale: Locale, newLocale: Locale) {
    for (const sheetId of this.getters.getSheetIds()) {
      for (const cell of this.getters.getCells(sheetId)) {
        let formatToApply: Format | undefined;
        if (cell.format === oldLocale.dateFormat) {
          formatToApply = newLocale.dateFormat;
        }
        if (cell.format === oldLocale.timeFormat) {
          formatToApply = newLocale.timeFormat;
        }
        if (cell.format === getDateTimeFormat(oldLocale)) {
          formatToApply = getDateTimeFormat(newLocale);
        }
        if (formatToApply) {
          const { col, row, sheetId } = this.getters.getCellPosition(cell.id);
          this.dispatch("UPDATE_CELL", {
            col,
            row,
            sheetId,
            format: formatToApply,
          });
        }
      }
    }
  }

  private checkUselessSetFormatting(cmd: SetFormattingCommand): CommandResult {
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
            (hasStyle && !deepEquals(this.getCellStyle(position), cmd.style)) ||
            (hasFormat && this.getCellFormat(position) !== cmd.format)
          ) {
            return CommandResult.Success;
          }
        }
      }
    }
    return CommandResult.NoChanges;
  }

  private checkUselessClearCell(cmd: ClearCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    if (!cell) {
      return CommandResult.NoChanges;
    }
    if (!cell.isFormula && !cell.content && !cell.style && !cell.format) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }

  private checkUselessUpdateCell(cmd: UpdateCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    const hasContent = "content" in cmd || "formula" in cmd;
    const hasStyle = "style" in cmd;
    const hasFormat = "format" in cmd;
    if (
      (!hasContent ||
        (cell?.isFormula && cell.compiledFormula.toFormulaString(this.getters) === cmd.content) ||
        (!cell?.isFormula && cell?.content === cmd.content)) &&
      (!hasStyle || deepEquals(cell?.style, cmd.style)) &&
      (!hasFormat || cell?.format === cmd.format)
    ) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }
}
