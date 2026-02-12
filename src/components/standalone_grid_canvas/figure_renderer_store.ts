import {
  chartStyleToCellStyle,
  deepCopy,
  GridRenderingContext,
  Rect,
  UID,
} from "@odoo/o-spreadsheet-engine";
import {
  BACKGROUND_CHART_COLOR,
  DEFAULT_CAROUSEL_TITLE_STYLE,
  GRAY_400,
} from "@odoo/o-spreadsheet-engine/constants";
import { computeTextFont } from "../../helpers";
import { drawChartOnCanvas } from "../../helpers/figures/charts";
import { DisposableStore, Get, Store } from "../../store_engine";
import { ModelStore } from "../../stores";
import { RendererStore } from "../../stores/renderer_store";
import { FigureUI, RenderingGetters } from "../../types";

export interface HighlightProvider {
  highlights: Highlight[];
}

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

      if (!this.getters.isDashboard()) {
        ctx.strokeStyle = GRAY_400;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, figure.width, figure.height);
      }
    }
  }

  private drawChart(renderingCtx: GridRenderingContext, chartId: UID, rect: Rect) {
    const { x, y, width, height } = rect;
    const chartCanvas = new OffscreenCanvas(width, height);

    const chart = this.getters.getChart(chartId);
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
    const chartId = this.getters.getChartIdFromFigureId(figure.id);
    if (!carousel) {
      return;
    }
    const chartDefinition = chartId ? this.getters.getChartDefinition(chartId) : undefined;
    const title = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...carousel.title };
    const headerPadding = 4;
    const headerSize = title.fontSize + headerPadding * 2;

    if (!title.text && chartId) {
      const chartRect = { x, y, width: figure.width, height: figure.height };
      this.drawChart(renderingCtx, chartId, chartRect);
    } else if (title.text) {
      ctx.save();

      ctx.fillStyle = chartDefinition?.background || BACKGROUND_CHART_COLOR;
      ctx.fillRect(x, y, figure.width, headerSize);

      const font = computeTextFont(chartStyleToCellStyle(title));
      ctx.font = font;
      ctx.fillStyle = title.color;

      ctx.fillText(title.text, x + headerPadding, y + headerPadding + title.fontSize);
      ctx.restore();

      const chartRect = {
        x: x,
        y: y + headerSize,
        width: figure.width,
        height: figure.height - headerSize,
      };
      if (chartId) {
        this.drawChart(renderingCtx, chartId, chartRect);
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
}
