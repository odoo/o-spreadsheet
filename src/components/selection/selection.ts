import { Component, useState } from "@odoo/owl";
import { ComponentsImportance, SELECTION_BORDER_COLOR } from "../../constants";
import { clip, isEqual } from "../../helpers";
import { Color, HeaderIndex, SpreadsheetChildEnv, Zone } from "../../types";
import { css } from "../helpers/css";
import { dragAndDropBeyondTheViewportTouch } from "../helpers/drag_and_drop_touch";
import { Corner } from "../highlight/corner/corner";

css/*SCSS*/ `
  .o-highlight {
    z-index: ${ComponentsImportance.Selection};
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

  onResizeHighlight(isLeft: boolean, isTop: boolean) {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    this.selectionState.shiftingMode = "isResizing";

    this.env.model.selection.getBackToDefault();
    const z = this.env.model.getters.getSelectedZone();
    const anchor = this.env.model.getters.getActivePosition();

    const pivotCol = isLeft ? z.right : z.left;
    const pivotRow = isTop ? z.bottom : z.top;
    let lastCol = isLeft ? z.left : z.right;
    let lastRow = isTop ? z.top : z.bottom;
    let currentZone = z;

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
          left: Math.min(pivotCol, lastCol),
          top: Math.min(pivotRow, lastRow),
          right: Math.max(pivotCol, lastCol),
          bottom: Math.max(pivotRow, lastRow),
        };

        if (!isEqual(newZone, currentZone)) {
          this.env.model.selection.selectZone(
            {
              cell: anchor,
              zone: newZone,
            },
            { unbounded: true }
          );
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.selectionState.shiftingMode = "none";
    };

    dragAndDropBeyondTheViewportTouch(this.env, mouseMove, mouseUp);
  }
}
