import { UID, Zone } from "@odoo/o-spreadsheet-engine";
import { Command } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class CheckboxTogglePlugin extends UIPlugin {
  static getters = ["hasBooleanValidationInZones"] as const;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "TOGGLE_CHECKBOX":
        this.toggleCheckbox(cmd.sheetId, cmd.target);
        break;
    }
  }

  hasBooleanValidationInZones(zones: Zone[]) {
    const sheetId = this.getters.getActiveSheetId();
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          if (this.getters.isCellValidCheckbox({ col, row, sheetId })) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private toggleCheckbox(sheetId: UID, target: Zone[]) {
    for (const zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const position = { col, row, sheetId };
          if (this.getters.isCellValidCheckbox(position)) {
            const content = this.getters.getEvaluatedCell(position).value ? "FALSE" : "TRUE";
            this.dispatch("UPDATE_CELL", {
              ...position,
              content,
            });
          }
        }
      }
    }
  }
}
