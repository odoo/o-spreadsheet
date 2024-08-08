import { overlap, recomputeZones, toXC, toZone } from "../../helpers";
import { _t } from "../../translation";
import {
  Command,
  CommandResult,
  RangeData,
  Zone,
  isBaseDependant,
  isHeadersDependant,
  isPositionDependent,
  isRangeDependant,
  isSheetDependent,
  isTargetDependent,
  isZoneDependent,
} from "../../types";
import { UIPlugin } from "../ui_plugin";

export class UICellProtectionPlugin extends UIPlugin {
  static getters = [] as const;

  allowDispatch(cmd: Command): CommandResult {
    if (this.hasOverlappingProtectionRules(cmd)) {
      this.ui.raiseBlockingErrorUI(
        _t(
          "You are trying to edit a protected cell. Please contact the spreadsheet owner to remove the protection if you need to edit."
        )
      );
      return CommandResult.CellIsProtected;
    }
    return CommandResult.Success;
  }

  private hasOverlappingProtectionRules(cmd: Command): Boolean {
    if (["START", "ADD_CELL_PROTECTION_RULE", "REMOVE_CELL_PROTECTION_RULE"].includes(cmd.type)) {
      return false;
    }

    const sheetId = "sheetId" in cmd ? cmd.sheetId : this.getters.getActiveSheetId();
    const rules = this.getters.getCellProtectionRules(sheetId);
    const protectedZones = rules.flatMap((rule) => rule.ranges.map((range) => range.zone));

    const isZoneProtected = (zonesToCheck: Zone[]): boolean => {
      return zonesToCheck.some((zone) =>
        protectedZones.some((protectedZone) => overlap(zone, protectedZone))
      );
    };

    if (isSheetDependent(cmd)) {
      if (cmd.type === "DELETE_SHEET") {
        const sheetsWithProtectedRanges = rules.flatMap((rule) =>
          rule.ranges.map((range) => range.sheetId)
        );
        if (sheetsWithProtectedRanges.includes(cmd.sheetId)) {
          return true;
        }
      }
    }

    if (isBaseDependant(cmd)) {
      const isBefore = cmd.position === "before";
      for (const zone of protectedZones) {
        if (cmd.dimension === "COL") {
          if ((isBefore && cmd.base <= zone.right) || (!isBefore && cmd.base < zone.right)) {
            return true;
          }
        } else {
          if ((isBefore && cmd.base <= zone.bottom) || (!isBefore && cmd.base < zone.bottom)) {
            return true;
          }
        }
      }
    }

    if (isHeadersDependant(cmd)) {
      if (cmd.dimension === "COL") {
        for (const el of cmd.elements) {
          return protectedZones.some(
            (protectedZone) => el <= protectedZone.right && el >= protectedZone.left
          );
        }
      } else {
        for (const el of cmd.elements) {
          return protectedZones.some(
            (protectedZone) => el >= protectedZone.top && el <= protectedZone.bottom
          );
        }
      }
    }

    if (isTargetDependent(cmd)) {
      return isZoneProtected(recomputeZones(cmd.target));
    }

    if (isPositionDependent(cmd)) {
      const zoneToCheck = toZone(toXC(cmd.col, cmd.row));
      return isZoneProtected([zoneToCheck]);
    }

    if (isRangeDependant(cmd)) {
      const ranges = cmd.ranges as RangeData[];
      const zonesToCheck = ranges.map((range) => range._zone as Zone);
      return isZoneProtected(zonesToCheck);
    }

    if (isZoneDependent(cmd)) {
      console.log(cmd.zone);
    }
    return false;
  }
}
