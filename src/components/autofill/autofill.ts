import { HeaderIndex } from "@odoo/o-spreadsheet-engine";
import { Component, useState, xml } from "@odoo/owl";
import { clip } from "../../helpers";
import { SpreadsheetChildEnv } from "../../types";
import { cssPropertiesToCss } from "../helpers/css";
import { useDragAndDropBeyondTheViewport } from "../helpers/drag_and_drop_grid_hook";

// -----------------------------------------------------------------------------
// Autofill
// -----------------------------------------------------------------------------

interface Props {
  isVisible: boolean;
  position: Position;
}

interface Position {
  top: HeaderIndex;
  left: HeaderIndex;
}

interface State {
  position: Position;
  handler: boolean;
}

export class Autofill extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Autofill";
  static props = {
    position: Object,
    isVisible: Boolean,
  };
  state: State = useState({
    position: { left: 0, top: 0 },
    handler: false,
  });

  dragNDropGrid = useDragAndDropBeyondTheViewport(this.env);

  get style() {
    const { left, top } = this.props.position;
    return cssPropertiesToCss({
      top: `${top}px`,
      left: `${left}px`,
      visibility: this.props.isVisible ? "visible" : "hidden",
    });
  }
  get handlerStyle() {
    const { left, top } = this.state.handler ? this.state.position : this.props.position;
    return cssPropertiesToCss({
      top: `${top}px`,
      left: `${left}px`,
    });
  }

  get styleNextValue() {
    const { left, top } = this.state.position;
    return cssPropertiesToCss({
      top: `${top + 5}px`,
      left: `${left + 15}px`,
    });
  }

  getTooltip() {
    const tooltip = this.env.model.getters.getAutofillTooltip();
    if (tooltip && !tooltip.component) {
      tooltip.component = TooltipComponent;
    }
    return tooltip;
  }

  onMouseDown(ev: PointerEvent) {
    this.state.handler = true;

    let lastCol: HeaderIndex | undefined;
    let lastRow: HeaderIndex | undefined;
    const start = {
      left: ev.clientX - this.props.position.left,
      top: ev.clientY - this.props.position.top,
    };
    const onMouseUp = () => {
      this.state.handler = false;
      this.state.position = { ...this.props.position };
      this.env.model.dispatch("AUTOFILL");
    };

    const onMouseMove = (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => {
      this.state.position = {
        left: ev.clientX - start.left,
        top: ev.clientY - start.top,
      };
      if (lastCol !== col || lastRow !== row) {
        const activeSheetId = this.env.model.getters.getActiveSheetId();
        const numberOfCols = this.env.model.getters.getNumberCols(activeSheetId);
        const numberOfRows = this.env.model.getters.getNumberRows(activeSheetId);
        lastCol = col === -1 ? lastCol : clip(col, 0, numberOfCols);
        lastRow = row === -1 ? lastRow : clip(row, 0, numberOfRows);
        if (lastCol !== undefined && lastRow !== undefined) {
          this.env.model.dispatch("AUTOFILL_SELECT", { col: lastCol, row: lastRow });
        }
      }
    };
    this.dragNDropGrid.start(ev, onMouseMove, onMouseUp);
  }

  onDblClick() {
    this.env.model.dispatch("AUTOFILL_AUTO");
  }
}

class TooltipComponent extends Component<Props> {
  static props = {
    content: String,
  };
  static template = xml/* xml */ `
    <div t-esc="props.content"/>
  `;
}
