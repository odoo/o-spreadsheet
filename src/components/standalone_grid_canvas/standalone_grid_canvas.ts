import { onWillStart, onWillUpdateProps, props, signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useLocalStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { PropsOf } from "../../types/props_of";
import { GridRenderingContext } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useModel } from "../owl_plugins/model_plugin";
import { types } from "../props_validation";
import { FigureRendererStore } from "./figure_renderer_store";

export class StandaloneGridCanvas extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneGridCanvas";

  protected props = props({
    sheetId: types.UID(),
    zone: types.Zone(),
    renderingCtx: types.object({}) as Omit<GridRenderingContext, "ctx" | "thinLineWidth">,
  });

  private canvasRef = signal<HTMLElement | null>(null);

  rendererStore!: Store<RendererStore>;
  figureRendererStore!: Store<FigureRendererStore>;

  private model = useModel();
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
    onWillUpdateProps(
      async (nextProps: PropsOf<StandaloneGridCanvas>) => await this.loadImages(nextProps)
    );
  }

  private async loadImages(props: PropsOf<StandaloneGridCanvas>) {
    const imagePaths = props.renderingCtx.viewports
      .getVisibleFigures(props.sheetId)
      .filter((figure) => figure.tag === "image")
      .map((figure) => this.model().getters.getImagePath(figure.id))
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
