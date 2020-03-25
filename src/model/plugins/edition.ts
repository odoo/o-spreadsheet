import { BasePlugin } from "../base_plugin";
import { GridCommand, Zone } from "../types";
import { toZone } from "../../helpers";

export class EditionPlugin extends BasePlugin {
  dispatch(cmd: GridCommand): void | GridCommand[] {
    switch (cmd.type) {
      case "ADD_HIGHLIGHTS":
        this.addHighlights(cmd.ranges);
        break;
      case "REMOVE_HIGHLIGHTS":
        this.workbook.highlights = [];
        break;
      case "START_COMPOSER_SELECTION":
        this.workbook.isSelectingRange = true;
        return [
          {
            type: "SET_SELECTION",
            zones: this.workbook.selection.zones,
            anchor: [this.workbook.activeCol, this.workbook.activeRow]
          }
        ];
      case "STOP_COMPOSER_SELECTION":
        this.workbook.isSelectingRange = false;
    }
  }

  private addHighlights(ranges: { [range: string]: string }) {
    let highlights = Object.keys(ranges)
      .map(r1c1 => {
        const zone: Zone = this.getters.expandZone(toZone(r1c1));
        return { zone, color: ranges[r1c1] };
      })
      .filter(
        x =>
          x.zone.top >= 0 &&
          x.zone.left >= 0 &&
          x.zone.bottom < this.workbook.rows.length &&
          x.zone.right < this.workbook.cols.length
      );

    this.workbook.highlights = this.workbook.highlights.concat(highlights);
  }
}
