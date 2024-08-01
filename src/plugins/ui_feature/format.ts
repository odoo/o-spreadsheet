import {
  changeDecimalPlaces,
  createDefaultFormat,
  isDateTimeFormat,
  positions,
  positionToZone,
  recomputeZones,
} from "../../helpers";
import {
  CellPosition,
  CellValueType,
  Command,
  Format,
  Position,
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
      case "SET_FORMATTING_WITH_PIVOT": {
        this.setContextualFormat(cmd.sheetId, cmd.target, cmd.format);
        break;
      }
    }
  }

  private setContextualFormat(sheetId: UID, zones: Zone[], format: Format) {
    const measurePositions: CellPosition[] = [];
    const measuresByPivotId: Record<string, Set<string>> = {};
    for (const zone of recomputeZones(zones)) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const position = { sheetId, col, row };
          const pivotCell = this.getters.getPivotCellFromPosition(position);
          if (pivotCell.type === "VALUE") {
            measurePositions.push(position);
            const pivotId = this.getters.getPivotIdFromPosition(position) || "";
            measuresByPivotId[pivotId] ??= new Set();
            measuresByPivotId[pivotId].add(pivotCell.measure);
          }
        }
      }
    }
    const measureZones = recomputeZones(measurePositions.map(positionToZone));
    for (const pivotId in measuresByPivotId) {
      const measures = measuresByPivotId[pivotId];
      const pivotDefinition = this.getters.getPivotCoreDefinition(pivotId);
      this.dispatch("UPDATE_PIVOT", {
        pivotId,
        pivot: {
          ...pivotDefinition,
          measures: pivotDefinition.measures.map((measure) => {
            if (measures.has(measure.id)) {
              return { ...measure, format };
            }
            return measure;
          }),
        },
      });
    }
    this.dispatch("SET_FORMATTING", {
      sheetId,
      target: measureZones,
      format: "",
    });
    this.dispatch("SET_FORMATTING", {
      sheetId,
      target: recomputeZones(zones, measureZones),
      format,
    });
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
    const positionsByFormat: Record<Format, Position[]> = {};
    // Find the each cell with a number value and get the format
    for (const zone of recomputeZones(zones)) {
      for (const position of positions(zone)) {
        const numberFormat = this.getCellNumberFormat({ sheetId, ...position });
        if (numberFormat !== undefined) {
          // Depending on the step sign, increase or decrease the decimal representation
          // of the format
          const newFormat = changeDecimalPlaces(numberFormat, step);
          positionsByFormat[newFormat] = positionsByFormat[newFormat] || [];
          positionsByFormat[newFormat].push(position);
        }
      }
    }
    // consolidate all positions with the same format in bigger zones
    for (const newFormat in positionsByFormat) {
      const zones = recomputeZones(
        positionsByFormat[newFormat].map((position) => positionToZone(position))
      );
      this.setContextualFormat(sheetId, zones, newFormat);
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
