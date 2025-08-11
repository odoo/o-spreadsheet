import { isZoneValid } from "../../helpers";
import {
  ApplyRangeChange,
  CommandResult,
  CoreCommand,
  PivotCoreDefinition,
  Range,
} from "../../types";
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
  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_PIVOT":
      case "UPDATE_PIVOT":
        const definition = cmd.pivot;
        return this.checkDataSetValidity(definition);
    }
    return CommandResult.Success;
  }

  adaptRanges(applyChange: ApplyRangeChange) {
    for (const pivotId of this.getters.getPivotIds()) {
      const definition = this.getters.getPivotCoreDefinition(pivotId);
      if (definition.type !== "SPREADSHEET") {
        continue;
      }
      if (definition.dataSet) {
        const { sheetId, zone } = definition.dataSet;
        if (!this.getters.tryGetSheet(sheetId) || !zone || !isZoneValid(zone)) {
          this.dispatch("UPDATE_PIVOT", { pivotId, pivot: { ...definition, dataSet: undefined } });
          return;
        }
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

  private checkDataSetValidity(definition: PivotCoreDefinition) {
    if (definition.type === "SPREADSHEET" && definition.dataSet) {
      const { zone, sheetId } = definition.dataSet;
      if (!sheetId || !this.getters.tryGetSheet(sheetId) || !zone || !isZoneValid(zone)) {
        return CommandResult.InvalidDataSet;
      }
      return this.getters.checkZonesExistInSheet(sheetId, [zone]);
    }
    return CommandResult.Success;
  }
}
