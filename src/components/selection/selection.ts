import { Component, useState } from "@odoo/owl";
import { ComponentsImportance, SELECTION_BORDER_COLOR } from "../../constants";
import { clip, isEqual } from "../../helpers";
import { Color, HeaderIndex, ResizeDirection, SpreadsheetChildEnv, Zone } from "../../types";
import { css } from "../helpers/css";
import { dragAndDropBeyondTheViewport } from "../helpers/drag_and_drop";
import { Corner } from "../highlight/corner/corner";

css/*SCSS*/ `
  .o-highlight {
    z-index: ${ComponentsImportance.Selection};
  }
  .o-corner {
    z-index: 1000;
  }
`;

interface Props {
  zone: Zone;
  color: Color;
}

interface SelectionState {
  shiftingMode: "isResizing" | "none";
}
export class Selection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-mobile-Selection";
  static props = {};
  static components = {
    Corner,
  };
  COLOR = SELECTION_BORDER_COLOR;

  selectionState: SelectionState = useState({
    shiftingMode: "none",
  });

  // TODORAR direction est pas orientation faut rester juste consistant
  get orientations(): Array<"nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"> {
    const getters = this.env.model.getters;
    const z = getters.getSelectecUnboundedZone();
    if (z.bottom === undefined) {
      return ["w", "e"];
    } else if (z.right === undefined) {
      return ["n", "s"];
    } else {
      return ["nw", "se"];
    }
  }

  // setup() {
  //   // const hasActiveCols = this.env.model.getters.getActiveCols().size > 0;
  //   // const hasActiveRows = this.env.model.getters.getActiveRows().size > 0;
  //   const getters = this.env.model.getters;
  //   const z = getters.getUnboundedZone(getters.getActiveSheetId(), getters.getSelectedZone());
  //   if (z.bottom === undefined) {
  //     this._orientations = ["w", "e"];
  //   } else if (z.right === undefined) {
  //     this._orientations = ["n", "s"];
  //   } else {
  //     this._orientations = ["nw", "se"];
  //   }
  // }

  get zone(): Zone {
    return this.env.model.getters.getSelectedZone();
  }

  onResizeSelection(dirX: ResizeDirection, dirY: ResizeDirection) {
    // onResizeSelection(isLeft: boolean, isTop: boolean) {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    this.selectionState.shiftingMode = "isResizing";

    this.env.model.selection.getBackToDefault();
    const z = this.env.model.getters.getSelectedZone();
    // const anchor = this.env.model.getters.getActivePosition();

    // const pivotCol = isLeft ? z.right : z.left;
    // const pivotRow = isTop ? z.bottom : z.top;

    // let lastCol = isLeft ? z.left : z.right;
    // let lastRow = isTop ? z.top : z.bottom;

    const pivotCol = dirX === 1 ? z.left : z.right;
    const pivotRow = dirY === 1 ? z.top : z.bottom;

    let lastCol = dirX === 1 ? z.right : z.left;
    let lastRow = dirY === 1 ? z.bottom : z.top;

    let currentZone = z;
    const only = dirX === 0 ? "vertical" : dirY === 0 ? "horizontal" : false;
    const mouseMove = (col: HeaderIndex, row: HeaderIndex) => {
      if (lastCol !== col || lastRow !== row) {
        lastCol = clip(
          col === -1 ? lastCol : col,
          0,
          this.env.model.getters.getNumberCols(activeSheetId) - 1
        );
        lastRow = clip(
          row === -1 ? lastRow : row,
          0,
          this.env.model.getters.getNumberRows(activeSheetId) - 1
        );

        let newZone: Zone = {
          left: dirX !== 0 ? Math.min(pivotCol, lastCol) : currentZone.left,
          right: dirX !== 0 ? Math.max(pivotCol, lastCol) : currentZone.right,
          top: dirY !== 0 ? Math.min(pivotRow, lastRow) : currentZone.top,
          bottom: dirY !== 0 ? Math.max(pivotRow, lastRow) : currentZone.bottom,
        };

        if (!isEqual(newZone, currentZone)) {
          this.env.model.selection.selectZone(
            {
              cell: { col: newZone.left, row: newZone.top },
              zone: newZone,
            },
            { unbounded: only ? true : false }
          );
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.selectionState.shiftingMode = "none";
    };

    dragAndDropBeyondTheViewport(this.env, mouseMove, mouseUp, only);
  }
}