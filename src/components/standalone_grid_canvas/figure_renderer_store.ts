import { DEFAULT_CAROUSEL_TITLE_STYLE, GRAY_400 } from "../../constants";
import { getCarouselLayout } from "../../helpers/carousel_helpers";
import { drawChartOnCanvas } from "../../helpers/figures/charts/chart_ui_common";
import { chartStyleToCellStyle, deepCopy } from "../../helpers/misc";
import { computeTextFont } from "../../helpers/text_helper";
import { DisposableStore } from "../../store_engine/store";
import { ModelStore } from "../../stores/model_store";
import { RendererStore } from "../../stores/renderer_store";
import { FigureUI } from "../../types/figure";
import { RenderingGetters } from "../../types/getters";
import { UID } from "../../types/misc";
import { GridRenderingContext, Rect } from "../../types/rendering";
import { Get, Store } from "../../types/store_engine";

/** Store that draws the figures directly onto the canvas */
export class FigureRendererStore extends DisposableStore {
  mutators = ["addLoadedImage"] as const;

  private getters: RenderingGetters = this.get(ModelStore).getters;
  loadedImages: Record<string, ImageBitmap> = {};

  constructor(get: Get, private renderer: Store<RendererStore> = get(RendererStore)) {
    super(get);

    this.renderer.register(this);
    this.onDispose(() => {
      this.renderer.unRegister(this);
    });
  }

  get renderingLayers() {
    return ["Chart"] as const;
  }

  addLoadedImage(url: string, image: ImageBitmap) {
    this.loadedImages[url] = image;
  }

  drawLayer(renderingCtx: GridRenderingContext): void {
    const { viewports, ctx } = renderingCtx;
    const visibleFigures = viewports.getVisibleFigures(renderingCtx.sheetId);
    const scrollOffset = viewports.getViewportOffset(renderingCtx.sheetId);

    for (const figure of visibleFigures) {
      const figureRect = { ...figure, x: figure.x - scrollOffset.x, y: figure.y - scrollOffset.y };
      const { x, y, width, height } = figureRect;

      if (figure.tag === "chart") {
        const chartId = this.getters.getChartIdFromFigureId(figure.id);
        if (chartId) {
          this.drawChart(renderingCtx, chartId, figureRect);
        }
      } else if (figure.tag === "image") {
        const loadedImage = this.loadedImages[this.getters.getImagePath(figure.id)];
        if (loadedImage) {
          ctx.drawImage(loadedImage, x, y, width, height);
        }
      } else if (figure.tag === "carousel") {
        this.drawCarousel(renderingCtx, figure, figureRect);
      }

      if (!this.getters.isDashboard()) {
        ctx.strokeStyle = GRAY_400;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
      }
    }
  }

  private drawChart(renderingCtx: GridRenderingContext, chartId: UID, rect: Rect) {
    const { x, y, width, height } = rect;
    const chartCanvas = new OffscreenCanvas(width, height);

    const chart = this.getters.getChartDefinition(chartId);
    if (!chart) {
      return;
    }
    const runtime = deepCopy(this.getters.getChartRuntime(chartId));
    if ("chartJsConfig" in runtime && runtime.chartJsConfig.options) {
      runtime.chartJsConfig.options.devicePixelRatio = renderingCtx.dpr;
      runtime.chartJsConfig.options.responsive = false; // otherwise the canvas will be resized based on the DPR
    }

    const cleanUp = drawChartOnCanvas(chartCanvas, runtime, rect, chart.type);
    renderingCtx.ctx.drawImage(chartCanvas, x, y, width, height);
    cleanUp();
  }

  private drawCarousel(renderingCtx: GridRenderingContext, figure: FigureUI, figureRect: Rect) {
    const { ctx } = renderingCtx;

    const carousel = this.getters.getCarousel(figure.id);
    const chartId = this.getters.getChartIdFromFigureId(figure.id);
    if (!carousel) {
      return;
    }
    const selectedItem = this.getters.getSelectedCarouselItem(figure.id);
    const layout = getCarouselLayout(figureRect, carousel, selectedItem);
    const chartDefinition = chartId ? this.getters.getChartDefinition(chartId) : undefined;

    ctx.save();
    ctx.beginPath();
    ctx.rect(figureRect.x, figureRect.y, figureRect.width, figureRect.height);
    ctx.clip();

    ctx.fillStyle =
      chartDefinition?.background || this.getters.getSpreadsheetTheme().backgroundColor;
    ctx.fillRect(figureRect.x, figureRect.y, figureRect.width, figureRect.height);

    const title = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...carousel.title };
    if (title.text) {
      const style = chartStyleToCellStyle(title);
      ctx.font = computeTextFont(style, "px", 500);
      ctx.fillStyle = title.color;
      ctx.textBaseline = "middle";
      const textY = Math.ceil(layout.headerRect.y + layout.headerRect.height / 2);
      ctx.fillText(title.text, layout.headerRect.x, textY);
    }

    const separator = layout.separatorRect;
    if (separator) {
      ctx.fillStyle = GRAY_400;
      ctx.fillRect(separator.x, separator.y, separator.width, separator.height);
    }
    ctx.restore();

    if (chartId) {
      this.drawChart(renderingCtx, chartId, layout.contentRect);
    }
  }
}
