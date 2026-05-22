import { onWillStart, onWillUpdateProps, signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useLocalStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { UID, Zone } from "../../types/misc";
import { GridRenderingContext } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { FigureRendererStore } from "./figure_renderer_store";

interface Props {
  sheetId: UID;
  zone: Zone;
  renderingCtx: Omit<GridRenderingContext, "ctx" | "thinLineWidth">;
}

export class StandaloneGridCanvas extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneGridCanvas";
  static props = {
    sheetId: String,
    zone: Object,
    renderingCtx: Object,
  };

  private canvasRef = signal<HTMLElement | null>(null);

  rendererStore!: Store<RendererStore>;
  figureRendererStore!: Store<FigureRendererStore>;

  setup() {
    this.rendererStore = useLocalStore(RendererStore, ["Background", "Chart"]);
    this.figureRendererStore = useLocalStore(FigureRendererStore, this.rendererStore);
    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => this.props.renderingCtx,
      rendererStore: this.rendererStore,
      changeCanvasSizeOnZoom: true,
    });
    onWillStart(async () => await this.loadImages(this.props));
    onWillUpdateProps(async (nextProps: Props) => await this.loadImages(nextProps));
  }

  private async loadImages(props: Props) {
    const imagePaths = props.renderingCtx.viewports
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
