import { ApplyRangeChange, Range } from "../../types";
import { CorePlugin } from "../core_plugin";

function adaptPivotRange(
  range: Range | undefined,
  applyChange: ApplyRangeChange
): Range | undefined {
  if (!range) {
    return undefined;
  }
  const change = applyChange(range);
  switch (change.changeType) {
    case "NONE":
      return range;
    case "REMOVE":
      return undefined;
    default:
      return change.range;
  }
}

export class SpreadsheetPivotCorePlugin extends CorePlugin {
  adaptRanges(applyChange: ApplyRangeChange) {
    for (const pivotId of this.getters.getPivotIds()) {
      const definition = this.getters.getPivotCoreDefinition(pivotId);
      if (definition.type !== "SPREADSHEET") {
        continue;
      }
      if (definition.dataSet) {
        const { sheetId, zone } = definition.dataSet;
        const range = this.getters.getRangeFromZone(sheetId, zone);
        const adaptedRange = adaptPivotRange(range, applyChange);

        const dataSet = adaptedRange && {
          sheetId: adaptedRange.sheetId,
          zone: adaptedRange.zone,
        };
        this.dispatch("UPDATE_PIVOT", { pivotId, pivot: { ...definition, dataSet } });
      }
    }
  }
}
