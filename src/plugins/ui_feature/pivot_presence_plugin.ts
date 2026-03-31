import { PivotPresenceTracker } from "../../helpers/pivot/pivot_presence_tracker";
import { Command } from "../../types/commands";
import { UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class PivotPresencePlugin extends UIPlugin {
  static getters = ["getPivotPresenceTracker"] as const;

  private trackPresencePivotId?: UID;
  private tracker?: PivotPresenceTracker;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "PIVOT_START_PRESENCE_TRACKING":
        this.tracker = new PivotPresenceTracker();
        this.trackPresencePivotId = cmd.pivotId;
        break;
      case "PIVOT_STOP_PRESENCE_TRACKING":
        this.trackPresencePivotId = undefined;
        break;
    }
  }

  getPivotPresenceTracker(pivotId: UID) {
    if (this.trackPresencePivotId !== pivotId) {
      return undefined;
    }
    if (!this.tracker) {
      throw new Error("Tracker not initialized");
    }
    return this.tracker;
  }
}
