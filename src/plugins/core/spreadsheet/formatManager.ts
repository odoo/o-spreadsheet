import { parseDateTime } from "../../../functions/dates";
import { CellType } from "../../../types";
import { CellContent, CellFormulaContent } from "../../../types/spreadsheet_core";
import { Manager } from "./manager";

export class FormatManager extends Manager<string> {
  getDefaultFormat(content: CellContent) {
    switch (content.type) {
      case CellType.formula:
        return this.computeFormulaFormat(content);
      case CellType.number:
        if (content.text.includes("%")) {
          return content.text.includes(".") ? "0.00%" : "0%";
        }
        const internalDate = parseDateTime(content.text);
        if (internalDate) {
          return internalDate.format;
        }
      //Miss date format
    }
    return "";
  }

  NULL_FORMAT = "";

  private computeFormulaFormat(cell: CellFormulaContent): string {
    const dependenciesFormat = cell.formula.compiledFormula.dependenciesFormat;
    const dependencies = cell.dependencies;

    for (let dependencyFormat of dependenciesFormat) {
      switch (typeof dependencyFormat) {
        case "string":
          // dependencyFormat corresponds to a literal format which can be applied
          // directly.
          return dependencyFormat;
        case "number":
          // dependencyFormat corresponds to a dependency cell from which we must
          // find the cell and extract the associated format
          const ref = dependencies[dependencyFormat];
          const sheets = this.getters.getEvaluationSheets();
          const s = sheets[ref.sheetId];
          if (s) {
            // if the reference is a range --> the first cell in the range
            // determines the format
            const cellRef = s.rows[ref.zone.top]?.cells[ref.zone.left];
            if (cellRef && cellRef.format) {
              return cellRef.format;
            }
          }
          break;
      }
    }
    return this.NULL_FORMAT;
  }
}
