import { Component, useState } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../../constants";
import { clip, isEqual } from "../../../helpers";
import { interactivePaste } from "../../../helpers/ui/paste";
import { SpreadsheetChildEnv, Zone } from "../../../types";
import { dragAndDropBeyondTheViewport } from "../../helpers/drag_and_drop";
import { Border } from "../border/border";

interface Props {
  zone: Zone;
  getGridDOMSize: () => DOMRect;
}

interface SelectionState {
  shiftingMode: "isMoving" | "none";
}
export class Selection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.Selection";
  static components = {
    Border,
  };

  selectionState: SelectionState = useState({
    shiftingMode: "none",
  });

  onMoveSelection(clientX: number, clientY: number) {
    this.selectionState.shiftingMode = "isMoving";
    const initZone = this.props.zone;

    const position = this.props.getGridDOMSize();
    const activeSheetId = this.env.model.getters.getActiveSheetId();

    const initCol = this.env.model.getters.getColIndex(clientX - position.left - HEADER_WIDTH);
    const initRow = this.env.model.getters.getRowIndex(clientY - position.top - HEADER_HEIGHT);

    const deltaColMin = -initZone.left;
    const deltaColMax = this.env.model.getters.getNumberCols(activeSheetId) - initZone.right - 1;

    const deltaRowMin = -initZone.top;
    const deltaRowMax = this.env.model.getters.getNumberRows(activeSheetId) - initZone.bottom - 1;

    let currentZone = initZone;
    this.env.model.dispatch("CUT", { target: [initZone] });

    let lastCol = initCol;
    let lastRow = initRow;

    const mouseMove = (col, row) => {
      lastCol = col >= 0 ? col : lastCol;
      lastRow = row >= 0 ? row : lastRow;

      const deltaCol = clip(lastCol - initCol, deltaColMin, deltaColMax);
      const deltaRow = clip(lastRow - initRow, deltaRowMin, deltaRowMax);
      let newZone: Zone = {
        left: initZone.left + deltaCol,
        top: initZone.top + deltaRow,
        right: initZone.right + deltaCol,
        bottom: initZone.bottom + deltaRow,
      };

      newZone = this.env.model.getters.expandZone(activeSheetId, newZone);

      if (!isEqual(newZone, currentZone)) {
        this.env.model.selection.moveZone({
          zone: newZone,
          cell: { col: initZone.left + deltaCol, row: initZone.top + deltaRow },
        });
        currentZone = newZone;
      }
    };

    const mouseUp = () => {
      if (!isEqual(initZone, currentZone)) {
        const cmdResult = interactivePaste(this.env, [currentZone]);
        if (!cmdResult.isSuccessful) {
          this.env.model.selection.selectZone({
            zone: initZone,
            cell: { col: initZone.left, row: initZone.top },
          });
        }
        this.selectionState.shiftingMode = "none";
      }
      this.env.model.dispatch("CLEAR_CLIPBOARD");
    };

    dragAndDropBeyondTheViewport(this.props.getGridDOMSize(), this.env, mouseMove, mouseUp);
  }
}
