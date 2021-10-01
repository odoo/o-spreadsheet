import { createMachine, MachineConfig } from "xstate";
import { uniqueZones } from "../helpers";
import { Selection } from "../plugins/ui/selection";
import { Zone } from "../types";

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
        click: {
          actions: [
            {
              type: "extendLastSelectedZone",
              exec: (context, { col, row }) => {
                context.setSelection([{ top: row, bottom: row, left: col, right: col }]);
              },
            },
          ],
        },
      },
    },
    singleShift: {
      on: {
        ctrlPressed: "multiShift",
        shiftReleased: "single",
        click: {
          actions: [
            {
              type: "extendLastSelectedZone",
              exec: (context, { col, row }) => {
                context.extendSelectionWithCell(col, row);
              },
            },
          ],
        },
      },
    },
    multi: {
      on: {
        shiftPressed: "multiShift",
        ctrlReleased: "single",
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
          ],
        },
      },
    },
    multiShift: {
      on: {
        shiftReleased: "multi",
        ctrlReleased: "singleShift",
        click: {
          actions: [
            {
              type: "extendSelectionWithCell",
              exec: (context, { col, row }) => {
                context.extendSelectionWithCell(col, row);
              },
            },
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
