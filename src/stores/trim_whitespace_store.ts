import { trimContent } from "../helpers/misc";
import { recomputeZones } from "../helpers/recompute_zones";
import { positions } from "../helpers/zones";
import { _t } from "../translation";
import { Command } from "../types/commands";
import { NotificationStore } from "./notification_store";
import { SpreadsheetStore } from "./spreadsheet_store";

export class TrimWhitespaceStore extends SpreadsheetStore {
  mutators = ["trimWhitespace"] as const;

  private notificationStore = this.get(NotificationStore);

  trimWhitespace() {
    // Command for history step
    this.model.dispatch("TRIM_WHITESPACE");
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "TRIM_WHITESPACE":
        this._trimWhitespace();
        break;
    }
  }

  private _trimWhitespace() {
    const zones = recomputeZones(this.getters.getSelectedZones());
    const sheetId = this.getters.getActiveSheetId();
    let count = 0;

    for (const { col, row } of zones.map(positions).flat()) {
      const cell = this.getters.getCell({ col, row, sheetId });
      if (!cell) {
        continue;
      }
      const currentContent = !cell.isFormula
        ? cell.content
        : cell.compiledFormula.toFormulaString(this.getters);
      const trimmedContent = trimContent(currentContent);
      if (trimmedContent !== currentContent) {
        count += 1;
        this.model.dispatch("UPDATE_CELL", {
          sheetId,
          col,
          row,
          content: trimmedContent,
        });
      }
    }

    const text = count
      ? _t("Trimmed whitespace from %s cells.", count)
      : _t("No selected cells had whitespace trimmed.");
    this.notificationStore.notifyUser({
      type: "info",
      text: text,
      sticky: false,
    });
  }
}
