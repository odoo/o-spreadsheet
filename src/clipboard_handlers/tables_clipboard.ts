import { isZoneInside, range, removeFalsyAttributes, zoneToDimension } from "../helpers";
import {
  Border,
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  Range,
  Style,
  TableConfig,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface TableStyle {
  style?: Style;
  border?: Border;
}

interface CopiedTable {
  range: Range;
  config: TableConfig;
  filtersValues: Array<string[]>;
}

interface TableCell {
  style?: TableStyle;
  table?: CopiedTable;
}

interface ClipboardContent {
  tableCells: TableCell[][];
  sheetId: UID;
}

export class TableClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  TableCell
> {
  copy(data: ClipboardCellData): ClipboardContent {
    const sheetId = this.getters.getActiveSheetId();

    const { rowsIndexes, columnsIndexes, zones } = data;
    if (!zones || !rowsIndexes.length || !columnsIndexes.length) {
      return { tableCells: [[]], sheetId };
    }

    const copiedTablesIds = new Set<UID>();
    const tableCells: TableCell[][] = [];
    for (let row of rowsIndexes) {
      let tableCellsInRow: TableCell[] = [];
      tableCells.push(tableCellsInRow);
      for (let col of columnsIndexes) {
        const position = { col, row, sheetId };
        const table = this.getters.getTable(position);
        if (!table || copiedTablesIds.has(table.id)) {
          tableCellsInRow.push({});
          continue;
        }
        // Copy whole table
        if (zones.some((z) => isZoneInside(table.range.zone, z))) {
          copiedTablesIds.add(table.id);
          const values: Array<string[]> = [];
          for (const col of range(table.range.zone.left, table.range.zone.right + 1)) {
            values.push(
              this.getters.getFilterHiddenValues({ sheetId, col, row: table.range.zone.top })
            );
          }
          tableCellsInRow.push({
            table: { filtersValues: values, range: table.range, config: table.config },
          });
        }
        // Copy only style of cell
        else {
          tableCellsInRow.push({ style: this.getTableStyleToCopy(position) });
        }
      }
    }

    return {
      tableCells,
      sheetId: this.getters.getActiveSheetId(),
    };
  }

  /**
   * Get the style to copy for a cell. We need to copy both the table style and the cell style, because
   * UPDATE_CELL replace the whole style of the cell with the style of the command, it doesn't merge the two.
   */
  private getTableStyleToCopy(cellPosition: CellPosition): TableStyle {
    const styleFromTable = this.getters.getCellTableStyle(cellPosition);
    const cellStyle = this.getters.getCellStyle(cellPosition);

    const bordersFromTable = this.getters.getCellTableBorder(cellPosition);
    const cellBorder = this.getters.getCellBorder(cellPosition);

    return {
      style: { ...styleFromTable, ...removeFalsyAttributes(cellStyle) },
      border: { ...bordersFromTable, ...removeFalsyAttributes(cellBorder) },
    };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options?: ClipboardOptions) {
    if (!content || !content.tableCells) {
      return;
    }
    const zones = target.zones;
    const sheetId = this.getters.getActiveSheetId();
    if (!options?.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content.tableCells, options);
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
    for (const row of content.tableCells) {
      for (const tableCell of row) {
        if (tableCell.table) {
          this.dispatch("REMOVE_TABLE", {
            sheetId: content.sheetId,
            target: [tableCell.table.range.zone],
          });
        }
      }
    }
    const selection = target[0];
    this.pasteZone(sheetId, selection.left, selection.top, content.tableCells, options);
  }

  protected pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    tableCells: TableCell[][],
    clipboardOptions?: ClipboardOptions
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
  }

  private pasteTableCell(
    sheetId: UID,
    tableCell: TableCell,
    position: CellPosition,
    options?: ClipboardOptions
  ) {
    if (tableCell.table && !options?.pasteOption) {
      const { range: tableRange, filtersValues } = tableCell.table;
      const zoneDims = zoneToDimension(tableRange.zone);
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
      });
      for (const i of range(0, filtersValues.length)) {
        this.dispatch("UPDATE_FILTER", {
          sheetId: position.sheetId,
          col: newTableZone.left + i,
          row: newTableZone.top,
          hiddenValues: filtersValues[i],
        });
      }
    }

    // Do not paste table style if we're inside another table
    if (!this.getters.getTable(position)) {
      if (tableCell.style?.style && options?.pasteOption !== "asValue") {
        this.dispatch("UPDATE_CELL", { ...position, style: tableCell.style.style });
      }
      if (tableCell.style?.border) {
        this.dispatch("SET_BORDER", { ...position, border: tableCell.style.border });
      }
    }
  }
}
