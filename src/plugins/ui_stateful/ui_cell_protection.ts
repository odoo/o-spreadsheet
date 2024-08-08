import { CellProtectionTerms } from "../../components/translations_terms";
import { overlap, recomputeZones, toXC, toZone } from "../../helpers";
import { Command, CommandResult, UID, Zone } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class UICellProtectionPlugin extends UIPlugin {
  static getters = [] as const;

  allowDispatch(cmd: Command): CommandResult {
    if (this.hasOverlappingProtectionRules(cmd)) {
      this.ui.raiseBlockingErrorUI(CellProtectionTerms["Errors"][CommandResult.CellIsProtected]);
      return CommandResult.CellIsProtected;
    }
    return CommandResult.Success;
  }

  private hasOverlappingProtectionRules(cmd: Command): Boolean {
    switch (cmd.type) {
      case "UPDATE_CELL":
        return this.zoneIsProtected(cmd.sheetId, [toZone(toXC(cmd.col, cmd.row))]);
      case "PASTE":
      case "REPEAT_PASTE":
      case "PASTE_FROM_OS_CLIPBOARD":
        return this.zoneIsProtected(this.getters.getActiveSheetId(), recomputeZones(cmd.target));
      case "REQUEST_REDO":
        console.log(cmd);
        break;
    }
    return false;
  }

  private zoneIsProtected(sheetId: UID, zonesToCheck: Zone[]): Boolean {
    const protectedZones = this.getters.getProtectedZones(sheetId);

    if (protectedZones.length === 0) {
      return false;
    }

    return zonesToCheck.some((zone) =>
      protectedZones.some((protectedZone) => overlap(zone, protectedZone))
    );
  }
}
