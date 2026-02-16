import { GridRenderingContext, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillStart, onWillUpdateProps, useRef } from "@odoo/owl";
import { Store, useLocalStore } from "../../store_engine";
import { RendererStore } from "../../stores/renderer_store";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { FigureRendererStore } from "./figure_renderer_store";

interface Props {
  sheetId: UID;
  zone: Zone;
  renderingCtx: Partial<GridRenderingContext>;
}

/** Increase the canvas' dpr on print so the image is of better quality */
const PRINT_DPR = 3;

export class StandaloneGridCanvas extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneGridCanvas";
  static props = {
    sheetId: String,
    zone: Object,
    renderingCtx: Object,
  };

  canvasRef = useRef("canvas");

  rendererStore!: Store<RendererStore>;
  figureRendererStore!: Store<FigureRendererStore>;

  setup() {
    this.rendererStore = useLocalStore(RendererStore, ["Background", "Chart", "Headers"]);
    this.figureRendererStore = useLocalStore(FigureRendererStore, this.rendererStore);
    useGridDrawing({
      refName: "canvas",
      model: this.env.model,
      dpr: PRINT_DPR,
      partialRenderingCtx: () => this.props.renderingCtx,
      rendererStore: this.rendererStore,
      changeCanvasSizeOnZoom: true,
    });
    onWillStart(async () => await this.loadImages(this.props));
    onWillUpdateProps(async (nextProps: Props) => await this.loadImages(nextProps));
  }

  private async loadImages(props: Props) {
    const sheetView =
      props.renderingCtx.viewports || this.env.model.getters.getViewportCollection();

    const imagePaths = sheetView
      .getVisibleFigures(props.sheetId)
      .filter((figure) => figure.tag === "image")
      .map((figure) => this.env.model.getters.getImagePath(figure.id))
      .filter((path) => path && !this.figureRendererStore.loadedImages[path]);

    await Promise.all(
      imagePaths.map(async (path) => {
        const response = await fetch(path);
        const blob = await response.blob();
        this.figureRendererStore.addLoadedImage(path, await createImageBitmap(blob));
      })
    );
  }
}
