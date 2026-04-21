import {
  compactBorderCell,
  expandBorderCell,
  expandCompactTableCells,
  makeIndexer,
} from "../helpers/clipboard/clipboard_helpers";
import { removeFalsyAttributes } from "../helpers/misc";
import { isZoneInside, zoneToDimension } from "../helpers/zones";
import {
  ClipboardCellData,
  ClipboardCopiedTable,
  ClipboardCopyOptions,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
  ClipboardTableCell,
  ClipboardTableStyle,
  CompactBorderCell,
  CompactClipboardTableCell,
  CompactTableHandlerData,
  CompactTableStyle,
} from "../types/clipboard";
import { BorderDescr, CellPosition, HeaderIndex, UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

export class TableClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardTableCell,
  CompactTableHandlerData
> {
  copy(
    data: ClipboardCellData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): CompactTableHandlerData | undefined {
    const sheetId = data.sheetId;

    const { rowsIndexes, columnsIndexes, zones } = data;

    const copiedTablesIds = new Set<UID>();
    const tableCells: ClipboardTableCell[][] = [];
    for (const row of rowsIndexes) {
      const tableCellsInRow: ClipboardTableCell[] = [];
      tableCells.push(tableCellsInRow);
      for (const col of columnsIndexes) {
        const position = { col, row, sheetId };
        const table = this.getters.getTable(position);
        if (!table) {
          tableCellsInRow.push({});
          continue;
        }
        const coreTable = this.getters.getCoreTable(position);
        const tableZone = coreTable?.range.zone;
        let copiedTable: ClipboardCopiedTable | undefined = undefined;
        // Copy whole table
        if (
          !copiedTablesIds.has(table.id) &&
          coreTable &&
          tableZone &&
          zones.some((z) => isZoneInside(tableZone, z))
        ) {
          copiedTablesIds.add(table.id);
          let { numberOfRows } = zoneToDimension(tableZone);
          for (let rowIndex = tableZone.top; rowIndex <= tableZone.bottom; rowIndex++) {
            if (!isCutOperation && !rowsIndexes.includes(rowIndex)) {
              numberOfRows--;
            }
          }
          const range = coreTable.range;
          const newRange = this.getters.extendRange(
            coreTable.range,
            "ROW",
            range.zone.top + numberOfRows - 1 - range.zone.bottom
          );
          copiedTable = {
            range: this.getters.getRangeData(newRange),
            config: coreTable.config,
            type: coreTable.type,
          };
        }
        if (table.isPivotTable) {
          const isTopLeft = table.range.zone.top === row && table.range.zone.left === col;
          const isWholePivotSelected = zones.some((z) => isZoneInside(table.range.zone, z));
          if (isTopLeft || isWholePivotSelected) {
            copiedTablesIds.add(table.id);
          }
        }
        if (mode !== "shiftCells") {
          tableCellsInRow.push({
            table: copiedTable,
            style: this.getTableStyleToCopy(position),
            isWholeTableCopied: copiedTablesIds.has(table.id),
          });
        }
      }
    }

    return this.compact(tableCells);
  }

  /**
   * Get the style to copy for a cell. We need to copy both the table style and the cell style, because
   * UPDATE_CELL replace the whole style of the cell with the style of the command, it doesn't merge the two.
   */
  private getTableStyleToCopy(cellPosition: CellPosition): ClipboardTableStyle {
    const styleFromTable = removeFalsyAttributes({
      ...this.getters.getCellTableStyle(cellPosition),
      hideGridLines: false,
    });
    const cellStyle = this.getters.getCellStyle(cellPosition);

    const bordersFromTable = this.getters.getCellTableBorder(cellPosition);
    const cellBorder = this.getters.getCellBorder(cellPosition);

    return {
      style: { ...styleFromTable, ...removeFalsyAttributes(cellStyle) },
      border: { ...bordersFromTable, ...removeFalsyAttributes(cellBorder) },
    };
  }

  paste(
    target: ClipboardPasteTarget,
    content: ClipboardTableCell[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    const zones = target.zones;
    const sheetId = target.sheetId;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content, options, positions);
    } else {
      this.pasteFromCut(sheetId, zones, content, options, positions);
    }
  }

  private pasteFromCut(
    sheetId: UID,
    target: Zone[],
    content: ClipboardTableCell[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    for (const row of content) {
      for (const tableCell of row) {
        if (tableCell.table) {
          this.dispatch("REMOVE_TABLE", {
            sheetId: positions.sheetId,
            target: [this.getters.getRangeFromRangeData(tableCell.table.range).zone],
          });
        }
      }
    }
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content, options);
  }

  protected pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    tableCells: ClipboardTableCell[][],
    clipboardOptions?: ClipboardOptions,
    _positions?: ClipboardPositions
  ) {
    for (let r = 0; r < tableCells.length; r++) {
      const rowCells = tableCells[r];
      for (let c = 0; c < rowCells.length; c++) {
        const tableCell = rowCells[c];
        if (!tableCell) {
          continue;
        }
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteTableCell(sheetId, tableCell, position, clipboardOptions);
      }
    }

    if (tableCells.length === 1) {
      for (let c = 0; c < tableCells[0].length; c++) {
        this.dispatch("AUTOFILL_TABLE_COLUMN", { col: col + c, row, sheetId });
      }
    }
  }

  private pasteTableCell(
    sheetId: UID,
    tableCell: ClipboardTableCell,
    position: CellPosition,
    options?: ClipboardOptions
  ) {
    if (tableCell.table && !options?.pasteOption) {
      const { range: tableRange } = tableCell.table;
      const zoneDims = zoneToDimension(this.getters.getRangeFromRangeData(tableRange).zone);
      const newTableZone = {
        left: position.col,
        top: position.row,
        right: position.col + zoneDims.numberOfCols - 1,
        bottom: position.row + zoneDims.numberOfRows - 1,
      };
      this.dispatch("CREATE_TABLE", {
        sheetId: position.sheetId,
        ranges: [this.getters.getRangeDataFromZone(sheetId, newTableZone)],
        config: tableCell.table.config,
        tableType: tableCell.table.type,
      });
    }

    // We cannot check for dynamic tables, because at this point the paste can have changed the evaluation, and the
    // dynamic tables are not yet computed
    if (this.getters.getCoreTable(position) || options?.pasteOption === "asValue") {
      return;
    }
    if (
      (!options?.pasteOption && !tableCell.isWholeTableCopied) ||
      options?.pasteOption === "onlyFormat"
    ) {
      if (tableCell.style?.style) {
        this.dispatch("UPDATE_CELL", { ...position, style: tableCell.style.style });
      }
      if (tableCell.style?.border) {
        this.dispatch("SET_BORDER", { ...position, border: tableCell.style.border });
      }
    }
  }

  protected compact(array2D: ClipboardTableCell[][]): CompactTableHandlerData {
    const { index: tableIndex, table: tables } = makeIndexer<ClipboardCopiedTable>((t) =>
      JSON.stringify(t.range)
    );
    const { index: descrIndex, table: borderDescrTable } = makeIndexer<BorderDescr>(
      (d) => `${d.style}|${d.color}`
    );
    const { index: indexCompactStyle, table: styleTable } = makeIndexer<CompactTableStyle>(
      JSON.stringify
    );

    const styleIndex = (style: ClipboardTableStyle): number => {
      const compactStyle: CompactTableStyle = {};
      if (style.style) {
        compactStyle.style = style.style;
      }
      if (style.border) {
        compactStyle.border = compactBorderCell(style.border, descrIndex);
      }
      return indexCompactStyle(compactStyle);
    };

    const rows = array2D.length;
    const cols = array2D[0]?.length ?? 0;
    const items: { r: number; c: number; v: CompactClipboardTableCell }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < (array2D[r]?.length ?? 0); c++) {
        const cell = array2D[r][c];
        if (!cell) {
          continue;
        }
        const compact: CompactClipboardTableCell = {};
        if (cell.table) {
          compact.tableIdx = tableIndex(cell.table);
        }
        if (cell.style) {
          compact.styleIdx = styleIndex(cell.style);
        }
        if (cell.isWholeTableCopied) {
          compact.isWholeTableCopied = true;
        }
        if (Object.keys(compact).length === 0) {
          continue;
        }
        items.push({ r, c, v: compact });
      }
    }
    return { rows, cols, tables, borderDescrTable, styleTable, items };
  }

  expand(data: unknown): ClipboardTableCell[][] {
    if (Array.isArray(data)) {
      return data as ClipboardTableCell[][];
    }
    const tableData = data as CompactTableHandlerData;
    const borderDescrTable: BorderDescr[] = tableData.borderDescrTable;

    const expandStyle = (cs: CompactTableStyle): ClipboardTableStyle => {
      const s: ClipboardTableStyle = {};
      if (cs.style) {
        s.style = cs.style;
      }
      if (cs.border) {
        s.border = expandBorderCell(cs.border as CompactBorderCell, borderDescrTable);
      }
      return s;
    };

    return expandCompactTableCells(tableData, expandStyle);
  }
}
