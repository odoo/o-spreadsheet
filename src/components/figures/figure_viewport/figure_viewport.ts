import { Component, useEffect, useRef } from "@odoo/owl";
import { CANVAS_SHIFT } from "../../../constants";
import { Figure, OrderedLayers, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";
import { ShittyGridRenderer, ShittyRendererParams } from "./shitty_grid_renderer_store";

interface Props {
  figure: Figure;
  onFigureDeleted: () => void;
}

css/* scss */ `
  .o-viewport-figure {
    .o-handle {
      cursor: e-resize;
    }
  }
`;

export class ViewportFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ViewportFigure";
  static props = {
    figure: Object,
    onFigureDeleted: Function,
  };
  static components = {};

  private canvasRef = useRef("canvas");

  setup() {
    useEffect(() => {
      this.drawGrid();
    });
  }

  drawGrid() {
    const figureViewport = this.env.model.getters.getFigureViewport(
      this.env.model.getters.getActiveSheetId(),
      this.props.figure.id
    );
    console.log("figureViewport:", figureViewport);
    const canvas = this.canvasRef.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr;
    const renderingContext = {
      ctx,
      dpr,
      thinLineWidth,
    };
    const { width, height } = canvas.getBoundingClientRect();
    // const { width, height } = this.env.model.getters.getVisibleRect(figureViewport.zone);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    ctx.translate(-CANVAS_SHIFT, -CANVAS_SHIFT);
    ctx.scale(dpr, dpr);

    const renderer = new ShittyGridRenderer(this.env.model.getters, {
      ...figureViewport,
      size: this.props.figure,
      headerDimensions: this.headerDimensions,
    });

    for (const layer of OrderedLayers()) {
      renderer.drawLayer(renderingContext, layer);
    }
  }

  get headerDimensions(): ShittyRendererParams["headerDimensions"] {
    const { height, width } = this.canvasRef.el!.getBoundingClientRect();

    const zone = this.figureViewport.zone;
    const numberOfCols = zone.right - zone.left + 1;
    const numberOfRows = zone.bottom - zone.top + 1;

    const COL = {};
    // ADRM: if we're not using rounding, the grid lines starts to get blurry since we draw them in between pixels
    // but on the other hand we want to make sure the grid fills the whole figure
    let roundingError = 0;
    for (let col = zone.left; col <= zone.right; col++) {
      COL[col] = Math.round(width / numberOfCols);
      roundingError += width / numberOfCols - COL[col];
    }
    if (roundingError > 0) {
      COL[zone.right] += roundingError;
    }
    const ROW = {};
    roundingError = 0;
    for (let row = zone.top; row <= zone.bottom; row++) {
      ROW[row] = Math.round(height / numberOfRows);
      roundingError += height / numberOfRows - ROW[row];
    }
    if (roundingError > 0) {
      ROW[zone.bottom] += roundingError;
    }

    return { COL, ROW };
  }

  get figureViewport() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getFigureViewport(sheetId, this.props.figure.id);
  }
}
