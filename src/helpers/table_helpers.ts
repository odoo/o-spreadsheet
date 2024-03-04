import { generateMatrix } from "../functions/helpers";
import { Border, BorderDescr, Style, Zone } from "../types";
import { TableConfig, TableStyle } from "../types/table";
import { ComputedTableStyle } from "./../types/table";
import { TABLE_PRESETS } from "./table_presets";

type TableElement = keyof Omit<TableStyle, "category" | "colorName">;
const TABLE_ELEMENTS_BY_PRIORITY: TableElement[] = [
  "wholeTable",
  "firstColumnStripe",
  "secondColumnStripe",
  "firstRowStripe",
  "secondRowStripe",
  "firstColumn",
  "lastColumn",
  "headerRow",
  "totalRow",
];

/** Return the content zone of the table, ie. the table zone without the headers */
export function getTableContentZone(tableZone: Zone, tableConfig: TableConfig): Zone | undefined {
  const numberOfHeaders = tableConfig.numberOfHeaders;
  const contentZone = { ...tableZone, top: tableZone.top + numberOfHeaders };
  return contentZone.top <= contentZone.bottom ? contentZone : undefined;
}

export function getComputedTableStyle(
  tableConfig: TableConfig,
  numberOfCols: number,
  numberOfRows: number
): ComputedTableStyle {
  return {
    borders: getAllTableBorders(tableConfig, numberOfCols, numberOfRows),
    styles: getAllTableStyles(tableConfig, numberOfCols, numberOfRows),
  };
}

function getAllTableBorders(
  tableConfig: TableConfig,
  nOfCols: number,
  nOfRows: number
): Border[][] {
  const borders: Border[][] = generateMatrix(nOfCols, nOfRows, () => ({}));

  const style = TABLE_PRESETS[tableConfig.styleId];
  for (const tableElement of TABLE_ELEMENTS_BY_PRIORITY) {
    const styleBorder = style[tableElement]?.border;
    if (!styleBorder) continue;

    const zones = getTableElementZones(tableElement, tableConfig, nOfCols, nOfRows);
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

function getAllTableStyles(
  tableConfig: TableConfig,
  numberOfCols: number,
  numberOfRows: number
): Style[][] {
  const styles: Style[][] = generateMatrix(numberOfCols, numberOfRows, () => ({}));

  const style = TABLE_PRESETS[tableConfig.styleId];
  for (const tableElement of TABLE_ELEMENTS_BY_PRIORITY) {
    const tableElStyle = style[tableElement];
    const bold = isTableElementInBold(tableElement);

    if (!tableElStyle && !bold) {
      continue;
    }

    const zones = getTableElementZones(tableElement, tableConfig, numberOfCols, numberOfRows);
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
          if (bold) {
            styles[col][row].bold = true;
          }
        }
      }
    }
  }

  return styles;
}

function isTableElementInBold(tableElement: TableElement) {
  return (
    tableElement === "firstColumn" ||
    tableElement === "lastColumn" ||
    tableElement === "headerRow" ||
    tableElement === "totalRow"
  );
}

function getTableElementZones(
  el: TableElement,
  tableConfig: TableConfig,
  numberOfCols: number,
  numberOfRows: number
): Zone[] {
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
      if (!tableConfig.firstColumn) break;
      zones.push({ top: 0, left: 0, bottom: lastRow, right: 0 });
      break;
    case "lastColumn":
      if (!tableConfig.lastColumn) break;
      zones.push({ top: 0, left: lastCol, bottom: lastRow, right: lastCol });
      break;
    case "headerRow":
      if (!tableConfig.numberOfHeaders) break;
      zones.push({ top: 0, left: 0, bottom: headerRows - 1, right: lastCol });
      break;
    case "totalRow":
      if (!tableConfig.totalRow) break;
      zones.push({ top: lastRow, left: 0, bottom: lastRow, right: lastCol });
      break;
    case "firstRowStripe":
      if (!tableConfig.bandedRows) break;
      for (let i = headerRows; i < numberOfRows - totalRows; i += 2) {
        zones.push({ top: i, left: 0, bottom: i, right: lastCol });
      }
      break;
    case "secondRowStripe":
      if (!tableConfig.bandedRows) break;
      for (let i = headerRows + 1; i < numberOfRows - totalRows; i += 2) {
        zones.push({ top: i, left: 0, bottom: i, right: lastCol });
      }
      break;
    case "firstColumnStripe":
      if (!tableConfig.bandedColumns) break;
      for (let i = 0; i < numberOfCols; i += 2) {
        zones.push({ top: headerRows, left: i, bottom: lastRow - totalRows, right: i });
      }
      break;
    case "secondColumnStripe":
      if (!tableConfig.bandedColumns) break;
      for (let i = 1; i < numberOfCols; i += 2) {
        zones.push({ top: headerRows, left: i, bottom: lastRow - totalRows, right: i });
      }
      break;
  }

  return zones;
}

export function getTableStyleName(styleId: string, tableStyle: TableStyle): string {
  return tableStyle.colorName ? `${tableStyle.colorName}, ${styleId}` : styleId;
}
