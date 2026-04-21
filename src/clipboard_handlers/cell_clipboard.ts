import { CompiledFormula } from "../formulas/compiler";
import { getPasteZones, makeIndexer } from "../helpers/clipboard/clipboard_helpers";
import { toCartesian, toXC } from "../helpers/coordinates";
import { formatValue } from "../helpers/format/format";
import { canonicalizeNumberValue } from "../helpers/locale";
import { deepEquals } from "../helpers/misc";
import { createPivotFormula } from "../helpers/pivot/pivot_helpers";
import { cellPositions, isZoneInside } from "../helpers/zones";
import { SquishedContent, Squisher } from "../plugins/core/squisher";
import { Unsquisher } from "../plugins/core/unsquisher";
import { Cell, CellValue, CellValueType } from "../types/cells";
import {
  ClipboardCellData,
  ClipboardCopyOptions,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
  CompactCellHandlerData,
  CompactClipboardCell,
  CompactEvaluatedCell,
} from "../types/clipboard";
import { CommandResult } from "../types/commands";
import { Format } from "../types/format";
import { CellPosition, ClipboardCell, HeaderIndex, Style, UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

export class CellClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardCell | null,
  CompactCellHandlerData
> {
  isCutAllowed(data: ClipboardCellData) {
    if (data.zones.length !== 1) {
      return CommandResult.WrongCutSelection;
    }
    return CommandResult.Success;
  }

  copy(
    data: ClipboardCellData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): CompactCellHandlerData | undefined {
    const sheetId = data.sheetId;
    const { rowsIndexes, columnsIndexes } = data;
    const isCopyingOneCell = rowsIndexes.length === 1 && columnsIndexes.length === 1;

    // Pre-allocate the row-major result matrix so we can fill it directly
    // while iterating col-major (required by the squisher).
    const result: (ClipboardCell | null)[][] = rowsIndexes.map(
      () => new Array(columnsIndexes.length)
    );
    const squisher = new Squisher(this.getters);

    for (let ci = 0; ci < columnsIndexes.length; ci++) {
      const col = columnsIndexes[ci];

      for (let ri = 0; ri < rowsIndexes.length; ri++) {
        const row = rowsIndexes[ri];
        const position = { col, row, sheetId };
        let cell = this.getters.getCell(position);
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        const pivotId = this.getters.getPivotIdFromPosition(position);
        const spreader = this.getters.getArrayFormulaSpreadingOn(position);
        if (mode !== "shiftCells" && pivotId && spreader) {
          const pivotZone = this.getters.getSpreadZone(spreader);
          if (
            (!deepEquals(spreader, position) || !isCopyingOneCell) &&
            pivotZone &&
            !data.zones.some((z) => isZoneInside(pivotZone, z))
          ) {
            const pivotCell = this.getters.getPivotCellFromPosition(position);
            const formulaPivotId = this.getters.getPivotFormulaId(pivotId);
            const pivotFormula = createPivotFormula(formulaPivotId, pivotCell);
            cell = {
              id: cell?.id ?? 0,
              style: cell?.style,
              format: cell?.format,
              content: pivotFormula,
              isFormula: false,
              parsedValue: evaluatedCell.value,
            };
          }
        } else if (mode !== "shiftCells" && spreader && !deepEquals(spreader, position)) {
          const isSpreaderCopied =
            rowsIndexes.includes(spreader.row) && columnsIndexes.includes(spreader.col);
          const content = isSpreaderCopied
            ? ""
            : formatValue(evaluatedCell.value, { locale: this.getters.getLocale() });
          cell = {
            id: cell?.id ?? 0,
            style: cell?.style,
            format: evaluatedCell.format,
            content,
            isFormula: false,
            parsedValue: evaluatedCell.value,
          };
        }

        let compiledFormula = cell?.isFormula ? cell.compiledFormula : undefined;
        const rawContent = !cell?.isFormula
          ? cell?.content ?? ""
          : cell.compiledFormula.toFormulaString(this.getters);

        let squishedContent: SquishedContent = "";
        if (rawContent) {
          let tempCell: Cell;
          if (compiledFormula) {
            tempCell = { id: -1, isFormula: true, compiledFormula };
          } else if (rawContent.startsWith("=")) {
            // Formula string without a compiledFormula (e.g. pivot substitution cells).
            // Compile it so the squisher treats it as a formula, not a plain number.
            compiledFormula = CompiledFormula.Compile(rawContent, sheetId, this.getters);
            tempCell = { id: -1, isFormula: true, compiledFormula };
          } else {
            const parsedValue = evaluatedCell.value;
            tempCell = {
              id: -1,
              isFormula: false,
              content: rawContent,
              parsedValue: parsedValue !== null && parsedValue !== undefined ? parsedValue : "",
            };
          }
          squishedContent = squisher.squish(tempCell, sheetId);
        }

        // Truly empty cells (no content, no style, no format) are stored as null
        // to avoid polluting copiedData with useless entries.
        if (!squishedContent && !cell?.style && !cell?.format) {
          result[ri][ci] = null;
          continue;
        }

        result[ri][ci] = {
          content: squishedContent,
          style: cell?.style,
          format: cell?.format,
          compiledFormula,
          evaluatedCell: {
            value: evaluatedCell.value,
            format: evaluatedCell.format,
            formattedValue: evaluatedCell.formattedValue,
          },
        };
      }
    }

    return this.compact(result);
  }

  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: (ClipboardCell | null)[][],
    clipboardOptions: ClipboardOptions
  ): CommandResult {
    if (content.length === 0) {
      return CommandResult.Success;
    }
    if (clipboardOptions?.isCutOperation && clipboardOptions?.pasteOption !== undefined) {
      // cannot paste only format or only value if the previous operation is a CUT
      return CommandResult.WrongPasteOption;
    }
    if (target.length > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      if (content.length > 1 || content[0].length > 1) {
        return CommandResult.WrongPasteSelection;
      }
    }
    const clipboardHeight = content.length;
    const clipboardWidth = content[0].length;
    for (const zone of getPasteZones(target, content)) {
      if (this.getters.doesIntersectMerge(sheetId, zone)) {
        if (
          target.length > 1 ||
          !this.getters.isSingleCellOrMerge(sheetId, target[0]) ||
          clipboardHeight * clipboardWidth !== 1
        ) {
          return CommandResult.WillRemoveExistingMerge;
        }
      }
    }
    return CommandResult.Success;
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(
    target: ClipboardPasteTarget,
    content: (ClipboardCell | null)[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    const zones = target.zones;
    const sheetId = target.sheetId;
    const unsquishedContent = this.unsquishClipboardCells(content, sheetId);
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, unsquishedContent, options, positions);
    } else {
      this.pasteFromCut(sheetId, zones, unsquishedContent, options, positions);
    }
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: (ClipboardCell | null)[][],
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
    const width = content[0].length;
    const height = content.length;
    if (options?.isCutOperation) {
      return {
        sheetId,
        zones: [
          {
            left: target[0].left,
            top: target[0].top,
            right: target[0].left + width - 1,
            bottom: target[0].top + height - 1,
          },
        ],
      };
    }
    if (width === 1 && height === 1) {
      return { zones: [], sheetId };
    }
    return { sheetId, zones: getPasteZones(target, content) };
  }

  private pasteFromCut(
    sheetId: UID,
    target: Zone[],
    content: (ClipboardCell | null)[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    this.clearClippedZones(positions);
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content, options, positions);
  }

  /**
   * Clear the clipped zones: remove the cells content
   */
  private clearClippedZones(positions: ClipboardPositions) {
    for (const position of positions.zones.flatMap((zone) =>
      cellPositions(positions.sheetId, zone)
    )) {
      this.dispatch("UPDATE_CELL", {
        ...position,
        content: "",
      });
    }
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    cells: (ClipboardCell | null)[][],
    clipboardOptions: ClipboardOptions,
    clipboardPositions: ClipboardPositions
  ) {
    const { rowsIndexes: originRows, columnsIndexes: originCols } = clipboardPositions;
    for (const [r, rowCells] of cells.entries()) {
      const originRow = originRows?.[r];
      const deltaRow = originRow !== undefined ? row + r - originRow : 0;
      for (const [c, origin] of rowCells.entries()) {
        const originCol = originCols?.[c];
        const deltaCol = originCol !== undefined ? col + c - originCol : 0;
        const position = { col: col + c, row: row + r, sheetId };
        if (!origin) {
          // Empty source cell: clear the target cell if it exists.
          // But for onlyFormat paste, we only clear the format, not the content.
          if (
            clipboardOptions?.pasteOption !== "onlyFormat" &&
            this.getters.getEvaluatedCell(position).type !== CellValueType.empty
          ) {
            this.dispatch("CLEAR_CELL", position);
          } else if (clipboardOptions?.pasteOption === "onlyFormat") {
            // Remove only the format/style from the target cell.
            const targetCell = this.getters.getCell(position);
            if (targetCell?.format || targetCell?.style) {
              this.dispatch("UPDATE_CELL", { ...position, format: "", style: null });
            }
          }
          continue;
        }
        this.pasteCell(origin, position, deltaCol, deltaRow, clipboardOptions, clipboardPositions);
      }
    }
  }

  /**
   * Paste the cell at the given position to the target position
   */
  private pasteCell(
    origin: ClipboardCell,
    target: CellPosition,
    deltaCol: number,
    deltaRow: number,
    clipboardOption: ClipboardOptions,
    clipboardPositions: ClipboardPositions
  ) {
    const { sheetId } = target;
    const targetCell = this.getters.getCell(target);
    const targetEvaluatedCell = this.getters.getEvaluatedCell(target);
    const originFormat = origin?.format || origin.evaluatedCell.format;

    let content = typeof origin.content === "string" ? origin.content : undefined;
    const newStyle = { ...targetCell?.style, ...origin.style };
    const style = Object.keys(newStyle ?? {}).length === 0 ? undefined : newStyle;
    if (clipboardOption?.pasteOption === "asValue") {
      // evaluatedCell.value may be absent for plain literal cells (stripped during HTML compaction).
      // In that case, fall back to the content string which holds the literal value.
      const value =
        origin.evaluatedCell.value !== null && origin.evaluatedCell.value !== undefined
          ? origin.evaluatedCell.value?.toString()
          : content;
      this.dispatch("UPDATE_CELL", {
        ...target,
        content: value || "",
      });
      return;
    }

    if (clipboardOption?.pasteOption === "onlyFormat") {
      this.dispatch("UPDATE_CELL", {
        ...target,
        style,
        format: originFormat ?? targetEvaluatedCell.format,
      });
      return;
    }

    if (origin?.compiledFormula?.hasDependencies && !clipboardOption?.isCutOperation) {
      content = this.getters.getTranslatedCellFormula(
        sheetId,
        deltaCol,
        deltaRow,
        origin.compiledFormula
      );
    } else if (origin?.compiledFormula?.hasDependencies) {
      content = this.getters.getFormulaMovedInSheet(sheetId, origin.compiledFormula);
    } else if (!origin?.compiledFormula && content?.startsWith("=")) {
      // No compiledFormula (stripped during compaction). Compile in source sheet context and translate/move.
      const sourceSheetId =
        clipboardPositions.sheetId && this.getters.tryGetSheet(clipboardPositions.sheetId)
          ? clipboardPositions.sheetId
          : sheetId;
      const compiled = CompiledFormula.Compile(content, sourceSheetId, this.getters);
      if (compiled.hasDependencies) {
        if (!clipboardOption?.isCutOperation) {
          content = this.getters.getTranslatedCellFormula(sheetId, deltaCol, deltaRow, compiled);
        } else {
          content = this.getters.getFormulaMovedInSheet(sheetId, compiled);
        }
      }
    }
    if (content !== "" || origin.format || style) {
      this.dispatch("UPDATE_CELL", {
        ...target,
        content,
        style,
        format: origin.format,
      });
    } else if (targetEvaluatedCell.type !== "empty") {
      this.dispatch("UPDATE_CELL", {
        content: "",
        ...target,
      });
    }
  }

  /**
   * Unsquish clipboard cells. The cells are squished in col-major order during copy.
   * This reconstructs the full content for each cell before pasting.
   */
  unsquishClipboardCells(
    cells: (ClipboardCell | null)[][],
    sourceSheetId: UID
  ): (ClipboardCell | null)[][] {
    const numRows = cells.length;
    const numCols = cells[0]?.length ?? 0;

    const squishedMap: Record<string, SquishedContent> = {};
    for (let c = 0; c < numCols; c++) {
      for (let r = 0; r < numRows; r++) {
        const cell = cells[r][c];
        if (cell && cell.content !== "") {
          squishedMap[toXC(c, r)] = cell.content;
        }
      }
    }

    const unsquishedMap = new Map<string, { content?: string; compiled?: CompiledFormula }>();
    const unsquisher = new Unsquisher();
    for (const item of unsquisher.unsquishSheet(squishedMap, sourceSheetId, this.getters)) {
      unsquishedMap.set(toXC(item.position.col, item.position.row), {
        content: item.content,
        compiled: item.compiled,
      });
    }

    // Rebuild ClipboardCell[][] with unsquished (plain string) content.
    // We intentionally do NOT propagate `unsquished.compiled` into `compiledFormula`:
    // the unsquisher compiles formulas with the source sheetId, which may not exist in the
    // target model (cross-spreadsheet paste). pasteCell will handle translation by compiling
    // from the content string in the target context when needed.
    return cells.map((row, r) =>
      row.map((cell, c) => {
        if (!cell) {
          return null;
        }
        const unsquished = unsquishedMap.get(toXC(c, r));
        const content = unsquished?.compiled
          ? unsquished.compiled.toFormulaString(this.getters)
          : unsquished?.content ?? "";
        return {
          ...cell,
          content,
          compiledFormula: cell.compiledFormula,
        };
      })
    );
  }

  convertTextToClipboardData(text: string): ClipboardCell[][] {
    const locale = this.getters.getLocale();
    const cells: ClipboardCell[][] = [];
    const values: string[][] = [];
    let rowLength = 0;
    for (const [i, row] of text.replace(/\r/g, "").split("\n").entries()) {
      values.push(row.split("\t"));
      if (values[i].length > rowLength) {
        rowLength = values[i].length;
      }
    }
    for (const row of values) {
      const rowCells: ClipboardCell[] = [];
      for (let i = 0; i < rowLength; i++) {
        const content = canonicalizeNumberValue(row[i] || "", locale);
        rowCells.push({
          content: content,
          evaluatedCell: {
            formattedValue: content,
            value: row[i],
          },
        });
      }
      cells.push(rowCells);
    }
    return cells;
  }

  protected compact(cells: (ClipboardCell | null)[][]): CompactCellHandlerData {
    const { index: styleIndex, table: styleTable } = makeIndexer<Style>(JSON.stringify);
    const { index: formatIndex, table: formatTable } = makeIndexer<Format>((f) => f);
    const rows = cells.length;
    const cols = cells[0]?.length ?? 0;

    // Build a col-major map of squished content so that mergeContentRangeKeys can
    // collapse consecutive same-column cells with identical squished values into
    // range keys (e.g. "A1:A1000"), reducing the HTML clipboard payload.
    const rawSquishedMap: Record<string, SquishedContent> = {};
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const content = cells[r][c]?.content;
        if (content) {
          rawSquishedMap[toXC(c, r)] = content;
        }
      }
    }
    const squishedMap = this.mergeContentRangeKeys(rawSquishedMap);

    // Build the sparse items array. Content is now stored in squishedMap, so
    // items only carry style/format/evaluatedCell.
    const items: { r: number; c: number; v: CompactClipboardCell }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        if (!cell) {
          continue;
        }
        const { formattedValue, format: ecFormat, ...ecRest } = cell.evaluatedCell ?? {};
        // Extract content separately so it does NOT end up in `rest` / `v`.
        const {
          compiledFormula: _cf,
          evaluatedCell: _origEC,
          style,
          format,
          content: _content,
          ...rest
        } = cell;
        const isPlainLiteral = typeof cell.content === "string" && !cell.content.startsWith("=");
        const evaluatedCell: CompactEvaluatedCell = isPlainLiteral ? {} : { ...ecRest };
        if (ecFormat !== undefined && ecFormat !== format) {
          evaluatedCell.format = ecFormat;
        }
        // Preserve formattedValue when it differs from what expand() would derive from content.
        // This covers both formula cells (with custom formats) and plain literal cells
        // that have an applied format (e.g. numeric value 1 displayed as "12/31/1899").
        const derivedFormattedValue = typeof cell.content === "string" ? cell.content : "";
        if (
          formattedValue !== undefined &&
          formattedValue !== (ecRest.value?.toString() ?? derivedFormattedValue)
        ) {
          evaluatedCell.formattedValue = formattedValue;
        }
        const v: CompactClipboardCell = { ...rest };
        if (Object.keys(evaluatedCell).length > 0) {
          v.evaluatedCell = evaluatedCell;
        }
        if (style !== undefined && style !== null) {
          v.styleIdx = styleIndex(style);
        }
        if (format !== undefined) {
          v.formatIdx = formatIndex(format);
        }
        if (
          v.styleIdx === undefined &&
          v.formatIdx === undefined &&
          v.evaluatedCell === undefined
        ) {
          continue;
        }
        items.push({ r, c, v });
      }
    }
    return { rows, cols, items, styleTable, formatTable, squishedMap };
  }

  /**
   * Merges consecutive same-column cells with identical squished content into
   * range keys, e.g. { A1: x, A2: x, A3: x } → { "A1:A3": x }.
   * Input keys must be in col-major insertion order (all rows of column 0, then
   * column 1, …) as produced by compact().
   */
  private mergeContentRangeKeys(
    map: Record<string, SquishedContent>
  ): Record<string, SquishedContent> {
    const keys = Object.keys(map);
    const result: Record<string, SquishedContent> = {};
    let i = 0;
    while (i < keys.length) {
      const startPos = toCartesian(keys[i]);
      let mergeCount = 0;
      while (i + mergeCount + 1 < keys.length) {
        const nextPos = toCartesian(keys[i + mergeCount + 1]);
        if (
          nextPos.col !== startPos.col ||
          nextPos.row !== startPos.row + mergeCount + 1 ||
          !deepEquals(map[keys[i + mergeCount + 1]], map[keys[i]])
        ) {
          break;
        }
        mergeCount++;
      }
      if (mergeCount > 0) {
        result[`${keys[i]}:${toXC(startPos.col, startPos.row + mergeCount)}`] = map[keys[i]];
        i += mergeCount + 1;
      } else {
        result[keys[i]] = map[keys[i]];
        i++;
      }
    }
    return result;
  }

  expand(data: CompactCellHandlerData): (ClipboardCell | null)[][] {
    if (Array.isArray(data)) {
      return data as (ClipboardCell | null)[][];
    }
    const compactData = data as CompactCellHandlerData;
    const { rows, cols, items, styleTable, formatTable, squishedMap } = compactData;
    const result: (ClipboardCell | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null)
    );

    for (const [key, content] of Object.entries(squishedMap)) {
      const strContent = typeof content === "string" ? content : "";
      const cell: ClipboardCell = {
        content,
        evaluatedCell: { value: strContent || null, format: undefined, formattedValue: strContent },
      };
      const colonIdx = key.indexOf(":");
      if (colonIdx !== -1) {
        const startPos = toCartesian(key.slice(0, colonIdx));
        const endPos = toCartesian(key.slice(colonIdx + 1));
        for (let r = startPos.row; r <= endPos.row && r < rows; r++) {
          const c = startPos.col;
          if (c < cols) {
            result[r][c] = cell;
          }
        }
      } else {
        const { col: c, row: r } = toCartesian(key);
        if (r < rows && c < cols) {
          result[r][c] = cell;
        }
      }
    }

    for (const { r, c, v: cell } of items) {
      const { styleIdx, formatIdx, evaluatedCell: compactEC } = cell;
      const style: Style | undefined = styleIdx !== undefined ? styleTable[styleIdx] : undefined;
      const format: Format | undefined =
        formatIdx !== undefined ? formatTable[formatIdx] : undefined;
      const existingContent = result[r][c]?.content ?? "";
      const isPlainLiteral =
        typeof existingContent === "string" && !existingContent.startsWith("=");
      let ecValue: CellValue = null;
      if (compactEC?.value !== undefined) {
        ecValue = compactEC.value;
      } else if (isPlainLiteral) {
        ecValue = typeof existingContent === "string" ? existingContent : null;
      }
      const ecFormat: Format | undefined = compactEC?.format ?? format;
      const defaultFormattedValue =
        ecValue !== null && ecValue !== undefined
          ? ecValue.toString()
          : typeof existingContent === "string"
          ? existingContent
          : "";
      const formattedValue = compactEC?.formattedValue ?? defaultFormattedValue;
      result[r][c] = {
        content: existingContent,
        style,
        format,
        evaluatedCell: { value: ecValue, format: ecFormat, formattedValue },
      };
    }

    return result;
  }
}
