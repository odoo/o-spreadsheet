import { Component, useState, xml } from "@odoo/owl";
import { AUTOFILL_EDGE_LENGTH } from "../constants";
import { clip } from "../helpers/misc";
import { ModelProvider } from "../stores/model_store";
import { ConsumerComponent } from "../stores/providers";
import { SpreadsheetChildEnv } from "../types";
import { css } from "./helpers/css";
import { startDnd } from "./helpers/drag_and_drop";

// -----------------------------------------------------------------------------
// Autofill
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-autofill" t-on-mousedown="onMouseDown" t-att-style="style" t-on-dblclick="onDblClick">
    <div class="o-autofill-handler" t-att-style="styleHandler"/>
    <t t-set="tooltip" t-value="getTooltip()"/>
    <div t-if="tooltip" class="o-autofill-nextvalue" t-att-style="styleNextvalue">
      <t t-component="tooltip.component" t-props="tooltip.props"/>
    </div>
  </div>
`;

css/* scss */ `
  .o-autofill {
    height: 6px;
    width: 6px;
    border: 1px solid white;
    position: absolute;
    background-color: #1a73e8;

    .o-autofill-handler {
      position: absolute;
      height: ${AUTOFILL_EDGE_LENGTH}px;
      width: ${AUTOFILL_EDGE_LENGTH}px;

      &:hover {
        cursor: crosshair;
      }
    }

    .o-autofill-nextvalue {
      position: absolute;
      background-color: white;
      border: 1px solid black;
      padding: 5px;
      font-size: 12px;
      pointer-events: none;
      white-space: nowrap;
    }
  }
`;

interface Props {
  position: Position;
  getGridBoundingClientRect: () => DOMRect;
}

interface Position {
  top: number;
  left: number;
}

interface State {
  position: Position;
  handler: boolean;
}

export class Autofill extends ConsumerComponent<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;

  state: State = useState({
    position: { left: 0, top: 0 },
    handler: false,
  });

  get getters() {
    return this.providers.watch(ModelProvider, this.env.model);
  }

  get style() {
    const { left, top } = this.props.position;
    return `top:${top}px;left:${left}px`;
  }

  get styleHandler() {
    let position: Position = this.state.handler ? this.state.position : { left: 0, top: 0 };
    return `top:${position.top}px;left:${position.left}px;`;
  }

  get styleNextvalue() {
    let position: Position = this.state.handler ? this.state.position : { left: 0, top: 0 };
    return `top:${position.top + 5}px;left:${position.left + 15}px;`;
  }

  getTooltip() {
    const tooltip = this.getters.getAutofillTooltip();
    if (tooltip && !tooltip.component) {
      tooltip.component = TooltipComponent;
    }
    return tooltip;
  }

  onMouseDown(ev: MouseEvent) {
    this.state.handler = true;
    this.state.position = { left: 0, top: 0 };
    const { offsetY, offsetX } = this.getters.getActiveSnappedViewport();
    const start = {
      left: ev.clientX + offsetX,
      top: ev.clientY + offsetY,
    };
    let lastCol: number | undefined;
    let lastRow: number | undefined;

    const onMouseUp = () => {
      this.state.handler = false;
      this.env.model.dispatch("AUTOFILL");
    };

    const onMouseMove = (ev: MouseEvent) => {
      const position = this.props.getGridBoundingClientRect();
      const {
        top: viewportTop,
        left: viewportLeft,
        offsetY,
        offsetX,
      } = this.getters.getActiveSnappedViewport();
      this.state.position = {
        left: ev.clientX - start.left + offsetX,
        top: ev.clientY - start.top + offsetY,
      };
      const col = this.getters.getColIndex(ev.clientX - position.left, viewportLeft);
      const row = this.getters.getRowIndex(ev.clientY - position.top, viewportTop);
      if (lastCol !== col || lastRow !== row) {
        const activeSheet = this.getters.getActiveSheet();
        lastCol = col === -1 ? lastCol : clip(col, 0, activeSheet.cols.length);
        lastRow = row === -1 ? lastRow : clip(row, 0, activeSheet.rows.length);
        if (lastCol !== undefined && lastRow !== undefined) {
          this.env.model.dispatch("AUTOFILL_SELECT", { col: lastCol, row: lastRow });
        }
      }
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onDblClick() {
    this.env.model.dispatch("AUTOFILL_AUTO");
  }
}

class TooltipComponent extends Component<Props> {
  static template = xml/* xml */ `
    <div t-esc="props.content"/>
  `;
}
