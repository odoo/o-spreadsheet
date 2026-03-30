import { isZoneValid } from "../../helpers/zones";
import { CommandResult, CoreCommand } from "../../types/commands";
import { PivotCoreDefinition } from "../../types/pivot";
import { CorePlugin } from "../core_plugin";

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
