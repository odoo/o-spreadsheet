import { isBoolean } from "../../helpers/misc";
import { getCellPositionsInRanges } from "../../helpers/range";
import { CellValueType } from "../../types/cells";
import { Command } from "../../types/commands";
import { isMatrix } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class DataValidationInsertionPlugin extends UIPlugin {
  handle(cmd: Command) {
    switch (cmd.type) {
      case "ADD_DATA_VALIDATION_RULE":
        if (cmd.rule.criterion.type === "isBoolean") {
          const ranges = cmd.ranges.map((range) => this.getters.getRangeFromRangeData(range));
          for (const position of getCellPositionsInRanges(ranges)) {
            const cell = this.getters.getCell(position);
            const evaluatedCell = this.getters.getEvaluatedCell(position);

            if (!cell?.isFormula && !cell?.content) {
              this.dispatch("UPDATE_CELL", { ...position, content: "FALSE" });
              // In this case, a cell has been updated in the core plugin but
              // not yet evaluated. This can occur after a paste operation.
            } else if (
              (cell?.isFormula || cell?.content) &&
              evaluatedCell.type === CellValueType.empty
            ) {
              let value: string | undefined;
              if (cell.isFormula) {
                const result = this.getters.evaluateCompiledFormula(
                  position.sheetId,
                  cell.compiledFormula
                );
                value = (isMatrix(result) ? result[0][0] : result)?.toString();
              } else {
                value = cell.content;
              }
              if (!value || !isBoolean(value)) {
                this.dispatch("UPDATE_CELL", { ...position, content: "FALSE" });
              }
            } else if (evaluatedCell.type !== CellValueType.boolean) {
              this.dispatch("UPDATE_CELL", { ...position, content: "FALSE" });
            }
          }
        }
    }
  }
}
