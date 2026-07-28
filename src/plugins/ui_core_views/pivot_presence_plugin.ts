import { PivotPresenceTracker } from "../../helpers/pivot/pivot_presence_tracker";
import { Command } from "../../types/commands";
import { UID } from "../../types/misc";
import { CoreViewPlugin } from "../core_view_plugin";

export class PivotPresencePlugin extends CoreViewPlugin {
  static getters = ["getPivotPresenceTracker"] as const;

  private trackPresencePivotId?: UID;
  private trackedSheetId?: UID;
  private tracker?: PivotPresenceTracker;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "PIVOT_START_PRESENCE_TRACKING":
        this.tracker = new PivotPresenceTracker();
        this.trackPresencePivotId = cmd.pivotId;
        this.trackedSheetId = cmd.sheetId;
        break;
      case "PIVOT_STOP_PRESENCE_TRACKING":
        this.trackPresencePivotId = undefined;
        this.trackedSheetId = undefined;
        break;
    }
  }

  getPivotPresenceTracker(pivotId: UID, sheetId: UID) {
    if (this.trackPresencePivotId !== pivotId || this.trackedSheetId !== sheetId) {
      return undefined;
    }
    if (!this.tracker) {
      throw new Error("Tracker not initialized");
    }
    return this.tracker;
  }
}
