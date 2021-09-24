import * as owl from "@odoo/owl";
import { useState } from "@odoo/owl";
import { clip } from "../../helpers";
import { SpreadsheetEnv, Zone } from "../../types";
import { dragAndDropCellHandler, dragAndDropWithEdgeScrolling } from "../helpers/drag_and_drop";
import { Border } from "./border";
import { Corner } from "./corner";

const { Component } = owl;
const { xml } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-highlight">
    <t t-foreach="['nw', 'ne', 'sw', 'se']" t-as="orientation" t-key="orientation">
      <Corner
        t-on-resize-highlight="onResizeHighlight"
        isResizing='highlightState.shiftingMode === "isResizing"'
        orientation="orientation"
        zone="props.zone"
        color="props.color"
      />
    </t>
    <t t-foreach="['n', 's', 'w', 'e']" t-as="orientation" t-key="orientation">
      <Border
        t-on-move-highlight="onMoveHighlight"
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
export class Highlight extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = {
    Corner,
    Border,
  };

  highlightState: HighlightState = useState({
    shiftingMode: "none",
  });

  onResizeHighlight(ev: CustomEvent) {
    this.highlightState.shiftingMode = "isResizing";
    const z = this.props.zone;

    const pivotCol = ev.detail.isLeft ? z.right : z.left;
    const pivotRow = ev.detail.isTop ? z.bottom : z.top;

    this.env.dispatch("START_CHANGE_HIGHLIGHT", { zone: z });

    const onCellChange = (col, row) => {
      if (col === -1 || row === -1) {
        return;
      }

      let newZone: Zone = {
        left: Math.min(pivotCol, col),
        top: Math.min(pivotRow, row),
        right: Math.max(pivotCol, col),
        bottom: Math.max(pivotRow, row),
      };

      const activeSheet = this.env.getters.getActiveSheet();
      newZone = this.env.getters.expandZone(activeSheet.id, newZone);

      this.env.dispatch("CHANGE_HIGHLIGHT", { zone: newZone });
    };

    const onMouseUp = () => {
      this.highlightState.shiftingMode = "none";
      // To do:
      // Command used here to restore focus to the current composer,
      // to be changed when refactoring the 'edition' plugin
      this.env.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    };

    const resizeHighlightHandler = dragAndDropCellHandler(this.env, onCellChange, onMouseUp);
    dragAndDropWithEdgeScrolling(this.env, resizeHighlightHandler);
  }

  onMoveHighlight(ev: CustomEvent) {
    this.highlightState.shiftingMode = "isMoving";
    const z = this.props.zone;

    const parent = this.el!.parentElement! as HTMLElement;
    const position = parent.getBoundingClientRect();
    const activeSheet = this.env.getters.getActiveSheet();
    const { top: viewportTop, left: viewportLeft } = this.env.getters.getActiveSnappedViewport();

    const initCol = this.env.getters.getColIndex(ev.detail.clientX - position.left, viewportLeft);
    const initRow = this.env.getters.getRowIndex(ev.detail.clientY - position.top, viewportTop);

    const deltaColMin = -z.left;
    const deltaColMax = activeSheet.cols.length - z.right - 1;

    const deltaRowMin = -z.top;
    const deltaRowMax = activeSheet.rows.length - z.bottom - 1;

    this.env.dispatch("START_CHANGE_HIGHLIGHT", { zone: z });

    const onCellChange = (col, row) => {
      if (col === -1 || row === -1) {
        return;
      }
      const deltaCol = clip(col - initCol, deltaColMin, deltaColMax);
      const deltaRow = clip(row - initRow, deltaRowMin, deltaRowMax);
      let newZone: Zone = {
        left: z.left + deltaCol,
        top: z.top + deltaRow,
        right: z.right + deltaCol,
        bottom: z.bottom + deltaRow,
      };

      newZone = this.env.getters.expandZone(activeSheet.id, newZone);
      this.env.dispatch("CHANGE_HIGHLIGHT", { zone: newZone });
    };

    const onMouseUp = () => {
      this.highlightState.shiftingMode = "none";
      // To do:
      // Command used here to restore focus to the current composer,
      // to be changed when refactoring the 'edition' plugin
      this.env.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    };

    const moveHighlightHandler = dragAndDropCellHandler(this.env, onCellChange, onMouseUp);
    dragAndDropWithEdgeScrolling(this.env, moveHighlightHandler);
  }
}
