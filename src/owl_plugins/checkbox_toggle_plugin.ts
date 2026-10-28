import { computed } from "@odoo/owl";
import { Command } from "../types/commands";
import { UID, Zone } from "../types/misc";
import { OwlPluginWithModel } from "./owl_plugin_with_model";

export class CheckboxTogglePlugin extends OwlPluginWithModel {
  selectedZonesContainsBooleanValidation = computed(() => {
    const selectedZones = this.model().getters.getSelectedZones();
    const sheetId = this.model().getters.getActiveSheetId();
    for (const zone of selectedZones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          if (this.model().getters.isCellValidCheckbox({ col, row, sheetId })) {
            return true;
          }
        }
      }
    }
    return false;
  });

  handle(cmd: Command) {
    switch (cmd.type) {
      case "TOGGLE_CHECKBOX":
        this.toggleCheckbox(cmd.sheetId, cmd.target);
        break;
    }
  }

  private toggleCheckbox(sheetId: UID, target: Zone[]) {
    for (const zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const position = { col, row, sheetId };
          if (this.model().getters.isCellValidCheckbox(position)) {
            const content = this.model().getters.getEvaluatedCell(position).value
              ? "FALSE"
              : "TRUE";
            this.model().dispatch("UPDATE_CELL", {
              ...position,
              content,
            });
          }
        }
      }
    }
  }
}
