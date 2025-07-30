import { compile, compileTokens } from "../../formulas/compiler";
import { Token } from "../../formulas/tokenizer";
import { toString } from "../../functions/helpers";
import { PositionMap } from "../../helpers/cells/position_map";
import { iterateItemIdsPositions } from "../../helpers/data_normalization";
import { concat, deepEquals, replaceNewLines } from "../../helpers/misc";

import { toCartesian, toXC } from "../../helpers/coordinates";
import { CorePlugin } from "../core_plugin";

import { isInside } from "../../helpers/zones";
import { Cell, FormulaCell, LiteralCell } from "../../types/cells";
import {
  ClearCellCommand,
  CommandResult,
  CoreCommand,
  PositionDependentCommand,
  UpdateCellCommand,
} from "../../types/commands";
import { CellPosition, HeaderIndex, RangeAdapterFunctions, UID } from "../../types/misc";

import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { isTextFormat } from "../../helpers/format/format";
import { Format } from "../../types/format";
import {
  AdaptSheetName,
  CompiledFormula,
  RangeCompiledFormula,
  UpdateCellData,
  Zone,
} from "../../types/misc";
import { Range, RangePart } from "../../types/range";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<number, Cell | undefined> | undefined>;
  nextId: number;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CellPlugin extends CorePlugin<CoreState> implements CoreState {
  static getters = [
    "zoneToXC",
    "getCells",
    "getTranslatedCellFormula",
    "getCellById",
    "getFormulaString",
    "getFormulaMovedInSheet",
  ] as const;
  readonly nextId = 1;
  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};

  adaptRanges({ applyChange }: RangeAdapterFunctions, sheetId: UID, sheetName: AdaptSheetName) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.isFormula) {
          for (const range of cell.compiledFormula.dependencies) {
            if (range.sheetId === sheetId || range.invalidSheetName === sheetName.old) {
              const change = applyChange(range);
              if (change.changeType !== "NONE") {
                this.history.update(
                  "cells",
                  sheet,
                  cell.id,
                  "compiledFormula" as any,
                  "dependencies",
                  cell.compiledFormula.dependencies.indexOf(range),
                  change.range
                );
              }
            }
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
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        if ("content" in cmd) {
          this.updateCell(cmd.sheetId, cmd.col, cmd.row, cmd);
        }
        break;

      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
          content: "",
        });
        break;

      case "CLEAR_CELLS":
      case "DELETE_CONTENT":
        this.clearCells(cmd.sheetId, cmd.target);
        break;

      case "DELETE_SHEET": {
        this.history.update("cells", cmd.sheetId, undefined);
      }
    }
  }

  private clearCells(sheetId: UID, zones: Zone[]) {
    for (const cell of this.getters.getCellsFromZones(sheetId, zones)) {
      const position = this.getters.getCellPosition(cell.id);
      this.dispatch("UPDATE_CELL", {
        sheetId: sheetId,
        col: position.col,
        row: position.row,
        content: "",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const sheetId = sheet.id;
      const cellsData = new PositionMap<{ content?: string; style?: number; format?: number }>();
      // cells content
      for (const xc in sheet.cells) {
        if (sheet.cells[xc]) {
          const { col, row } = toCartesian(xc);
          const position = { sheetId: sheet.id, col, row };
          cellsData.set(position, { content: sheet.cells[xc] });
        }
      }
      // cell format
      for (const [position, itemId] of iterateItemIdsPositions(sheet.id, sheet.formats)) {
        const cellData = cellsData.get(position);
        if (cellData) {
          cellData["format"] = itemId;
        } else {
          cellsData.set(position, { format: itemId });
        }
      }
      for (const position of cellsData.keysForSheet(sheetId)) {
        const cellData = cellsData.get(position);
        if (cellData?.content || cellData?.format) {
          const cell = this.importCell(
            position,
            cellData?.content,
            cellData?.format ? data.formats[cellData?.format] : undefined
          );
          this.history.update("cells", sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cellId: cell.id,
            ...position,
          });
        }
      }
    }
  }

  export(data: WorkbookData) {
    for (const _sheet of data.sheets) {
      const cells: { [key: string]: string } = {};
      const positions = Object.values(this.cells[_sheet.id] || {})
        .map((cell) => this.getters.getCellPosition(cell.id))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const position of positions) {
        const cell = this.getters.getCell(position)!;
        const xc = toXC(position.col, position.row);
        if (cell.content) {
          cells[xc] = cell.content;
        }
      }
      _sheet.cells = cells;
    }
  }

  importCell(position: CellPosition, content?: string, format?: Format): Cell {
    const cellId = this.getNextCellId();
    return this.createCell(cellId, content || "", position, format || "");
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
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
    tokens: Token[],
    dependencies: Range[],
    useBoundedReference: boolean = false
  ): string {
    if (!dependencies.length) {
      return concat(tokens.map((token) => token.value));
    }
    let rangeIndex = 0;
    return concat(
      tokens.map((token) => {
        if (token.type === "REFERENCE") {
          const range = dependencies[rangeIndex++];
          return this.getters.getRangeString(range, sheetId, { useBoundedReference });
        }
        return token.value;
      })
    );
  }

  /*
   * Constructs a formula string based on an initial formula and a translation vector
   */
  getTranslatedCellFormula(sheetId: UID, offsetX: number, offsetY: number, tokens: Token[]) {
    const adaptedDependencies = this.getters.createAdaptedRanges(
      compileTokens(tokens).dependencies.map((d) => this.getters.getRangeFromSheetXC(sheetId, d)),
      offsetX,
      offsetY,
      sheetId
    );
    return this.getFormulaString(sheetId, tokens, adaptedDependencies);
  }

  getFormulaMovedInSheet(originSheetId: UID, targetSheetId: UID, tokens: Token[]) {
    const dependencies = compileTokens(tokens).dependencies.map((d) =>
      this.getters.getRangeFromSheetXC(originSheetId, d)
    );
    const adaptedDependencies = this.getters.removeRangesSheetPrefix(targetSheetId, dependencies);
    return this.getFormulaString(targetSheetId, tokens, adaptedDependencies);
  }

  /**
   * Converts a zone to a XC coordinate system
   *
   * The conversion also treats merges as one single cell
   *
   * Examples:
   * {top:0,left:0,right:0,bottom:0} ==> A1
   * {top:0,left:0,right:1,bottom:1} ==> A1:B2
   *
   * if A1:B2 is a merge:
   * {top:0,left:0,right:1,bottom:1} ==> A1
   * {top:1,left:0,right:1,bottom:2} ==> A1:B3
   *
   * if A1:B2 and A4:B5 are merges:
   * {top:1,left:0,right:1,bottom:3} ==> A1:A5
   */
  zoneToXC(
    sheetId: UID,
    zone: Zone,
    fixedParts: RangePart[] = [{ colFixed: false, rowFixed: false }]
  ): string {
    zone = this.getters.expandZone(sheetId, zone);
    const topLeft = toXC(zone.left, zone.top, fixedParts[0]);
    const botRight = toXC(
      zone.right,
      zone.bottom,
      fixedParts.length > 1 ? fixedParts[1] : fixedParts[0]
    );
    const cellTopLeft = this.getters.getMainCellPosition({
      sheetId,
      col: zone.left,
      row: zone.top,
    });
    const cellBotRight = this.getters.getMainCellPosition({
      sheetId,
      col: zone.right,
      row: zone.bottom,
    });
    const sameCell = cellTopLeft.col === cellBotRight.col && cellTopLeft.row === cellBotRight.row;
    if (topLeft !== botRight && !sameCell) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  private getNextCellId() {
    const id = this.nextId;
    this.history.update("nextId", this.nextId + 1);
    return id;
  }

  private updateCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex, after: UpdateCellData) {
    const position = { sheetId, col, row };
    const before = this.getters.getCell(position);

    // Compute the new cell properties
    const afterContent = replaceNewLines(after?.content);
    if (!afterContent && !after.formula) {
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
    const cell = this.createCell(cellId, afterContent, position);
    this.history.update("cells", sheetId, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cellId: cell.id, col, row, sheetId });
  }

  private createCell(id: number, content: string, position: CellPosition, format?: Format): Cell {
    if (!content.startsWith("=")) {
      return this.createLiteralCell(id, content, position, format);
    }
    return this.createFormulaCell(id, content, position.sheetId);
  }

  private createLiteralCell(
    id: number,
    content: string,
    position: CellPosition,
    format?: Format
  ): LiteralCell {
    const locale = this.getters.getLocale();
    const parsedValue = parseLiteral(content, locale);
    switch (typeof parsedValue) {
      case "number":
        const string = toString(parsedValue);
        if (string === content) {
          break;
        }
        format = format !== undefined ? format : this.getters.getCellFormat(position);
        if (!isTextFormat(format)) {
          content = toString(parsedValue);
        }
        break;
      case "boolean":
        format = format !== undefined ? format : this.getters.getCellFormat(position);
        if (!isTextFormat(format)) {
          content = toString(parsedValue);
        }
        break;
    }
    return {
      id,
      content,
      isFormula: false,
      parsedValue,
    };
  }

  private createFormulaCell(id: number, content: string, sheetId: UID): FormulaCell {
    const compiledFormula = compile(content);
    if (compiledFormula.dependencies.length) {
      return this.createFormulaCellWithDependencies(id, compiledFormula, sheetId);
    }
    return {
      id,
      content,
      isFormula: true,
      compiledFormula: {
        ...compiledFormula,
        dependencies: [],
      },
    };
  }

  /**
   * Create a new formula cell with the content
   * being a computed property to rebuild the dependencies XC.
   */
  private createFormulaCellWithDependencies(
    id: number,
    compiledFormula: CompiledFormula,
    sheetId: UID
  ): FormulaCell {
    const dependencies: Range[] = [];
    for (const xc of compiledFormula.dependencies) {
      dependencies.push(this.getters.getRangeFromSheetXC(sheetId, xc));
    }
    return new FormulaCellWithDependencies(
      id,
      compiledFormula,
      dependencies,
      sheetId,
      this.getters.getRangeString
    );
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

  private checkUselessClearCell(cmd: ClearCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    const style = this.getters.getCellStyle(cmd);
    const format = this.getters.getCellFormat(cmd);
    if (!cell) {
      return CommandResult.NoChanges;
    }
    if (!cell.content && !style && !format) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }

  private checkUselessUpdateCell(cmd: UpdateCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    const hasContent = "content" in cmd || "formula" in cmd;
    if (hasContent && cell?.content !== cmd.content) {
      return CommandResult.Success;
    }
    const hasFormat = "format" in cmd;
    if (hasFormat && this.getters.getCellFormat(cmd) !== cmd.format) {
      return CommandResult.Success;
    }
    const hasStyle = "style" in cmd;
    if (hasStyle && !deepEquals(this.getters.getCellStyle(cmd), cmd.style)) {
      return CommandResult.Success;
    }
    return CommandResult.NoChanges;
  }
}

export class FormulaCellWithDependencies implements FormulaCell {
  readonly isFormula = true;
  readonly compiledFormula: RangeCompiledFormula;
  constructor(
    readonly id: number,
    compiledFormula: CompiledFormula,
    dependencies: Range[],
    private readonly sheetId: UID,
    private readonly getRangeString: (
      range: Range,
      sheetId: UID,
      option?: { useBoundedReference: boolean }
    ) => string
  ) {
    let rangeIndex = 0;
    const tokens = compiledFormula.tokens.map((token) => {
      if (token.type === "REFERENCE") {
        const index = rangeIndex++;
        return new RangeReferenceToken(dependencies, index, this.sheetId, this.getRangeString);
      }
      return token;
    });
    this.compiledFormula = {
      ...compiledFormula,
      dependencies,
      tokens,
    };
  }

  get content() {
    return concat(this.compiledFormula.tokens.map((token) => token.value));
  }

  get contentWithFixedReferences() {
    let rangeIndex = 0;
    return concat(
      this.compiledFormula.tokens.map((token) => {
        if (token.type === "REFERENCE") {
          const index = rangeIndex++;
          return this.getRangeString(this.compiledFormula.dependencies[index], this.sheetId, {
            useBoundedReference: true,
          });
        }
        return token.value;
      })
    );
  }
}

class RangeReferenceToken implements Token {
  type = "REFERENCE" as const;

  constructor(
    private ranges: Range[],
    private rangeIndex: number,
    private sheetId,
    private getRangeString: (range: Range, sheetId: UID) => string
  ) {}

  get value() {
    const range = this.ranges[this.rangeIndex];
    return this.getRangeString(range, this.sheetId);
  }
}
