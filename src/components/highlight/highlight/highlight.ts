import { Component, useState } from "@odoo/owl";
import { ComponentsImportance } from "../../../constants";
import { clip, isEqual } from "../../../helpers";
import {
  Color,
  HeaderIndex,
  Range,
  ResizeDirection,
  SpreadsheetChildEnv,
  Zone,
} from "../../../types";
import { css } from "../../helpers/css";
import { gridOverlayPosition } from "../../helpers/dom_helpers";
import {
  DnDDirection,
  useDragAndDropBeyondTheViewport,
} from "../../helpers/drag_and_drop_grid_hook";
import { Border } from "../border/border";
import { Corner } from "../corner/corner";

css/*SCSS*/ `
  .o-highlight {
    z-index: ${ComponentsImportance.Highlight};
  }
`;

interface Props {
  range: Range;
  color: Color;
}

interface HighlightState {
  shiftingMode: "isMoving" | "isResizing" | "none";
}
export class Highlight extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Highlight";
  static props = {
    range: Object,
    color: String,
  };
  static components = {
    Corner,
    Border,
  };

  highlightState: HighlightState = useState({
    shiftingMode: "none",
  });
  dragNDropGrid = useDragAndDropBeyondTheViewport(this.env);

  get cornerOrientations(): Array<"nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"> {
    if (!this.env.isMobile()) {
      return ["nw", "ne", "sw", "se"];
    }
    const z = this.props.range.unboundedZone;
    if (z.bottom === undefined) {
      return ["w", "e"];
    } else if (z.right === undefined) {
      return ["n", "s"];
    } else {
      return ["nw", "se"];
    }
  }

  onResizeHighlight(ev: PointerEvent, dirX: ResizeDirection, dirY: ResizeDirection) {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    this.highlightState.shiftingMode = "isResizing";
    const z = this.props.range.zone;

    const pivotCol = dirX === 1 ? z.left : z.right;
    const pivotRow = dirY === 1 ? z.top : z.bottom;

    let lastCol = dirX === 1 ? z.right : z.left;
    let lastRow = dirY === 1 ? z.bottom : z.top;
    let currentZone = z;

    let scrollDirection: DnDDirection = "all";

    if (this.env.isMobile()) {
      scrollDirection = dirX === 0 ? "vertical" : dirY === 0 ? "horizontal" : "all";
    }

    this.env.model.dispatch("START_CHANGE_HIGHLIGHT", { zone: currentZone });

    const mouseMove = (col: HeaderIndex, row: HeaderIndex) => {
      if (lastCol !== col || lastRow !== row) {
        let { left, right, top, bottom } = currentZone;

        if (scrollDirection !== "horizontal") {
          lastRow = lastRow = clip(
            row === -1 ? lastRow : row,
            0,
            this.env.model.getters.getNumberRows(activeSheetId) - 1
          );
          top = Math.min(pivotRow, lastRow);
          bottom = Math.max(pivotRow, lastRow);
        }

        if (scrollDirection !== "vertical") {
          lastCol = clip(
            col === -1 ? lastCol : col,
            0,
            this.env.model.getters.getNumberCols(activeSheetId) - 1
          );
          left = Math.min(pivotCol, lastCol);
          right = Math.max(pivotCol, lastCol);
        }

        const newZone: Zone = { left, right, top, bottom };
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
    this.dragNDropGrid.start(ev, mouseMove, mouseUp, scrollDirection);
  }

  onMoveHighlight(ev: PointerEvent) {
    this.highlightState.shiftingMode = "isMoving";
    const z = this.props.range.zone;

    const position = gridOverlayPosition();
    const activeSheetId = this.env.model.getters.getActiveSheetId();

    const initCol = this.env.model.getters.getColIndex(ev.clientX - position.left);
    const initRow = this.env.model.getters.getRowIndex(ev.clientY - position.top);

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
        const newZone: Zone = {
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

    this.dragNDropGrid.start(ev, mouseMove, mouseUp);
  }
}
