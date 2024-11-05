import { Component, useEffect, useRef } from "@odoo/owl";
import { CANVAS_SHIFT } from "../../../constants";
import { Store, useLocalStore } from "../../../store_engine";
import { Figure, OrderedLayers, SpreadsheetChildEnv } from "../../../types";
import { ShittyGridRenderer } from "./shitty_grid_renderer_store";

interface Props {
  figure: Figure;
  onFigureDeleted: () => void;
}

export class ViewportFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ViewportFigure";
  static props = {
    figure: Object,
    onFigureDeleted: Function,
  };
  static components = {};

  private canvasRef = useRef("canvas");
  private rendererStore!: Store<ShittyGridRenderer>;

  setup() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const figureViewport = this.env.model.getters.getFigureViewport(sheetId, this.props.figure.id);

    this.rendererStore = useLocalStore(ShittyGridRenderer, figureViewport);
    useEffect(() => {
      // const canvas = this.canvasRef.el as HTMLCanvasElement;
      // const ctx = canvas.getContext("2d")!;
      this.drawGrid();

      // // ctx.fillStyle = "#FF0000";
      // // ctx.fillRect(0, 0, canvas.width, canvas.height);
      // for (const layer of OrderedLayers()) {
      //   store["drawLayer"]({ ctx, dpr: 1, thinLineWidth: 1 }, layer);
      // }
      // // store["drawLayer"]({ ctx, dpr: 1, thinLineWidth: 1 }, OrderedLayers()[0]);
    });
  }

  drawGrid() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const figureViewport = this.env.model.getters.getFigureViewport(sheetId, this.props.figure.id);
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
    const { width, height } = this.props.figure;
    // const { width, height } = this.env.model.getters.getVisibleRect(figureViewport.zone);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    ctx.translate(-CANVAS_SHIFT, -CANVAS_SHIFT);
    ctx.scale(dpr, dpr);

    for (const layer of OrderedLayers()) {
      // @ts-ignore
      this.rendererStore.drawLayer(renderingContext, layer);
    }
  }
}
