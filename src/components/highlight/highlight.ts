import * as owl from "@odoo/owl";
import { useState } from "@odoo/owl";
import { clip, isEqual } from "../../helpers";
import { SpreadsheetEnv, Zone } from "../../types";
import { dragAndDropBeyondTheViewport } from "../helpers/drag_and_drop";
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
    let lastCol = ev.detail.isLeft ? z.left : z.right;
    let lastRow = ev.detail.isTop ? z.top : z.bottom;
    let currentZone = z;

    this.env.dispatch("START_CHANGE_HIGHLIGHT", { zone: currentZone });

    const mouseMove = (col, row) => {
      if (lastCol !== col || lastRow !== row) {
        const activeSheet = this.env.getters.getActiveSheet();
        lastCol = clip(col === -1 ? lastCol : col, 0, activeSheet.cols.length - 1);
        lastRow = clip(row === -1 ? lastRow : row, 0, activeSheet.rows.length - 1);

        let newZone: Zone = {
          left: Math.min(pivotCol, lastCol),
          top: Math.min(pivotRow, lastRow),
          right: Math.max(pivotCol, lastCol),
          bottom: Math.max(pivotRow, lastRow),
        };

        newZone = this.env.getters.expandZone(activeSheet.id, newZone);

        if (!isEqual(newZone, currentZone)) {
          this.env.dispatch("CHANGE_HIGHLIGHT", { zone: newZone });
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.highlightState.shiftingMode = "none";
      // To do:
      // Command used here to restore focus to the current composer,
      // to be changed when refactoring the 'edition' plugin
      this.env.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    };

    dragAndDropBeyondTheViewport(
      this,
      this.el!.parentElement! as HTMLElement,
      this.env,
      mouseMove,
      mouseUp
    );
  }

  // => le repositionnement des highlights a l'air de pas du tout apprécier le fait qu'on scroll :)
  // il faut regarder la computation des currentcol /current row en fonction de la position du curseur. il manque un calcul d'offset quelque part
  onMoveHighlight(ev: CustomEvent) {
    this.highlightState.shiftingMode = "isMoving";
    const z = this.props.zone;

    const parent = this.el!.parentElement! as HTMLElement;
    const position = parent.getBoundingClientRect();
    const activeSheet = this.env.getters.getActiveSheet();
    const { offsetX: viewportTop, offsetY: viewportLeft } = this.env.getters.getActiveViewport();

    const initCol = this.env.getters.getColIndex(ev.detail.clientX - position.left, viewportLeft);
    const initRow = this.env.getters.getRowIndex(ev.detail.clientY - position.top, viewportTop);

    const deltaColMin = -z.left;
    const deltaColMax = activeSheet.cols.length - z.right - 1;

    const deltaRowMin = -z.top;
    const deltaRowMax = activeSheet.rows.length - z.bottom - 1;

    let currentZone = z;
    this.env.dispatch("START_CHANGE_HIGHLIGHT", { zone: currentZone });

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

        newZone = this.env.getters.expandZone(activeSheet.id, newZone);

        if (!isEqual(newZone, currentZone)) {
          console.log(newZone.top);
          this.env.dispatch("CHANGE_HIGHLIGHT", { zone: newZone });
          currentZone = newZone;
        }
      }
    };

    const mouseUp = () => {
      this.highlightState.shiftingMode = "none";
      // To do:
      // Command used here to restore focus to the current composer,
      // to be changed when refactoring the 'edition' plugin
      this.env.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    };

    dragAndDropBeyondTheViewport(this, parent, this.env, mouseMove, mouseUp);
  }
}
