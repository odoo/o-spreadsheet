import { Figure, SpreadsheetEnv, Viewport } from "../../types/index";
import { Component } from "@odoo/owl";
import * as owl from "@odoo/owl";
import { TextFigure } from "./text-figure";

const { xml, css } = owl.tags;

// display none if out of viewport
const TEMPLATE = xml/* xml */ `
<div>
    <t t-foreach="getFigures()" t-as="figure" t-key="figure.id">
        <div t-att-style="getStyle(figure)">
            <t t-component="figuresMap[figure.type]"
               t-key="figure.id"
               figure="figure"
            />
            <t t-if="figure.isSelected">
                <div class="o-anchor o-topRight"></div>
                <div class="o-anchor o-topLeft"></div>
                <div class="o-anchor o-bottomRight"></div>
                <div class="o-anchor o-bottomLeft"></div>
            </t>
        </div>

    </t>
</div>
`;

const CSS = css/*SCSS*/ `
  .o-anchor {
    position: absolute;
    width: 6px;
    height: 6px;
    background-color: #1a73e8;
    &.o-topRight {
      top: -3px;
      left: calc(100% - 3px);
      cursor: ne-resize;
    }
    &.o-topLeft {
      top: -3px;
      left: -3px;
      cursor: nw-resize;
    }
    &.o-bottomRight {
      top: calc(100% - 3px);
      left: calc(100% - 3px);
      cursor: se-resize;
    }
    &.o-bottomLeft {
      top: calc(100% - 3px);
      left: -3px;
      cursor: sw-resize;
    }
  }
`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------

export class FiguresContainer extends Component<{ viewport: Viewport }, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = {};

  figuresMap = {
    text: TextFigure,
  };

  getters = this.env.getters;
  dispatch = this.env.dispatch;
  size: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  getFigures(): Figure[] {
    return this.getters.getFiguresInside(this.env.getters.getActiveSheet(), this.props.viewport);
  }

  getStyle(figure: Figure) {
    const [x, y, width, height] = this.getters.getRect(figure.position, this.props.viewport);
    this.size = {
      x,
      y,
      width,
      height,
    };
    if (width < 0 || height < 0) {
      return `position:absolute;display:none;`;
    }
    return `position:absolute; top:${y}px; left:${x}px; width:${width}px; height:${height}px`;
  }
}
