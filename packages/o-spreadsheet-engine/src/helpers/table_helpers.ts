import { generateMatrix } from "../functions/helpers";
import { Border, BorderDescr, CellPosition, Style, UID, Zone } from "../types/misc";
import { Range } from "../types/range";
import {
  ComputedTableStyle,
  CoreTable,
  Filter,
  StaticTable,
  Table,
  TableConfig,
  TableMetaData,
  TableStyle,
} from "../types/table";

type TableElement = keyof Omit<
  TableStyle,
  "category" | "displayName" | "templateName" | "primaryColor"
>;
const TABLE_ELEMENTS_BY_PRIORITY: TableElement[] = [
  "wholeTable",
  "firstColumnStripe",
  "secondColumnStripe",
  "firstRowStripe",
  "secondRowStripe",
  "firstColumn",
  "lastColumn",
  "headerRow",
  "measureHeader",
  "firstAlternatingSubHeaderRow",
  "secondAlternatingSubHeaderRow",
  "mainSubHeaderRow",
  "totalRow",
];

/** Return the content zone of the table, ie. the table zone without the headers */
export function getTableContentZone(tableZone: Zone, tableConfig: TableConfig): Zone | undefined {
  const numberOfHeaders = tableConfig.numberOfHeaders;
  const contentZone = { ...tableZone, top: tableZone.top + numberOfHeaders };
  return contentZone.top <= contentZone.bottom ? contentZone : undefined;
}

export function getTableTopLeft(table: Table | CoreTable): CellPosition {
  const range = table.range;
  return { row: range.zone.top, col: range.zone.left, sheetId: range.sheetId };
}

export function createFilter(
  id: UID,
  range: Range,
  config: TableConfig,
  createRange: (sheetId: UID, zone: Zone) => Range
): Filter {
  const zone = range.zone;
  if (zone.left !== zone.right) {
    throw new Error("Can only define a filter on a single column");
  }
  const filteredZone = { ...zone, top: zone.top + config.numberOfHeaders };
  const filteredRange = createRange(range.sheetId, filteredZone);
  return {
    id,
    rangeWithHeaders: range,
    col: zone.left,
    filteredRange: filteredZone.top > filteredZone.bottom ? undefined : filteredRange,
  };
}

export function isStaticTable(table: CoreTable): table is StaticTable {
  return table.type === "static" || table.type === "forceStatic";
}

export function getComputedTableStyle(
  tableConfig: TableConfig,
  style: TableStyle,
  tableMetaData: TableMetaData
): ComputedTableStyle {
  return {
    borders: getAllTableBorders(tableConfig, style, tableMetaData),
    styles: getAllTableStyles(tableConfig, style, tableMetaData),
  };
}

function getAllTableBorders(
  tableConfig: TableConfig,
  style: TableStyle,
  tableMetaData: TableMetaData
): Border[][] {
  const { numberOfCols: nOfCols, numberOfRows: nOfRows } = tableMetaData;
  const borders: Border[][] = generateMatrix(nOfCols, nOfRows, () => ({}));

  for (const tableElement of TABLE_ELEMENTS_BY_PRIORITY) {
    const styleBorder = style[tableElement]?.border;
    if (!styleBorder) {
      continue;
    }

    const zones = getTableElementZones(tableElement, tableConfig, tableMetaData);
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          // Special case: we don't want borders inside the headers rows
          const noInsideBorder =
            tableElement === "wholeTable" && row <= tableConfig.numberOfHeaders - 1;
          if (row === zone.top && styleBorder?.top !== undefined) {
            setBorderDescr(borders, "top", styleBorder.top, col, row, nOfCols, nOfRows);
          } else if (row !== zone.top && !noInsideBorder && styleBorder?.horizontal !== undefined) {
            setBorderDescr(borders, "top", styleBorder.horizontal, col, row, nOfCols, nOfRows);
          }

          if (row === zone.bottom && styleBorder?.bottom !== undefined) {
            setBorderDescr(borders, "bottom", styleBorder.bottom, col, row, nOfCols, nOfRows);
          }

          if (col === zone.left && styleBorder?.left !== undefined) {
            setBorderDescr(borders, "left", styleBorder.left, col, row, nOfCols, nOfRows);
          }

          if (col === zone.right && styleBorder?.right !== undefined) {
            setBorderDescr(borders, "right", styleBorder.right, col, row, nOfCols, nOfRows);
          } else if (col !== zone.right && !noInsideBorder && styleBorder?.vertical !== undefined) {
            setBorderDescr(borders, "right", styleBorder.vertical, col, row, nOfCols, nOfRows);
          }
        }
      }
    }
  }

  return borders;
}

/**
 * Set the border description for a given border direction (top, bottom, left, right) in the computedBorders array.
 * Also set the corresponding borders of adjacent cells (eg. if the border is set on the top of a cell, the bottom
 * border of the cell above is set).
 */
function setBorderDescr(
  computedBorders: Border[][],
  dir: "top" | "bottom" | "left" | "right",
  borderDescr: BorderDescr | null,
  col: number,
  row: number,
  numberOfCols: number,
  numberOfRows: number
) {
  switch (dir) {
    case "top":
      computedBorders[col][row].top = borderDescr ?? undefined;
      if (row !== 0) {
        computedBorders[col][row - 1].bottom = borderDescr ?? undefined;
      }
      return;
    case "bottom":
      computedBorders[col][row].bottom = borderDescr ?? undefined;
      if (row !== numberOfRows - 1) {
        computedBorders[col][row + 1].top = borderDescr ?? undefined;
      }
      return;
    case "left":
      computedBorders[col][row].left = borderDescr ?? undefined;
      if (col !== 0) {
        computedBorders[col - 1][row].right = borderDescr ?? undefined;
      }
      return;
    case "right":
      computedBorders[col][row].right = borderDescr ?? undefined;
      if (col !== numberOfCols - 1) {
        computedBorders[col + 1][row].left = borderDescr ?? undefined;
      }
      return;
  }
}

function getAllTableStyles(
  tableConfig: TableConfig,
  style: TableStyle,
  tableMetaData: TableMetaData
): Style[][] {
  const { numberOfCols, numberOfRows } = tableMetaData;
  const styles: Style[][] = generateMatrix(numberOfCols, numberOfRows, () => ({}));

  for (const tableElement of TABLE_ELEMENTS_BY_PRIORITY) {
    const tableElStyle = style[tableElement];

    if (!tableElStyle) {
      continue;
    }

    const zones = getTableElementZones(tableElement, tableConfig, tableMetaData);
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          if (!styles[col][row]) {
            styles[col][row] = {};
          }

          styles[col][row] = {
            ...styles[col][row],
            ...tableElStyle?.style,
          };
        }
      }
    }
  }

  return styles;
}

function getTableElementZones(
  el: TableElement,
  tableConfig: TableConfig,
  tableMetaData: TableMetaData
): Zone[] {
  const { numberOfCols, numberOfRows } = tableMetaData;
  const zones: Zone[] = [];

  const headerRows = Math.min(tableConfig.numberOfHeaders, numberOfRows);
  const totalRows = tableConfig.totalRow ? 1 : 0;
  const lastCol = numberOfCols - 1;
  const lastRow = numberOfRows - 1;
  switch (el) {
    case "wholeTable":
      zones.push({ top: 0, left: 0, bottom: lastRow, right: lastCol });
      break;
    case "firstColumn":
      if (!tableConfig.firstColumn) {
        break;
      }
      zones.push({ top: 0, left: 0, bottom: lastRow, right: 0 });
      break;
    case "lastColumn":
      if (!tableConfig.lastColumn) {
        break;
      }
      zones.push({ top: 0, left: lastCol, bottom: lastRow, right: lastCol });
      break;
    case "headerRow":
      if (!tableConfig.numberOfHeaders) {
        break;
      }
      zones.push({ top: 0, left: 0, bottom: headerRows - 1, right: lastCol });
      break;
    case "totalRow":
      if (!tableConfig.totalRow) {
        break;
      }
      zones.push({ top: lastRow, left: 0, bottom: lastRow, right: lastCol });
      break;
    case "firstRowStripe":
      if (!tableConfig.bandedRows) {
        break;
      }
      for (let i = headerRows; i < numberOfRows - totalRows; i += 2) {
        zones.push({ top: i, left: 0, bottom: i, right: lastCol });
      }
      break;
    case "secondRowStripe":
      if (!tableConfig.bandedRows) {
        break;
      }
      for (let i = headerRows + 1; i < numberOfRows - totalRows; i += 2) {
        zones.push({ top: i, left: 0, bottom: i, right: lastCol });
      }
      break;
    case "firstColumnStripe": {
      if (!tableConfig.bandedColumns) {
        break;
      }
      const bottom = tableMetaData.mode === "pivot" ? lastRow : lastRow - totalRows;
      for (let i = 0; i < numberOfCols; i += 2) {
        zones.push({ top: headerRows, left: i, bottom, right: i });
      }
      break;
    }
    case "secondColumnStripe": {
      if (!tableConfig.bandedColumns) {
        break;
      }
      const bottom = tableMetaData.mode === "pivot" ? lastRow : lastRow - totalRows;
      for (let i = 1; i < numberOfCols; i += 2) {
        zones.push({ top: headerRows, left: i, bottom, right: i });
      }
      break;
    }
    case "mainSubHeaderRow":
      for (const row of tableMetaData.mainSubHeaderRows || []) {
        zones.push({ top: row, bottom: row, left: 0, right: tableMetaData.numberOfCols - 1 });
      }
      break;
    case "firstAlternatingSubHeaderRow":
      for (const row of tableMetaData.firstAlternatingSubHeaderRows || []) {
        zones.push({ top: row, bottom: row, left: 0, right: tableMetaData.numberOfCols - 1 });
      }
      break;
    case "secondAlternatingSubHeaderRow":
      for (const row of tableMetaData.secondAlternatingSubHeaderRows || []) {
        zones.push({ top: row, bottom: row, left: 0, right: tableMetaData.numberOfCols - 1 });
      }
      break;
    case "measureHeader":
      if (tableMetaData.measureRow !== undefined && tableMetaData.numberOfCols > 1) {
        const row = tableMetaData.measureRow;
        zones.push({ top: row, bottom: row, left: 1, right: tableMetaData.numberOfCols - 1 });
      }
      break;
  }

  return zones;
}
