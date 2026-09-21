import { PivotPresenceTracker } from "../../helpers/pivot/pivot_presence_tracker";
import { PivotStartPresenceTracking } from "../../types/commands";
import { UID } from "../../types/misc";
import { EvaluationPlugin } from "../evaluation_plugin";

export class PivotPresencePlugin extends EvaluationPlugin {
  static getters = ["getPivotPresenceTracker"] as const;

  private trackPresencePivotId?: UID;
  private sheetId?: UID;
  private tracker?: PivotPresenceTracker;

  handlers = {
    PIVOT_START_PRESENCE_TRACKING: this.onPivotStartPresenceTracking,
    PIVOT_STOP_PRESENCE_TRACKING: this.onPivotStopPresenceTracking,
  };

  private onPivotStopPresenceTracking() {
    this.trackPresencePivotId = undefined;
    this.sheetId = undefined;
  }

  private onPivotStartPresenceTracking(cmd: PivotStartPresenceTracking) {
    this.tracker = new PivotPresenceTracker();
    this.trackPresencePivotId = cmd.pivotId;
    this.sheetId = cmd.sheetId;
  }

  getPivotPresenceTracker(pivotId: UID, sheetId: UID) {
    if (this.trackPresencePivotId !== pivotId || this.sheetId !== sheetId) {
      return undefined;
    }
    if (!this.tracker) {
      throw new Error("Tracker not initialized");
    }
    return this.tracker;
  }
}
