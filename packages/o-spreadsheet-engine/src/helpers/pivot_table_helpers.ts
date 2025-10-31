import { generateMatrix } from "../functions/helpers";
import { Border, BorderDescr, Style, Zone } from "../types/misc";
import { PivotTableStyle } from "../types/pivot";
import { ComputedTableStyle, TableConfig, TableStyle } from "../types/table";
import { getTableElementZones } from "./table_helpers";

type PivotTableElement = keyof Omit<
  PivotTableStyle,
  "category" | "displayName" | "templateName" | "primaryColor"
>;
const TABLE_ELEMENTS_BY_PRIORITY: PivotTableElement[] = [
  "wholeTable",
  "headerRow",
  "measureHeaderRow",
  "firstSubSubHeaderRow",
  "secondSubSubHeaderRow",
  "mainSubHeaderRow",
  "firstColumnStripe",
  "secondColumnStripe",
  "firstRowStripe",
  "secondRowStripe",
  "firstColumn",
  "lastColumn",
  "rowHeadersColumn",
  "totalRow",
];

export interface TableInfo {
  numberOfCols: number;
  numberOfRows: number;
  measureHeaderRowIndex?: number;
  mainSubHeaderRows: Set<number>;
  firstSubSubHeaderRows: Set<number>;
  secondSubSubHeaderRows: Set<number>;
}

export function getComputedPivotTableStyle(
  tableConfig: TableConfig,
  style: TableStyle,
  tableInfo: TableInfo
): ComputedTableStyle {
  return {
    borders: getAllPivotTableBorders(tableConfig, style, tableInfo),
    styles: getAllPivotTableStyles(tableConfig, style, tableInfo),
  };
}

function getAllPivotTableBorders(
  tableConfig: TableConfig,
  style: TableStyle,
  tableInfo: TableInfo
): Border[][] {
  const { numberOfCols: nOfCols, numberOfRows: nOfRows } = tableInfo;
  const borders: Border[][] = generateMatrix(nOfCols, nOfRows, () => ({}));

  for (const tableElement of TABLE_ELEMENTS_BY_PRIORITY) {
    const styleBorder = style[tableElement]?.border;
    if (!styleBorder) continue;

    const zones = getPivotTableElementZones(tableElement, tableConfig, tableInfo);
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          // Special case: we don't want borders inside the headers rows
          const noInsideBorder =
            tableElement === "wholeTable" && row <= tableConfig.numberOfHeaders - 1;
          if (row === zone.top && styleBorder?.top) {
            setBorderDescr(borders, "top", styleBorder.top, col, row, nOfCols, nOfRows);
          } else if (row !== zone.top && !noInsideBorder && styleBorder?.horizontal) {
            setBorderDescr(borders, "top", styleBorder.horizontal, col, row, nOfCols, nOfRows);
          }

          if (row === zone.bottom && styleBorder?.bottom) {
            setBorderDescr(borders, "bottom", styleBorder.bottom, col, row, nOfCols, nOfRows);
          }

          if (col === zone.left && styleBorder?.left) {
            setBorderDescr(borders, "left", styleBorder.left, col, row, nOfCols, nOfRows);
          }

          if (col === zone.right && styleBorder?.right) {
            setBorderDescr(borders, "right", styleBorder.right, col, row, nOfCols, nOfRows);
          } else if (col !== zone.right && !noInsideBorder && styleBorder?.vertical) {
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
  borderDescr: BorderDescr,
  col: number,
  row: number,
  numberOfCols: number,
  numberOfRows: number
) {
  switch (dir) {
    case "top":
      computedBorders[col][row].top = borderDescr;
      if (row !== 0) {
        computedBorders[col][row - 1].bottom = borderDescr;
      }
      return;
    case "bottom":
      computedBorders[col][row].bottom = borderDescr;
      if (row !== numberOfRows - 1) {
        computedBorders[col][row + 1].top = borderDescr;
      }
      return;
    case "left":
      computedBorders[col][row].left = borderDescr;
      if (col !== 0) {
        computedBorders[col - 1][row].right = borderDescr;
      }
      return;
    case "right":
      computedBorders[col][row].right = borderDescr;
      if (col !== numberOfCols - 1) {
        computedBorders[col + 1][row].left = borderDescr;
      }
      return;
  }
}

function getAllPivotTableStyles(
  tableConfig: TableConfig,
  style: TableStyle,
  tableInfo: TableInfo
): Style[][] {
  const { numberOfCols, numberOfRows } = tableInfo;
  const styles: Style[][] = generateMatrix(numberOfCols, numberOfRows, () => ({}));

  for (const tableElement of TABLE_ELEMENTS_BY_PRIORITY) {
    const tableElStyle = style[tableElement];

    if (!tableElStyle) {
      continue;
    }

    const zones = getPivotTableElementZones(tableElement, tableConfig, tableInfo);
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

function getPivotTableElementZones(
  el: PivotTableElement,
  tableConfig: TableConfig,
  tableInfo: TableInfo
): Zone[] {
  const zones: Zone[] = [];

  switch (el) {
    case "mainSubHeaderRow":
      for (const row of tableInfo.mainSubHeaderRows) {
        zones.push({ top: row, bottom: row, left: 0, right: tableInfo.numberOfCols - 1 });
      }
      break;
    case "firstSubSubHeaderRow":
      for (const row of tableInfo.firstSubSubHeaderRows) {
        zones.push({ top: row, bottom: row, left: 0, right: tableInfo.numberOfCols - 1 });
      }
      break;
    case "secondSubSubHeaderRow":
      for (const row of tableInfo.secondSubSubHeaderRows) {
        zones.push({ top: row, bottom: row, left: 0, right: tableInfo.numberOfCols - 1 });
      }
      break;
    case "measureHeaderRow":
      if (tableInfo.measureHeaderRowIndex && tableInfo.numberOfCols > 1) {
        const row = tableInfo.measureHeaderRowIndex;
        zones.push({ top: row, bottom: row, left: 1, right: tableInfo.numberOfCols - 1 });
      }
      break;
    case "rowHeadersColumn":
      break;
    default:
      return getTableElementZones(el, tableConfig, tableInfo.numberOfCols, tableInfo.numberOfRows);
  }

  return zones;
}
