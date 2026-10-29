import {
  onWillStart,
  onWillUpdateProps,
  PluginInstance,
  providePlugins,
  usePlugin,
  useProps,
} from "@odoo/owl";
import { getCarouselLayout } from "../../helpers/carousel_helpers";
import { isDefined } from "../../helpers/misc";
import { LocalRendererPlugin, RendererPlugin } from "../../owl_plugins/renderer_plugin";
import { useLocalStore } from "../../store_engine/store_hooks";
import { PropsOf } from "../../types/props_of";
import { GridRenderingContext } from "../../types/rendering";
import { Store } from "../../types/store_engine";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { OSComponent } from "../os_component";
import { types } from "../props_validation";
import { CarouselDataViewPrint } from "./carousel_data_view_print";
import { FigureRendererStore } from "./figure_renderer_store";

export class StandaloneGridCanvas extends OSComponent {
  static template = "o-spreadsheet-StandaloneGridCanvas";
  static components = { CarouselDataViewPrint };

  protected props = useProps({
    sheetId: types.UID(),
    zone: types.Zone(),
    renderingCtx: types.object<Omit<GridRenderingContext, "ctx" | "thinLineWidth">>(),
    canvas: types.object<HTMLCanvasElement>(),
  });

  figureRendererStore!: Store<FigureRendererStore>;
  rendererPlugin!: PluginInstance<typeof RendererPlugin>;
  setup() {
    providePlugins([LocalRendererPlugin], { layers: ["Background", "Chart"] });
    this.rendererPlugin = usePlugin(LocalRendererPlugin);
    this.figureRendererStore = useLocalStore(FigureRendererStore, this.rendererPlugin);
    useGridDrawing({
      canvasRef: () => this.props.canvas,
      renderingCtx: () => this.props.renderingCtx,
      rendererPlugin: this.rendererPlugin,
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

  get carouselDataViews(): PropsOf<CarouselDataViewPrint>[] {
    const { sheetId, viewports } = this.props.renderingCtx;
    return viewports
      .getVisibleFigures(sheetId)
      .filter((figure) => figure.tag === "carousel")
      .map((figure) => {
        const carouselItem = this.model().getters.getSelectedCarouselItem(figure.id);
        if (carouselItem?.type !== "carouselDataView" || !carouselItem.range) {
          return undefined;
        }

        const carousel = this.model().getters.getCarousel(figure.id);
        const scroll = viewports.getViewportOffset(sheetId);
        const { x, y, width, height } = figure;
        const mainRect = { x: x - scroll.x, y: y - scroll.y, width, height };
        const layout = getCarouselLayout(mainRect, carousel, carouselItem);

        return {
          range: carouselItem.range,
          columnWeights: carouselItem.columnWeights,
          rect: layout.contentRect,
          rendererPlugin: this.rendererPlugin,
        };
      })
      .filter(isDefined);
  }
}
