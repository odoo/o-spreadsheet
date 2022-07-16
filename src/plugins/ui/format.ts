import { DATETIME_FORMAT } from "../../constants";
import { changeDecimalPlaces, createDefaultFormat } from "../../helpers";
import { Mode } from "../../model";
import { CellValueType, Command, Format, SetDecimalStep, UID, Zone } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class FormatPlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_DECIMAL":
        this.setDecimal(cmd.sheetId, cmd.target, cmd.step);
        break;
    }
  }

  /**
   * This function allows to adjust the quantity of decimal places after a decimal
   * point on cells containing number value. It does this by changing the cells
   * format. Values aren't modified.
   *
   * The change of the decimal quantity is done one by one, the sign of the step
   * variable indicates whether we are increasing or decreasing.
   *
   * If several cells are in the zone, the format resulting from the change of the
   * first cell (with number type) will be applied to the whole zone.
   */
  private setDecimal(sheetId: UID, zones: Zone[], step: SetDecimalStep) {
    // Find the first cell with a number value and get the format
    const numberFormat = this.searchNumberFormat(sheetId, zones);
    if (numberFormat !== undefined) {
      // Depending on the step sign, increase or decrease the decimal representation
      // of the format
      const newFormat = changeDecimalPlaces(numberFormat, step);
      // Apply the new format on the whole zone
      this.dispatch("SET_FORMATTING", {
        sheetId,
        target: zones,
        format: newFormat,
      });
    }
  }

  /**
   * Take a range of cells and return the format of the first cell containing a
   * number value. Returns a default format if the cell hasn't format. Returns
   * undefined if no number value in the range.
   */
  private searchNumberFormat(sheetId: UID, zones: Zone[]): Format | undefined {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = this.getters.getCell(sheetId, col, row);
          if (
            cell?.evaluated.type === CellValueType.number &&
            !cell.evaluated.format?.match(DATETIME_FORMAT) // reject dates
          ) {
            return cell.evaluated.format || createDefaultFormat(cell.evaluated.value);
          }
        }
      }
    }
    return undefined;
  }
}
