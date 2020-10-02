import { BasePlugin } from "../base_plugin";
import { Mode } from "../model";
import { Command, UID, Zone } from "../types/index";
import { toZone } from "../helpers/index";

export type onRangeChange = () => void;

export type Range = {
  id: string;
  zone: Zone; // the zone the range actually spans
  sheetId: string; // the sheet on which the range is defined
  isRowFixed: boolean; // if the row is preceded by $
  isColFixed: boolean; // if the col is preceded by $
  onChange: onRangeChange; // the callbacks that needs to be called if a range is modified
};

export class RangePlugin extends BasePlugin {
  static getters = ["getRangeFromZone", "getRangeFromXC"];
  static modes: Mode[] = ["normal", "readonly", "headless"];
  static pluginName = "range";

  private ranges: Record<string, Record<string, Range>> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
    }
  }

  finalize() {
    // call all the onchange
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getRangeFromXC(sheetId: UID, xc: string, onchange?: onRangeChange): string {
    return this.getRangeFromZone(sheetId, toZone(xc), onchange);
  }

  getRangeFromZone(sheetId: UID, zone: Zone, onchange?: onRangeChange): string {
    if (!this.ranges[sheetId]) {
      this.ranges[sheetId] = {};
    }
    this.ranges[sheetId][this.uniqueRef(sheetId, zone)];
    return "32";
  }

  getRangeToString(rangeId: string): string {
    return "564";
  }

  getZoneFromRange(rangeId: string): Zone {
    return { top: 1, left: 1, bottom: 1, right: 1 };
  }

  //getRange(rangeId: string): Range {}

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private uniqueRef(sheetId: string, zone: Zone): string {
    return "3";
  }
}
