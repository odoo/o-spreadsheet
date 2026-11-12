import { boundUnboundedZone, isZoneValid } from "../../helpers/zones";
import { AddPivotCommand, CommandResult, UpdatePivotCommand } from "../../types/commands";
import { PivotCoreDefinition } from "../../types/pivot";
import { CorePlugin } from "../core_plugin";
import { SheetPlugin } from "./sheet";

export class SpreadsheetPivotCorePlugin extends CorePlugin<typeof SpreadsheetPivotCorePlugin> {
  static readonly dependencies = [SheetPlugin] as const;
  static readonly getters = [] as const;
  validators = {
    ADD_PIVOT: this.checkPivotDataSetValidity,
    UPDATE_PIVOT: this.checkPivotDataSetValidity,
  };

  private checkPivotDataSetValidity(cmd: AddPivotCommand | UpdatePivotCommand) {
    return this.checkDataSetValidity(cmd.pivot);
  }

  private checkDataSetValidity(definition: PivotCoreDefinition) {
    if (definition.type === "SPREADSHEET" && definition.dataSet) {
      const { zone, sheetId } = definition.dataSet;
      if (!sheetId || !this.getters.tryGetSheet(sheetId) || !zone || !isZoneValid(zone)) {
        return CommandResult.InvalidDataSet;
      }
      const boundedZone = boundUnboundedZone(zone, this.getters.getSheetSize(sheetId));
      return this.getters.checkZonesExistInSheet(sheetId, [boundedZone]);
    }
    return CommandResult.Success;
  }
}
