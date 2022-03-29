import { Component, useRef, useState, xml } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { clip, isEqual } from "../../helpers";
import { SpreadsheetChildEnv, Zone } from "../../types";
import { dragAndDropBeyondTheViewport } from "../helpers/drag_and_drop";
import { Border } from "./border";
import { Corner } from "./corner";

const TEMPLATE = xml/* xml */ `
  <div class="o-highlight" t-ref="highlight">
    <t t-foreach="['nw', 'ne', 'sw', 'se']" t-as="orientation" t-key="orientation">
      <Corner
        onResizeHighlight="(isLeft, isTop) => this.onResizeHighlight(isLeft, isTop)"
        isResizing='highlightState.shiftingMode === "isResizing"'
        orientation="orientation"
        zone="props.zone"
        color="props.color"
      />
    </t>
    <t t-foreach="['n', 's', 'w', 'e']" t-as="orientation" t-key="orientation">
      <Border
        onMoveHighlight="(x, y) => this.onMoveHighlight(x,y)"
        isMoving='highlightState.shiftingMode === "isMoving"'
        orientation="orientation"
        zone="props.zone"
      />
    </t>
  </div>
`;

interface Props {
  zone: Zone;
  color: string;
}

interface HighlightState {
  shiftingMode: "isMoving" | "isResizing" | "none";
}
export class Highlight extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = {
    Corner,
    Border,
  };

  private highlightRef = useRef("highlight");

  highlightState: HighlightState = useState({
    shiftingMode: "none",
  });

  onResizeHighlight(isLeft: boolean, isTop: boolean) {
    this.highlightState.shiftingMode = "isResizing";
    const z = this.props.zone;

    const pivotCol = isLeft ? z.right : z.left;
    const pivotRow = isTop ? z.bottom : z.top;
    let lastCol = isLeft ? z.left : z.right;
    let lastRow = isTop ? z.top : z.bottom;
    let currentZone = z;

    this.env.model.dispatch("START_CHANGE_HIGHLIGHT", { zone: currentZone });

    const mouseMove = (col, row) => {
      if (lastCol !== col || lastRow !== row) {
        const activeSheet = this.env.model.getters.getActiveSheet();
        lastCol = clip(col === -1 ? lastCol : col, 0, activeSheet.cols.length - 1);
        lastRow = clip(row === -1 ? lastRow : row, 0, activeSheet.rows.length - 1);

        let newZone: Zone = {
          left: Math.min(pivotCol, lastCol),
          top: Math.min(pivotRow, lastRow),
          right: Math.max(pivotCol, lastCol),
          bottom: Math.max(pivotRow, lastRow),
        };

        newZone = this.env.model.getters.expandZone(activeSheet.id, newZone);

        if (!isEqual(newZone, currentZone)) {
          this.env.model.dispatch("CHANGE_HIGHLIGHT", { zone: newZone });
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

    dragAndDropBeyondTheViewport(
      this.highlightRef.el!.parentElement!,
      this.env,
      mouseMove,
      mouseUp
    );
  }

  onMoveHighlight(clientX: number, clientY: number) {
    this.highlightState.shiftingMode = "isMoving";
    const z = this.props.zone;

    const parent = this.highlightRef.el!.parentElement!;
    const position = parent.getBoundingClientRect();
    const activeSheet = this.env.model.getters.getActiveSheet();
    const { top: viewportTop, left: viewportLeft } =
      this.env.model.getters.getActiveSnappedViewport();

    const initCol = this.env.model.getters.getColIndex(
      clientX - position.left - HEADER_WIDTH,
      viewportLeft
    );
    const initRow = this.env.model.getters.getRowIndex(
      clientY - position.top - HEADER_HEIGHT,
      viewportTop
    );

    const deltaColMin = -z.left;
    const deltaColMax = activeSheet.cols.length - z.right - 1;

    const deltaRowMin = -z.top;
    const deltaRowMax = activeSheet.rows.length - z.bottom - 1;

    let currentZone = z;
    this.env.model.dispatch("START_CHANGE_HIGHLIGHT", { zone: currentZone });

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

        newZone = this.env.model.getters.expandZone(activeSheet.id, newZone);

        if (!isEqual(newZone, currentZone)) {
          this.env.model.dispatch("CHANGE_HIGHLIGHT", { zone: newZone });
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

    dragAndDropBeyondTheViewport(parent, this.env, mouseMove, mouseUp);
  }
}
