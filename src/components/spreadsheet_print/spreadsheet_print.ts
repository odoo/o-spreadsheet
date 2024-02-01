import { Component, onMounted, useRef } from "@odoo/owl";
import { FIGURE_BORDER_COLOR } from "../../constants";
import { DOMCoordinates, DOMDimension, SpreadsheetChildEnv } from "../../types/index";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { css, cssPropertiesToCss } from "../helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";

interface Props {
  canvasSize: () => DOMDimension;
}

css/*SCSS*/ `
  .o-spreadsheet-print {
    .o-figure-border {
      border: 3px solid ${FIGURE_BORDER_COLOR} !important;
    }
  }
`;

export class SpreadsheetPrint extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetPrint";
  static components = { FiguresContainer };
  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  containerRef = useRef("container");

  setup() {
    useGridDrawing("canvas", this.env.model, () => this.props.canvasSize());
    onMounted(() => {
      window.print();
    });
  }

  get containerStyle() {
    const { width, height } = this.props.canvasSize();
    return cssPropertiesToCss({
      width: `${width}px`,
      height: `${height}px`,
    });
  }
}

SpreadsheetPrint.props = { canvasSize: Function };
