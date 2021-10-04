import { createMachine, MachineConfig, sendParent } from "xstate";
import { isEqual, union, uniqueZones } from "../helpers";
import { Selection } from "../plugins/ui/selection";
import { Increment, Zone } from "../types";

export class SelectionContext {
  selection: Selection = {
    zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
    anchor: [0, 0],
    anchorZone: { top: 0, left: 0, bottom: 0, right: 0 },
  };

  setSelection(zones: Zone[]) {
    const anchorZone = zones[zones.length - 1];
    this.selection.zones = uniqueZones(zones);
    this.selection.anchorZone = anchorZone;
    this.selection.anchor = [anchorZone.left, anchorZone.top];
  }

  extendSelectionWithCell(col: number, row: number) {
    const selection = this.selection;
    const [anchorCol, anchorRow] = selection.anchor;
    const zone: Zone = {
      left: Math.min(anchorCol, col),
      top: Math.min(anchorRow, row),
      right: Math.max(anchorCol, col),
      bottom: Math.max(anchorRow, row),
    };
    this.selection.zones.pop();
    this.setSelection([...this.selection.zones, zone]);
  }

  /**
   * TODO rename
   */
  applyDeltaToSelection(deltaX: Increment, deltaY: Increment) {
    const selection = this.selection;
    const [anchorCol, anchorRow] = selection.anchor;
    const { left, right, top, bottom } = selection.anchorZone;
    let result: Zone | null = selection.anchorZone;
    // check if we can shrink selection
    let n = 0;
    while (result !== null) {
      n++;
      if (deltaX < 0) {
        result = anchorCol <= right - n ? { top, left, bottom, right: right - n } : null;
      }
      if (deltaX > 0) {
        result = left + n <= anchorCol ? { top, left: left + n, bottom, right } : null;
      }
      if (deltaY < 0) {
        result = anchorRow <= bottom - n ? { top, left, bottom: bottom - n, right } : null;
      }
      if (deltaY > 0) {
        result = top + n <= anchorRow ? { top: top + n, left, bottom, right } : null;
      }
      console.log(result);
      if (result && !isEqual(result, selection.anchorZone)) {
        this.selection.zones = this.replaceAnchorZone(result);
        this.selection.anchorZone = result;
        return;
      }
    }
    const currentZone = { top: anchorRow, bottom: anchorRow, left: anchorCol, right: anchorCol };
    const zoneWithDelta = {
      top: top + deltaY,
      left: left + deltaX,
      bottom: bottom + deltaY,
      right: right + deltaX,
    };
    result = union(currentZone, zoneWithDelta);
    console.log(result);
    if (result && !isEqual(result, selection.anchorZone)) {
      this.selection.zones = this.replaceAnchorZone(result);
      this.selection.anchorZone = result;
    }
  }

  /**
   * Return the selected zones with the anchor zone replaced with the provided
   * zone.
   */
  private replaceAnchorZone(newZone: Zone): Zone[] {
    let zones = [...this.selection.zones];
    const current = this.selection.anchorZone;
    const index = zones.findIndex((z: Zone) => isEqual(z, current));
    if (index >= 0) {
      zones[index] = newZone;
    }
    return zones;
  }
}

const mouseMoveMachine: MachineConfig<SelectionContext, any, any> = {
  initial: "pasClicked",
  states: {
    pasClicked: {
      on: {
        click: "clicked",
      },
    },
    clicked: {
      on: {
        mouseUp: "pasClicked",
        mouseMoved: {
          actions: [
            {
              type: "lqmsjdf",
              exec: (context, { col, row }) => {
                context.extendSelectionWithCell(col, row);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
      },
    },
  },
};

export const clickMachine: MachineConfig<SelectionContext, any, any> = {
  initial: "single",
  states: {
    single: {
      on: {
        ctrlPressed: "multi",
        shiftPressed: "singleShift",
        arrowKeyPressed: {
          actions: [
            {
              type: "sdqf",
              exec: (context, { deltaX, deltaY }) => {
                const [anchorCol, anchorRow] = context.selection.anchor;
                context.setSelection([
                  {
                    top: anchorRow + deltaY,
                    bottom: anchorRow + deltaY,
                    left: anchorCol + deltaX,
                    right: anchorCol + deltaX,
                  },
                ]);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
        click: {
          actions: [
            {
              type: "extendLastSelectedZone",
              exec: (context, { col, row }) => {
                context.setSelection([{ top: row, bottom: row, left: col, right: col }]);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
      },
    },
    singleShift: {
      on: {
        ctrlPressed: "multiShift",
        shiftReleased: "single",
        arrowKeyPressed: {
          actions: [
            {
              type: "sdqf",
              exec: (context, { deltaX, deltaY }) => {
                context.applyDeltaToSelection(deltaX, deltaY);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
        click: {
          actions: [
            {
              type: "extendLastSelectedZone",
              exec: (context, { col, row }) => {
                context.extendSelectionWithCell(col, row);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
      },
    },
    multi: {
      on: {
        shiftPressed: "multiShift",
        ctrlReleased: "single",
        arrowKeyPressed: {
          actions: [
            {
              type: "sdqf",
              exec: (context, { deltaX, deltaY }) => {
                const [anchorCol, anchorRow] = context.selection.anchor;
                context.setSelection([
                  {
                    top: anchorRow + deltaY,
                    bottom: anchorRow + deltaY,
                    left: anchorCol + deltaX,
                    right: anchorCol + deltaX,
                  },
                ]);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
        click: {
          actions: [
            {
              type: "extendLastSelectedZone",
              exec: (context, { col, row }) => {
                const zones = [
                  ...context.selection.zones,
                  { top: row, bottom: row, left: col, right: col },
                ];
                context.setSelection(zones);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
      },
    },
    multiShift: {
      on: {
        shiftReleased: "multi",
        ctrlReleased: "singleShift",
        arrowKeyPressed: {
          actions: [
            {
              type: "sdqf",
              exec: (context, { deltaX, deltaY }) => {
                context.applyDeltaToSelection(deltaX, deltaY);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
        click: {
          actions: [
            {
              type: "extendSelectionWithCell",
              exec: (context, { col, row }) => {
                context.extendSelectionWithCell(col, row);
              },
            },
            sendParent((context) => ({ type: "rangeSelected", range: context.selection.zones })),
          ],
        },
      },
    },
  },
};

export const selectionMachine = createMachine<SelectionContext>({
  type: "parallel",
  states: {
    clickMachine,
    mouseMoveMachine,
  },
});
