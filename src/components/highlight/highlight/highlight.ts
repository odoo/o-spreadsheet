import { Component, useState } from "@odoo/owl";
import { ComponentsImportance } from "../../../constants";
import { clip, isEqual } from "../../../helpers";
import { Pixel, SpreadsheetChildEnv, Zone } from "../../../types";
import { css } from "../../helpers/css";
import { gridOverlayPosition } from "../../helpers/dom_helpers";
import { dragAndDropBeyondTheViewport } from "../../helpers/drag_and_drop";
import { Border } from "../border/border";
import { Corner } from "../corner/corner";

css/*SCSS*/ `
  .o-highlight {
    z-index: ${ComponentsImportance.Highlight};
  }
`;

interface Props {
  zone: Zone;
  color: string;
}

interface HighlightState {
  shiftingMode: "isMoving" | "isResizing" | "none";
}
export class Highlight extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Highlight";
  static components = {
    Corner,
    Border,
  };

  highlightState: HighlightState = useState({
    shiftingMode: "none",
  });

  onResizeHighlight(isLeft: boolean, isTop: boolean) {
    const activeSheet = this.env.model.getters.getActiveSheet();

    this.highlightState.shiftingMode = "isResizing";
    const z = this.props.zone;

    const pivotCol = isLeft ? z.right : z.left;
    const pivotRow = isTop ? z.bottom : z.top;
    let lastCol = isLeft ? z.left : z.right;
    let lastRow = isTop ? z.top : z.bottom;
    let currentZone = z;

    this.env.model.dispatch("START_CHANGE_HIGHLIGHT", {
      range: this.env.model.getters.getRangeDataFromZone(activeSheet.id, currentZone),
    });

    const mouseMove = (col, row) => {
      if (lastCol !== col || lastRow !== row) {
        const activeSheetId = this.env.model.getters.getActiveSheetId();
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

        newZone = this.env.model.getters.expandZone(activeSheetId, newZone);

        if (!isEqual(newZone, currentZone)) {
          this.env.model.dispatch("CHANGE_HIGHLIGHT", {
            range: this.env.model.getters.getRangeDataFromZone(activeSheet.id, newZone),
          });
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.highlightState.shiftingMode = "none";
      // To do:
      // Command used here to restore focus to the current composer,
      // to be changed when refactoring the 'edition' plugin
      this.env.model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    };

    dragAndDropBeyondTheViewport(this.env, mouseMove, mouseUp);
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
    this.env.model.dispatch("START_CHANGE_HIGHLIGHT", {
      range: this.env.model.getters.getRangeDataFromZone(activeSheetId, currentZone),
    });

    let lastCol = initCol;
    let lastRow = initRow;

    const mouseMove = (col, row) => {
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

        newZone = this.env.model.getters.expandZone(activeSheetId, newZone);

        if (!isEqual(newZone, currentZone)) {
          this.env.model.dispatch("CHANGE_HIGHLIGHT", {
            range: this.env.model.getters.getRangeDataFromZone(activeSheetId, newZone),
          });
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.highlightState.shiftingMode = "none";
      // To do:
      // Command used here to restore focus to the current composer,
      // to be changed when refactoring the 'edition' plugin
      this.env.model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    };

    dragAndDropBeyondTheViewport(this.env, mouseMove, mouseUp);
  }
}

Highlight.props = {
  zone: Object,
  color: String,
};
