import type { Chart } from "chart.js/auto";
import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
} from "../../constants";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { drawGaugeChart } from "../../helpers/figures/charts/gauge_chart_rendering";
import { drawScoreChart } from "../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../helpers/figures/charts/scorecard_chart_config_builder";
import { UuidGenerator } from "../../helpers/uuid";
import { ChartDefinition } from "../../types/chart/chart";
import { GaugeChartRuntime } from "../../types/chart/gauge_chart";
import { ScorecardChartRuntime } from "../../types/chart/scorecard_chart";
import { FigureSize } from "../../types/figure";
import { PixelPosition } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { getCarouselOverlappingChart } from "../figures/figure_container/figure_container";
import { startDnd } from "./drag_and_drop";

const DRAG_MOVE_THRESHOLD = 5;

function getChartFigureSize(type: ChartDefinition["type"]): FigureSize {
  if (type === "scorecard") {
    return { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT };
  }
  return { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
}

/**
 * Start dragging a floating preview of the given chart definition, following the mouse.
 * On drop, creates the chart on the grid (or inside a carousel if dropped on one).
 */
export function startChartDragAndDrop(
  env: SpreadsheetChildEnv,
  definition: ChartDefinition,
  ev: MouseEvent
) {
  const gridOverlay = document.querySelector(".o-grid-overlay") as HTMLElement | null;
  const spreadsheet = document.querySelector(".o-spreadsheet") as HTMLElement | null;
  if (!gridOverlay || !spreadsheet) {
    return;
  }

  const zoom = env.model.getters.getViewportZoomLevel();
  const dpr = typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;
  const startX = ev.clientX / zoom;
  const startY = ev.clientY / zoom;
  const { width, height } = getChartFigureSize(definition.type);
  const figureWidth = (width * zoom) / dpr;
  const figureHeight = (height * zoom) / dpr;

  const getters = env.model.getters;
  const sheetId = getters.getActiveSheetId();
  const runtime = SpreadsheetChart.fromStrDefinition(getters, sheetId, definition).getRuntime(
    getters,
    "newChart"
  );

  const container = document.createElement("div");
  container.className = "o-chart-drag-preview";
  container.style.display = "none";
  container.style.width = `${figureWidth}px`;
  container.style.height = `${figureHeight}px`;
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  spreadsheet.appendChild(container);

  let chart: Chart | undefined;
  switch (definition.type) {
    case "scorecard": {
      const design = getScorecardConfiguration(
        { width: width / dpr, height: height / dpr },
        runtime as ScorecardChartRuntime
      );
      drawScoreChart(design, canvas, zoom);
      break;
    }
    case "gauge": {
      drawGaugeChart(canvas, runtime as GaugeChartRuntime, zoom, {
        width: figureWidth,
        height: figureHeight,
      });
      break;
    }
    default: {
      const ctx = canvas.getContext("2d");
      if (!ctx || !("chartJsConfig" in runtime)) {
        return;
      }
      canvas.style.zoom = `${zoom}`;
      //@ts-ignore chartJsConfig's union of ChartConfiguration<type> is too complex for TS to narrow
      chart = new globalThis.Chart!(ctx, runtime.chartJsConfig);
      break;
    }
  }

  let highlightedCarouselEl: Element | null = null;
  const highlightCarousel = (figureId: string | undefined) => {
    highlightedCarouselEl?.classList.remove("o-add-to-carousel");
    highlightedCarouselEl = figureId
      ? document.querySelector(`[data-id="${figureId}"].o-figure`)
      : null;
    highlightedCarouselEl?.classList.add("o-add-to-carousel");
  };

  /** Grid coordinates (in sheet pixels) of a mouse position, or undefined if outside the grid. */
  const getGridPosition = (clientX: number, clientY: number): PixelPosition | undefined => {
    const gridRect = gridOverlay.getBoundingClientRect();
    if (
      clientX < gridRect.left ||
      clientX > gridRect.right ||
      clientY < gridRect.top ||
      clientY > gridRect.bottom
    ) {
      return undefined;
    }
    const { scrollX, scrollY } = env.model.getters.getActiveSheetScrollInfo();
    return {
      x: (clientX - gridRect.left) / zoom + scrollX,
      y: (clientY - gridRect.top) / zoom + scrollY,
    };
  };

  /** Carousel or standalone chart the dragged chart is dropped onto, if any. */
  const getOverlappingFigure = (clientX: number, clientY: number) => {
    const position = getGridPosition(clientX, clientY);
    if (!position) {
      return undefined;
    }
    const figureUI = { tag: "chart", ...position, width, height };
    const otherFigures = env.model.getters.getVisibleFigures();
    return getCarouselOverlappingChart(figureUI, otherFigures, ["carousel", "chart"]);
  };

  const onMouseMove = (e: MouseEvent) => {
    container.style.left = `${e.clientX}px`;
    container.style.top = `${e.clientY}px`;
    if (
      container.style.display === "none" &&
      (Math.abs(e.clientX - startX) > DRAG_MOVE_THRESHOLD ||
        Math.abs(e.clientY - startY) > DRAG_MOVE_THRESHOLD)
    ) {
      container.style.display = "block";
    }
    highlightCarousel(getOverlappingFigure(e.clientX, e.clientY)?.id);
  };

  const onMouseUp = (mouseEvent: MouseEvent) => {
    highlightCarousel(undefined);
    spreadsheet.removeChild(container);
    chart?.destroy();

    const position = getGridPosition(mouseEvent.clientX, mouseEvent.clientY);
    if (!position) {
      return;
    }

    const { col, row, offset } = env.model.getters.getPositionAnchorOffset(position);
    const payload = {
      chartId: UuidGenerator.smallUuid(),
      figureId: UuidGenerator.smallUuid(),
      sheetId,
      size: { width, height },
      definition,
      col,
      row,
      offset,
    };
    const overlappingFigure = getOverlappingFigure(mouseEvent.clientX, mouseEvent.clientY);
    if (overlappingFigure?.tag === "carousel") {
      env.model.dispatch("CREATE_CHART_INTO_CAROUSEL", {
        ...payload,
        carouselId: overlappingFigure.id,
      });
    } else if (overlappingFigure?.tag === "chart") {
      env.model.dispatch("CREATE_CHART_AND_MERGE_INTO_CAROUSEL", {
        chartId: payload.chartId,
        figureId: payload.figureId,
        sheetId: payload.sheetId,
        definition: payload.definition,
        baseFigureId: overlappingFigure.id,
      });
    } else {
      env.model.dispatch("CREATE_CHART", payload);
    }
  };

  startDnd(onMouseMove, onMouseUp);
}
