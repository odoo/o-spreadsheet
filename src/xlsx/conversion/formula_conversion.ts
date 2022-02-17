import { cellReference, toCartesian, toXC } from "../../helpers";
import { RangePart } from "../../types";
import { XLSXImportData, XLSXSharedFormula, XLSXWorksheet } from "../../types/xlsx";
import { SUBTOTAL_FUNCTION_CONVERSION_MAP } from "./conversion_maps";

type SharedFormulasMap = Record<number, XLSXSharedFormula>;

/**
 * Match external reference (ex. '[1]Sheet 3'!$B$4)
 *
 * First match group is the external reference id
 * Second match group is the sheet id
 * Third match group is the reference of the cell
 */
const externalReferenceRegex = new RegExp(/'?\[([0-9]*)\](.*)'?!(\$?[a-zA-Z]*\$?[0-9]*)/g);

const subtotalRegex = new RegExp(/SUBTOTAL\(([0-9]*),/g);
const cellRegex = new RegExp(cellReference.source, "ig");

export function convertFormulasContent(sheet: XLSXWorksheet, data: XLSXImportData) {
  const sfMap = getSharedFormulasMap(sheet);

  for (let cell of sheet.rows.map((row) => row.cells).flat()) {
    if (cell?.formula) {
      cell.formula.content =
        cell.formula.sharedIndex !== undefined && !cell.formula.content
          ? "=" + adaptFormula(cell.xc, sfMap[cell.formula.sharedIndex])
          : "=" + cell.formula.content;
      cell.formula.content = convertFormula(cell.formula.content, data);
    }
  }
}

function getSharedFormulasMap(sheet: XLSXWorksheet): SharedFormulasMap {
  const formulas: SharedFormulasMap = {};
  for (let row of sheet.rows) {
    for (let cell of row.cells) {
      if (cell.formula && cell.formula.sharedIndex !== undefined && cell.formula.content) {
        formulas[cell.formula.sharedIndex] = { refCellXc: cell.xc, formula: cell.formula.content };
      }
    }
  }
  return formulas;
}

/**
 * Convert an XLSX formula into something we can evaluate.
 * - remove _xlfn. flags before function names
 * - convert the SUBTOTAL(index, formula) function to the function given by its index
 * - change #REF! into #REF
 * - convert external references into their value
 */
function convertFormula(formula: string, data: XLSXImportData): string {
  formula = formula.replace("_xlfn.", "");

  formula = formula.replace(/#REF!/g, "#REF");

  // SUBOTOTAL function, eg. =SUBTOTAL(3, {formula})
  formula = formula.replace(subtotalRegex, (match, functionId) => {
    const convertedFunction = SUBTOTAL_FUNCTION_CONVERSION_MAP[functionId];
    return convertedFunction ? convertedFunction + "(" : match;
  });

  // External references, eg. ='[1]Sheet 3'!$B$4
  formula = formula.replace(externalReferenceRegex, (match, externalRefId, sheetName, cellRef) => {
    externalRefId = Number(externalRefId) - 1;
    cellRef = cellRef.replace(/\$/g, "");

    const sheetIndex = data.externalBooks[externalRefId].sheetNames.findIndex(
      (name) => name === sheetName
    );
    if (sheetIndex === -1) {
      return match;
    }

    const externalDataset = data.externalBooks[externalRefId].datasets.find(
      (dataset) => dataset.sheetId === sheetIndex
    )?.data;
    if (!externalDataset) {
      return match;
    }

    const datasetValue = externalDataset && externalDataset[cellRef];
    const convertedValue = Number(datasetValue) ? datasetValue : `"${datasetValue}"`;
    return convertedValue || match;
  });

  return formula;
}

/**
 * Transform a shared formula for the given target.
 *
 * This will compute the offset between the original cell of the shared formula and the target cell,
 * then apply this offset to all the ranges in the formula (taking fixed references into account)
 */
export function adaptFormula(targetCell: string, sf: XLSXSharedFormula) {
  const refPosition = toCartesian(sf.refCellXc);
  let newFormula = sf.formula.slice();

  let match: RegExpExecArray | null;
  do {
    match = cellRegex.exec(newFormula);
    if (match) {
      const formulaPosition = toCartesian(match[0].replace("$", ""));
      const targetPosition = toCartesian(targetCell);
      const rangePart: RangePart = {
        colFixed: match[0].startsWith("$"),
        rowFixed: match[0].includes("$", 1),
      };
      const offset = {
        col: targetPosition.col - refPosition.col,
        row: targetPosition.row - refPosition.row,
      };
      const offsettedPosition = {
        col: rangePart.colFixed ? formulaPosition.col : formulaPosition.col + offset.col,
        row: rangePart.rowFixed ? formulaPosition.row : formulaPosition.row + offset.row,
      };
      newFormula =
        newFormula.slice(0, match.index) +
        toXC(offsettedPosition.col, offsettedPosition.row, rangePart) +
        newFormula.slice(match.index + match[0].length);
    }
  } while (match);

  return newFormula;
}
