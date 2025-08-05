import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { columnRowIndexesToZones } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import {
  cellPositions,
  intersection,
  isZoneInside,
  removeFalsyAttributes,
  zoneToDimension,
} from "../helpers";
import {
  Border,
  CellPosition,
  ClipboardCellData,
  ClipboardCopyOptions,
  ClipboardOptions,
  ClipboardPasteTarget,
  CoreTableType,
  HeaderIndex,
  Map2D,
  RangeData,
  Style,
  TableConfig,
  UID,
  Zone,
} from "../types";

interface TableStyle {
  style?: Style;
  border?: Border;
}

interface CopiedTable {
  range: RangeData;
  config: TableConfig;
  type: CoreTableType;
}

interface TableCell {
  style?: TableStyle;
  table?: CopiedTable;
  isWholeTableCopied?: boolean;
}

interface ClipboardContent {
  cellContent: Map2D<TableCell>;
  sheetId: UID;
}

export class TableClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  copy(
    data: ClipboardCellData,
    isCutOperation?: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): ClipboardContent {
    const sheetId = data.sheetId;

    const { rowsIndexes, columnsIndexes } = data;

    const copiedTablesIds = new Set<UID>();
    const tableCells: Map2D<TableCell> = new Map2D(columnsIndexes.length, rowsIndexes.length);
    if (mode === "shiftCells") return { cellContent: tableCells, sheetId };
    for (const [zone, colsBefore, rowsBefore] of columnRowIndexesToZones(
      data.columnsIndexes,
      data.rowsIndexes
    )) {
      const tables = this.getters.getTablesOverlappingZones(sheetId, [zone]);
      for (const table of tables) {
        const inter = intersection(zone, table.range.zone);
        if (!inter) continue;
        for (const position of cellPositions(sheetId, inter)) {
          const coreTable = this.getters.getCoreTable(position);
          const tableZone = coreTable?.range.zone;
          // We use data.zones because we want to copy the table even if some row/col are filtered
          const wholeTable = tableZone && data.zones.some((z) => isZoneInside(tableZone, z));
          let copiedTable: CopiedTable | undefined = undefined;
          if (!copiedTablesIds.has(table.id) && coreTable && tableZone && wholeTable) {
            copiedTablesIds.add(table.id);
            let { numberOfRows } = zoneToDimension(tableZone);
            for (let rowIndex = tableZone.top; rowIndex <= tableZone.bottom; rowIndex++) {
              if (!isCutOperation && !rowsIndexes.has(rowIndex)) {
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
          tableCells.set(
            position.col - zone.left + colsBefore,
            position.row - zone.top + rowsBefore,
            {
              table: copiedTable,
              style: this.getTableStyleToCopy(position),
              isWholeTableCopied: copiedTablesIds.has(table.id),
            }
          );
        }
      }
    }

    return {
      cellContent: tableCells,
      sheetId: data.sheetId,
    };
  }

  /**
   * Get the style to copy for a cell. We need to copy both the table style and the cell style, because
   * UPDATE_CELL replace the whole style of the cell with the style of the command, it doesn't merge the two.
   */
  private getTableStyleToCopy(cellPosition: CellPosition): TableStyle {
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

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const zones = target.zones;
    const sheetId = target.sheetId;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content, options);
    } else {
      this.pasteFromCut(sheetId, zones, content, options);
    }
  }

  private pasteFromCut(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ) {
    for (const tableCell of content.cellContent.values()) {
      if (tableCell.table) {
        this.dispatch("REMOVE_TABLE", {
          sheetId: content.sheetId,
          target: [this.getters.getRangeFromRangeData(tableCell.table.range).zone],
        });
      }
    }
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content, options);
  }

  protected pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    content: ClipboardContent,
    clipboardOptions?: ClipboardOptions
  ) {
    for (const [c, r, tableCell] of content.cellContent.entries()) {
      const position = { col: col + c, row: row + r, sheetId };
      this.pasteTableCell(sheetId, tableCell, position, clipboardOptions);
    }

    if (content.cellContent.height === 1) {
      const zone = { left: col, right: col + content.cellContent.width, top: row, bottom: row };
      for (const table of this.getters.getCoreTables(sheetId)) {
        const inter = intersection(table.range.zone, zone);
        if (!inter) continue;
        for (let c = inter.left; c <= inter.right; c++) {
          this.dispatch("AUTOFILL_TABLE_COLUMN", { col: c, row, sheetId });
        }
      }
    }
  }

  private pasteTableCell(
    sheetId: UID,
    tableCell: TableCell,
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
}
