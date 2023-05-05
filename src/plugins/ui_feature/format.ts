import {
  changeDecimalPlaces,
  createDefaultFormat,
  isDateTimeFormat,
  positions,
  positionToZone,
} from "../../helpers";
import {
  CellPosition,
  CellValueType,
  Command,
  Format,
  SetDecimalStep,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class FormatPlugin extends UIPlugin {
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
   * If several cells are in the zone, each cell's format will be individually
   * evaluated and updated with the number type.
   */
  private setDecimal(sheetId: UID, zones: Zone[], step: SetDecimalStep) {
    // Find the each cell with a number value and get the format
    for (const zone of zones) {
      for (const position of positions(zone)) {
        const numberFormat = this.getCellNumberFormat({ sheetId, ...position });
        if (numberFormat !== undefined) {
          // Depending on the step sign, increase or decrease the decimal representation
          // of the format
          const locale = this.getters.getLocale();
          const newFormat = changeDecimalPlaces(numberFormat, step, locale);
          // Apply the new format on the whole zone
          this.dispatch("SET_FORMATTING", {
            sheetId,
            target: [positionToZone(position)],
            format: newFormat,
          });
        }
      }
    }
  }

  /**
   * Take a range of cells and return the format of the first cell containing a
   * number value. Returns a default format if the cell hasn't format. Returns
   * undefined if no number value in the range.
   */
  private getCellNumberFormat(position: CellPosition): Format | undefined {
    for (const pos of [position]) {
      const cell = this.getters.getEvaluatedCell(pos);
      if (
        cell.type === CellValueType.number &&
        !(cell.format && isDateTimeFormat(cell.format)) // reject dates
      ) {
        return cell.format || createDefaultFormat(cell.value);
      }
    }
    return undefined;
  }
}
