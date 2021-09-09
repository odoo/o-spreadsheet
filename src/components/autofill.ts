import * as owl from "@odoo/owl";
import { AUTOFILL_EDGE_LENGTH } from "../constants";
import { clip } from "../helpers/misc";
import { SpreadsheetEnv } from "../types";
import { startDnd } from "./helpers/drag_and_drop";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useState } = owl.hooks;

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

const CSS = css/* scss */ `
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
}

interface Position {
  top: number;
  left: number;
}

interface State {
  position: Position;
  handler: boolean;
}

export class Autofill extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;

  state: State = useState({
    position: { left: 0, top: 0 },
    handler: false,
  });

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
    const tooltip = this.env.getters.getAutofillTooltip();
    if (tooltip && !tooltip.component) {
      tooltip.component = TooltipComponent;
    }
    return tooltip;
  }

  onMouseDown(ev: MouseEvent) {
    this.state.handler = true;
    this.state.position = { left: 0, top: 0 };
    const start = { left: ev.clientX, top: ev.clientY };
    let lastCol: number | undefined;
    let lastRow: number | undefined;

    const onMouseUp = () => {
      this.state.handler = false;
      this.env.dispatch("AUTOFILL");
    };

    const onMouseMove = (ev: MouseEvent) => {
      this.state.position = {
        left: ev.clientX - start.left,
        top: ev.clientY - start.top,
      };
      const parent = this.el!.parentElement! as HTMLElement;
      const position = parent.getBoundingClientRect();
      const { offsetX, offsetY } = this.env.getters.getActiveViewport();
      const col = this.env.getters.getColIndex(ev.clientX - position.left, offsetX);
      const row = this.env.getters.getRowIndex(ev.clientY - position.top, offsetY);
      if (lastCol !== col || lastRow !== row) {
        const activeSheet = this.env.getters.getActiveSheet();
        lastCol = col === -1 ? lastCol : clip(col, 0, activeSheet.cols.length);
        lastRow = row === -1 ? lastRow : clip(row, 0, activeSheet.rows.length);
        if (lastCol !== undefined && lastRow !== undefined) {
          this.env.dispatch("AUTOFILL_SELECT", { col: lastCol, row: lastRow });
        }
      }
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onDblClick() {
    this.env.dispatch("AUTOFILL_AUTO");
  }
}

class TooltipComponent extends Component<Props> {
  static template = xml/* xml */ `
    <div t-esc="props.content"/>
  `;
}
