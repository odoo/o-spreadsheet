import { isEqual } from "../../helpers";
import { Mode } from "../../model";
import { _lt } from "../../translation";
import {
  Command,
  CommandResult,
  DispatchResult,
  Position,
  SortDirection,
  UID,
  Zone,
} from "../../types";
import { UIPlugin } from "../ui_plugin";

export class InteractiveSortPlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
  handle(cmd: Command) {
    switch (cmd.type) {
      case "SORT_CELLS":
        if (cmd.interactive) {
          this.interactiveSortSelection(
            cmd.sheetId,
            { col: cmd.col, row: cmd.row },
            cmd.zone,
            cmd.sortDirection
          );
        }
        break;
    }
  }

  private interactiveSortSelection(
    sheetId: UID,
    anchor: Position,
    zone: Zone,
    sortDirection: SortDirection
  ) {
    let result: DispatchResult = DispatchResult.Success;

    //several columns => bypass the contiguity check
    let multiColumns: boolean = zone.right > zone.left;
    if (this.getters.doesIntersectMerge(sheetId, zone)) {
      multiColumns = false;
      let table: UID[];
      for (let r = zone.top; r <= zone.bottom; r++) {
        table = [];
        for (let c = zone.left; c <= zone.right; c++) {
          let merge = this.getters.getMerge(sheetId, c, r);
          if (merge && !table.includes(merge.id.toString())) {
            table.push(merge.id.toString());
          }
        }
        if (table.length >= 2) {
          multiColumns = true;
          break;
        }
      }
    }

    if (multiColumns) {
      result = this.dispatch("SORT_CELLS", { ...anchor, sheetId, zone, sortDirection });
    } else {
      // check contiguity
      const contiguousZone = this.getters.getContiguousZone(sheetId, zone);
      if (isEqual(contiguousZone, zone)) {
        // merge as it is
        result = this.dispatch("SORT_CELLS", {
          ...anchor,
          sheetId,
          zone,
          sortDirection,
        });
      } else {
        this.ui.askConfirmation(
          _lt(
            "We found data next to your selection. Since this data was not selected, it will not be sorted. Do you want to extend your selection?"
          ),
          () => {
            zone = contiguousZone;
            result = this.dispatch("SORT_CELLS", {
              ...anchor,
              sheetId,
              zone,
              sortDirection,
            });
          },
          () => {
            result = this.dispatch("SORT_CELLS", {
              ...anchor,
              sheetId,
              zone,
              sortDirection,
            });
          }
        );
      }
    }
    if (result.isCancelledBecause(CommandResult.InvalidSortZone)) {
      this.dispatch("SET_SELECTION", {
        anchor: [anchor.col, anchor.row],
        zones: [zone],
        anchorZone: zone,
      });
      this.ui.notifyUser(
        _lt("Cannot sort. To sort, select only cells or only merges that have the same size.")
      );
    }
  }
}
