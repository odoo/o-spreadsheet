import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
  DRAG_THRESHOLD,
} from "../../constants";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { drawChartOnCanvas } from "../../helpers/figures/charts/chart_ui_common";
import { UuidGenerator } from "../../helpers/uuid";
import { ChartDragStore } from "../../stores/chart_drag_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { ZoomStore } from "../../stores/zoom_store";
import { ChartDefinition } from "../../types/chart/chart";
import { FigureSize, FigureUI } from "../../types/figure";
import { PixelPosition } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { gridOverlayPosition } from "./dom_helpers";
import { startDnd } from "./drag_and_drop";

function getDefaultChartFigureSize(type: ChartDefinition["type"]): FigureSize {
  if (type === "scorecard") {
    return { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT };
  }
  return { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
}

export function getCarouselOverlappingChart(
  figureUI: { tag: string; x: number; y: number; width: number; height: number },
  otherFigures: FigureUI[],
  matchTags: FigureUI["tag"][]
): FigureUI | undefined {
  if (figureUI.tag !== "chart") {
    return undefined;
  }

  const figureCenterX = figureUI.x + figureUI.width / 2;
  const figureCenterY = figureUI.y + figureUI.height / 2;

  let bestMatch: FigureUI | undefined;
  let smallestDistance = Infinity;

  for (const figure of otherFigures) {
    if (!matchTags.includes(figure.tag)) {
      continue;
    }
    const targetCenterX = figure.x + figure.width / 2;
    const targetCenterY = figure.y + figure.height / 2;

    const distanceX = Math.abs(figureCenterX - targetCenterX);
    const distanceY = Math.abs(figureCenterY - targetCenterY);
    const squaredDistance = distanceX ** 2 + distanceY ** 2;

    if (
      distanceX <= figureUI.width / 2 &&
      distanceY <= figureUI.height / 2 &&
      squaredDistance < smallestDistance
    ) {
      smallestDistance = squaredDistance;
      bestMatch = figure;
    }
  }

  return bestMatch;
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
  const zoom = env.getStore(ZoomStore).zoomLevel;
  const gridPosition = gridOverlayPosition(zoom);
  const spreadsheet = document.querySelector(".o-spreadsheet") as HTMLElement | null;
  if (!spreadsheet) {
    return;
  }
  const startX = ev.clientX / zoom;
  const startY = ev.clientY / zoom;
  const { width, height } = getDefaultChartFigureSize(definition.type);
  const figureWidth = width * zoom;
  const figureHeight = height * zoom;

  const getters = env.model.getters;
  const sheetId = getters.getActiveSheetId();

  let container: HTMLDivElement | null = null;
  let destroyChart: (() => void) | undefined = undefined;

  const chartDragStore = env.getStore(ChartDragStore);
  const previousCursor = document.body.style.cursor;
  document.body.style.cursor = "grabbing";

  /** Grid coordinates (in sheet pixels) of a mouse position, or undefined if outside the grid. */
  const getGridPosition = (clientX: number, clientY: number): PixelPosition | undefined => {
    if (
      clientX > gridPosition.x + gridPosition.width ||
      clientY > gridPosition.y + gridPosition.height
    ) {
      return undefined;
    }
    const { scrollX, scrollY } = env.getStore(ViewportsStore).activeSheetScrollInfo;
    return {
      x: Math.max(0, (clientX - gridPosition.x) / zoom + scrollX),
      y: Math.max(0, (clientY - gridPosition.y) / zoom + scrollY),
    };
  };

  /** Carousel or standalone chart the dragged chart is dropped onto, if any. */
  const getOverlappingFigure = (clientX: number, clientY: number) => {
    const position = getGridPosition(clientX, clientY);
    if (!position) {
      return undefined;
    }
    const figureUI = { tag: "chart", ...position, width, height };
    const otherFigures = env.getStore(ViewportsStore).visibleFigures;
    return getCarouselOverlappingChart(figureUI, otherFigures, ["carousel", "chart"]);
  };

  const halfWidth = figureWidth / 2;
  const halfHeight = figureHeight / 2;

  const onMouseMove = (e: MouseEvent) => {
    if (
      Math.abs(e.clientX - startX) <= DRAG_THRESHOLD &&
      Math.abs(e.clientY - startY) <= DRAG_THRESHOLD
    ) {
      return;
    }

    if (container === null) {
      container = document.createElement("div");
      container.className = "o-chart-drag-preview os-theme-dependant position-fixed border pe-none";
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.zoom = `${zoom}`;
      const canvas = document.createElement("canvas");
      canvas.className = "w-100 h-100";
      container.appendChild(canvas);
      spreadsheet.appendChild(container);

      const runtime = SpreadsheetChart.fromStrDefinition(getters, sheetId, definition).getRuntime(
        getters,
        "newChart",
        getters.getSpreadsheetTheme().colorThemeName
      );
      destroyChart = drawChartOnCanvas(canvas, runtime, { width, height }, definition.type, zoom);
    }

    container.style.left = `${Math.max(gridPosition.x, (e.clientX - halfWidth) / zoom)}px`;
    container.style.top = `${Math.max(gridPosition.y, (e.clientY - halfHeight) / zoom)}px`;

    const overlappingFigure = getOverlappingFigure(e.clientX - halfWidth, e.clientY - halfHeight);
    container.style.opacity = overlappingFigure?.id ? "0.6" : "0.9";
    chartDragStore.setHighlightedFigure(overlappingFigure?.id);
  };

  const onMouseUp = (mouseEvent: MouseEvent) => {
    chartDragStore.setHighlightedFigure(undefined);
    if (container !== null) {
      spreadsheet.removeChild(container);
      container = null;
    }
    destroyChart?.();
    document.body.style.cursor = previousCursor;

    let position = getGridPosition(mouseEvent.clientX - halfWidth, mouseEvent.clientY - halfHeight);
    if (
      Math.abs(mouseEvent.clientX / zoom - startX) <= DRAG_THRESHOLD &&
      Math.abs(mouseEvent.clientY / zoom - startY) <= DRAG_THRESHOLD
    ) {
      position = { x: 0, y: 0 };
    } else if (!position || position.x + halfWidth > gridPosition.width) {
      return;
    }

    const { col, row, offset } = env
      .getStore(ViewportsStore)
      .viewports.getPositionAnchorOffset(sheetId, position);
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
    const overlappingFigure = getOverlappingFigure(
      mouseEvent.clientX - halfWidth,
      mouseEvent.clientY - halfHeight
    );
    if (overlappingFigure?.tag === "carousel") {
      env.model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
        sheetId,
        figureId: overlappingFigure.id,
        newChartId: UuidGenerator.smallUuid(),
        chartDefinition: definition,
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
