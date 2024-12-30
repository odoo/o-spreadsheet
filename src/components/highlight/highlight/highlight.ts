import { Component, useState } from "@odoo/owl";
import { ComponentsImportance } from "../../../constants";
import { clip, isEqual } from "../../../helpers";
import {
  Color,
  HeaderIndex,
  Pixel,
  ResizeDirection,
  SpreadsheetChildEnv,
  Zone,
} from "../../../types";
import { css } from "../../helpers/css";
import { gridOverlayPosition } from "../../helpers/dom_helpers";
import { dragAndDropBeyondTheViewport } from "../../helpers/drag_and_drop";
import { dragAndDropBeyondTheViewportTouch } from "../../helpers/drag_and_drop_touch";
import { Border } from "../border/border";
import { Corner } from "../corner/corner";

css/*SCSS*/ `
  .o-highlight {
    z-index: ${ComponentsImportance.Highlight};
  }
`;

interface Props {
  zone: Zone;
  color: Color;
}

interface HighlightState {
  shiftingMode: "isMoving" | "isResizing" | "none";
}
export class Highlight extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-mobile-Highlight";
  static props = {
    zone: Object,
    color: String,
  };
  static components = {
    Corner,
    Border,
  };

  highlightState: HighlightState = useState({
    shiftingMode: "none",
  });

  get cornerOrientations(): Array<"nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"> {
    const z = this.props.zone;
    //TODORAR get the string instead of zone or the range? maybe range
    if (z.bottom === undefined) {
      return ["w", "e"];
    } else if (z.right === undefined) {
      return ["n", "s"];
    } else {
      return ["nw", "se"];
    }
  }

  onResizeHighlight(dirX: ResizeDirection, dirY: ResizeDirection) {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    this.highlightState.shiftingMode = "isResizing";
    const z = this.props.zone;

    const pivotCol = dirX === 1 ? z.left : z.right;
    const pivotRow = dirY === 1 ? z.top : z.bottom;

    let lastCol = dirX === 1 ? z.right : z.left;
    let lastRow = dirY === 1 ? z.bottom : z.top;
    let currentZone = z;
    const only = dirX === 0 ? "vertical" : dirY === 0 ? "horizontal" : false;
    this.env.model.dispatch("START_CHANGE_HIGHLIGHT", { zone: currentZone });

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
              cell: { col: newZone.left, row: newZone.top },
              zone: newZone,
            },
            { unbounded: true }
          );
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.highlightState.shiftingMode = "none";
    };

    dragAndDropBeyondTheViewportTouch(this.env, mouseMove, mouseUp, only);
  }

  onMoveHighlight(clientX: Pixel, clientY: Pixel) {
    this.highlightState.shiftingMode = "isMoving";
    const z = this.props.zone;

    const position = gridOverlayPosition();
    const activeSheetId = this.env.model.getters.getActiveSheetId();

    const initCol = this.env.model.getters.getColIndex(clientX - position.left);
    const initRow = this.env.model.getters.getRowIndex(clientY - position.top);

    const deltaColMin = -z.left;
    const deltaColMax = this.env.model.getters.getNumberCols(activeSheetId) - z.right - 1;

    const deltaRowMin = -z.top;
    const deltaRowMax = this.env.model.getters.getNumberRows(activeSheetId) - z.bottom - 1;

    let currentZone = z;
    this.env.model.dispatch("START_CHANGE_HIGHLIGHT", { zone: currentZone });

    let lastCol = initCol;
    let lastRow = initRow;

    const mouseMove = (col: HeaderIndex, row: HeaderIndex) => {
      if (lastCol !== col || lastRow !== row) {
        lastCol = col === -1 ? lastCol : col;
        lastRow = row === -1 ? lastRow : row;

        const deltaCol = clip(lastCol - initCol, deltaColMin, deltaColMax);
        const deltaRow = clip(lastRow - initRow, deltaRowMin, deltaRowMax);
        let newZone: Zone = {
          left: z.left + deltaCol,
          top: z.top + deltaRow,
          right: z.right + deltaCol,
          bottom: z.bottom + deltaRow,
        };

        if (!isEqual(newZone, currentZone)) {
          this.env.model.selection.selectZone(
            {
              cell: { col: newZone.left, row: newZone.top },
              zone: newZone,
            },
            { unbounded: true }
          );
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.highlightState.shiftingMode = "none";
    };

    dragAndDropBeyondTheViewport(this.env, mouseMove, mouseUp);
  }
}
