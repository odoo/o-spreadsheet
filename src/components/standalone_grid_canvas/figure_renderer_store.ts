import { DEFAULT_CAROUSEL_TITLE_STYLE, GRAY_400 } from "../../constants";
import { drawChartOnCanvas } from "../../helpers/figures/charts/chart_ui_common";
import { chartStyleToCellStyle, deepCopy } from "../../helpers/misc";
import { computeTextFont } from "../../helpers/text_helper";
import { toZone } from "../../helpers/zones";
import { DisposableStore } from "../../store_engine/store";
import { DataLayerRenderer } from "../../stores/data_layer_renderer_store";
import { ModelStore } from "../../stores/model_store";
import { RendererStore } from "../../stores/renderer_store";
import { Carousel, CarouselItem, FigureUI } from "../../types/figure";
import { RenderingGetters } from "../../types/getters";
import { UID } from "../../types/misc";
import { GridRenderingContext, Rect } from "../../types/rendering";
import { Get, Store } from "../../types/store_engine";

/** Store that draws the figures directly onto the canvas */
export class FigureRendererStore extends DisposableStore {
  mutators = ["addLoadedImage"] as const;

  private getters: RenderingGetters = this.get(ModelStore).getters;
  private dataLayerRenderer: Store<DataLayerRenderer>;
  loadedImages: Record<string, ImageBitmap> = {};

  constructor(get: Get, private renderer: Store<RendererStore> = get(RendererStore)) {
    super(get);
    this.dataLayerRenderer = get(DataLayerRenderer);

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
    const { x: offsetX, y: offsetY } = viewports.getViewportOffset(renderingCtx.sheetId);

    for (const figure of visibleFigures) {
      const x = figure.x - offsetX;
      const y = figure.y - offsetY;

      if (figure.tag === "chart") {
        const chartId = this.getters.getChartIdFromFigureId(figure.id);
        if (chartId) {
          const chartRect = { x, y, width: figure.width, height: figure.height };
          this.drawChart(renderingCtx, chartId, chartRect);
        }
      } else if (figure.tag === "image") {
        const loadedImage = this.loadedImages[this.getters.getImagePath(figure.id)];
        if (loadedImage) {
          ctx.drawImage(loadedImage, x, y, figure.width, figure.height);
        }
      } else if (figure.tag === "carousel") {
        this.drawCarousel(renderingCtx, figure);
      }

      const isRowCarousel =
        figure.tag === "carousel" && this.getters.getCarousel(figure.id)?.layout === "row";
      if (this.getters.isDashboard() && !isRowCarousel) {
        this.drawDashboardFigureBorder(ctx, x, y, figure.width, figure.height);
      } else if (!this.getters.isDashboard()) {
        ctx.strokeStyle = GRAY_400;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, figure.width, figure.height);
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

  private drawCarousel(renderingCtx: GridRenderingContext, figure: FigureUI) {
    const { viewports: sheetView, ctx } = renderingCtx;
    const { x: offsetX, y: offsetY } = sheetView.getViewportOffset(renderingCtx.sheetId);

    const x = figure.x - offsetX;
    const y = figure.y - offsetY;

    const carousel = this.getters.getCarousel(figure.id);
    if (!carousel) {
      return;
    }

    if (carousel.layout === "row") {
      this.drawCarouselRow(renderingCtx, figure, carousel, x, y);
      return;
    }

    const selectedItem = this.getters.getSelectedCarouselItem(figure.id);
    const chartId = this.getters.getChartIdFromFigureId(figure.id);
    const chartDefinition = chartId ? this.getters.getChartDefinition(chartId) : undefined;
    const title = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...carousel.title };
    const headerPadding = 4;
    const headerSize = title.fontSize + headerPadding * 2;

    const headerBackground =
      chartDefinition?.background || this.getters.getSpreadsheetTheme().backgroundColor;

    if (!title.text && chartId) {
      const chartRect = { x, y, width: figure.width, height: figure.height };
      this.drawChart(renderingCtx, chartId, chartRect);
    } else if (!title.text && selectedItem?.type === "dataLayer") {
      const contentRect = { x, y, width: figure.width, height: figure.height };
      this.drawDataLayer(ctx, selectedItem, contentRect, headerBackground);
    } else if (title.text) {
      ctx.save();

      ctx.fillStyle = headerBackground;
      ctx.fillRect(x, y, figure.width, headerSize);

      const font = computeTextFont(chartStyleToCellStyle(title));
      ctx.font = font;
      ctx.fillStyle = title.color;

      ctx.fillText(title.text, x + headerPadding, y + headerPadding + title.fontSize);
      ctx.restore();

      const contentRect = {
        x: x,
        y: y + headerSize,
        width: figure.width,
        height: figure.height - headerSize,
      };
      if (chartId) {
        this.drawChart(renderingCtx, chartId, contentRect);
      } else if (selectedItem?.type === "dataLayer") {
        this.drawDataLayer(ctx, selectedItem, contentRect, headerBackground);
      } else if (!this.getters.isDashboard()) {
        // Border below the carousel header for data view
        ctx.strokeStyle = GRAY_400;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + headerSize);
        ctx.lineTo(x + figure.width, y + headerSize);
        ctx.stroke();
      }
    }
  }

  private drawCarouselRow(
    renderingCtx: GridRenderingContext,
    figure: FigureUI,
    carousel: Carousel,
    x: number,
    y: number
  ) {
    const { ctx } = renderingCtx;
    const title = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...carousel.title };
    const headerPadding = 4;
    const headerSize = title.text ? title.fontSize + headerPadding * 2 : 0;

    if (title.text) {
      ctx.save();
      ctx.fillStyle = this.getters.getSpreadsheetTheme().backgroundColor;
      ctx.fillRect(x, y, figure.width, headerSize);

      const font = computeTextFont(chartStyleToCellStyle(title));
      ctx.font = font;
      ctx.fillStyle = title.color;
      ctx.fillText(title.text, x + headerPadding, y + headerPadding + title.fontSize);
      ctx.restore();
    }

    const items = carousel.items;
    if (items.length === 0) {
      return;
    }
    const gap = 16;
    const totalGap = gap * (items.length - 1);
    const itemWidth = (figure.width - totalGap) / items.length;
    const contentY = y + headerSize;
    const contentHeight = figure.height - headerSize;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemX = x + i * (itemWidth + gap);
      const itemRect = { x: itemX, y: contentY, width: itemWidth, height: contentHeight };

      if (item.type === "chart") {
        this.drawChart(renderingCtx, item.chartId, itemRect);
      } else if (item.type === "dataLayer") {
        this.drawDataLayer(ctx, item, itemRect);
      }

      if (this.getters.isDashboard()) {
        this.drawDashboardFigureBorder(ctx, itemX, contentY, itemWidth, contentHeight);
      }
    }
  }

  private drawDashboardFigureBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const radius = 8;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.strokeStyle = "#D0D0D0";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawDataLayer(
    ctx: CanvasRenderingContext2D,
    item: CarouselItem & { type: "dataLayer" },
    rect: Rect,
    paddingBackground?: string
  ) {
    const zone = toZone(item.rangeXc);
    this.dataLayerRenderer.render(ctx, item.sheetId, zone, rect, {
      paddingBackground,
      hideGridLines: this.getters.isDashboard(),
      hideFilterIcons: true,
    });
  }
}
