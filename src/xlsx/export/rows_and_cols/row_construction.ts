import { DEFAULT_CELL_HEIGHT } from "../../../constants";
import { PositionMap } from "../../../helpers/cells/position_map";
import { toXC } from "../../../helpers/coordinates";
import { iterateItemIdsPositions } from "../../../helpers/data_normalization";
import { ExcelSheetData, ExcelWorkbookData } from "../../../types/workbook_data";
import { XLSXCell, XLSXRow, XLSXStructure } from "../../../types/xlsx";
import { constructCell, isTableHeaderOrTotal, shouldEmitCell } from "../cells/cell_construction";
import { extractStyle, normalizeStyle } from "../styles/style_construction";
import { convertHeightToExcel } from "../xlsx_units";

export function constructRows(
  construct: XLSXStructure,
  data: ExcelWorkbookData,
  sheet: ExcelSheetData
): XLSXRow[] {
  const rows: XLSXRow[] = [];
  const stylesMap = new PositionMap(iterateItemIdsPositions(sheet.id, sheet.styles));
  const bordersMap = new PositionMap(iterateItemIdsPositions(sheet.id, sheet.borders));
  const formatsMap = new PositionMap(iterateItemIdsPositions(sheet.id, sheet.formats));

  for (let r = 0; r < sheet.rowNumber; r++) {
    const row = sheet.rows[r] || {};
    const rowCells: XLSXCell[] = [];
    for (let c = 0; c < sheet.colNumber; c++) {
      const xc = toXC(c, r);
      const content = sheet.cells[xc] as string | undefined;
      const value = sheet.cellValues[xc];
      const position = { sheetId: sheet.id, col: c, row: r };
      const styleId = stylesMap.get(position);
      const formatId = formatsMap.get(position);
      const borderId = bordersMap.get(position);
      if (!shouldEmitCell(content, value, styleId, formatId, borderId)) {
        continue;
      }
      const styleIndex = normalizeStyle(
        construct,
        extractStyle(data, content, styleId, formatId, borderId)
      );
      const cell = constructCell({
        xc,
        content,
        value,
        formulaSpillRange: sheet.formulaSpillRanges[xc] ?? xc,
        styleIndex,
        formatId,
        data,
        construct,
        isForcedString: isTableHeaderOrTotal(c, r, sheet),
      });
      if (cell) {
        rowCells.push(cell);
      }
    }

    const hasRowAttributes =
      (row.size !== undefined && row.size !== DEFAULT_CELL_HEIGHT) ||
      row.isHidden ||
      row.outlineLevel ||
      row.collapsed;
    if (!rowCells.length && !hasRowAttributes) {
      continue;
    }
    rows.push({
      index: r + 1,
      // Stored in Excel units to match the import's XLSXRow shape.
      height:
        row.size !== undefined && row.size !== DEFAULT_CELL_HEIGHT
          ? convertHeightToExcel(row.size)
          : undefined,
      customHeight: row.size !== undefined && row.size !== DEFAULT_CELL_HEIGHT ? true : undefined,
      hidden: row.isHidden || undefined,
      outlineLevel: row.outlineLevel,
      collapsed: row.collapsed,
      cells: rowCells,
    });
  }
  return rows;
}
