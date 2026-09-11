import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
  DRAG_THRESHOLD,
} from "../../constants";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { drawChartOnCanvas } from "../../helpers/figures/charts/chart_ui_common";
import { clip } from "../../helpers/misc";
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
import { getMaxDimensions } from "./figure_drag_helper";

function getDefaultChartFigureSize(type: ChartDefinition["type"]): FigureSize {
  if (type === "scorecard") {
    return { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT };
  }
  return { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
}

export function getOverlappedFigure(
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
  const getters = env.model.getters;
  const viewStore = env.getStore(ViewportsStore);
  const sheetId = getters.getActiveSheetId();
  const zoom = env.getStore(ZoomStore).zoomLevel;
  const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
  const maxDimensions = getMaxDimensions(sheetId, getters);
  const gridRect = gridOverlayPosition(zoom);
  const gridLeft = gridRect.x / zoom;
  const gridTop = gridRect.y / zoom;
  const gridWidth = gridRect.width / zoom;
  const gridHeight = gridRect.height / zoom;
  const maxScrollValue = maxDimensions.maxY - gridHeight;
  const spreadsheet = document.querySelector(".o-spreadsheet") as HTMLElement | null;
  if (!spreadsheet) {
    return;
  }
  const figureSize = getDefaultChartFigureSize(definition.type);
  const halfWidth = figureSize.width / 2;
  const halfHeight = figureSize.height / 2;

  let container: HTMLDivElement | null = null;
  let destroyChart: (() => void) | undefined = undefined;
  const chartDragStore = env.getStore(ChartDragStore);
  const previousCursor = document.body.style.cursor;
  document.body.style.cursor = "grabbing";

  const otherFigures = viewStore.visibleFigures;

  const getGridPosition = (
    x: number,
    y: number,
    scroll: { scrollX: number; scrollY: number }
  ): PixelPosition | undefined => {
    if (x > gridLeft + gridWidth || y > gridTop + gridHeight) {
      return undefined;
    }
    return {
      x: Math.max(0, x - gridLeft + scroll.scrollX),
      y: Math.max(0, y - gridTop + scroll.scrollY),
    };
  };

  const clampFigurePosition = (
    position: PixelPosition,
    scroll: { scrollX: number; scrollY: number }
  ): PixelPosition => {
    const { scrollX, scrollY } = scroll;
    const isFooterVisible = scrollY >= maxScrollValue;
    const overScroll = isFooterVisible
      ? scrollY - maxScrollValue
      : Math.max(-figureSize.height, scrollY - maxScrollValue);
    const minTop = gridTop - scrollY;
    const maxTop = gridTop + gridHeight - overScroll - figureSize.height;
    return {
      x: Math.max(gridLeft - scrollX, position.x),
      y: clip(position.y, minTop, maxTop),
    };
  };

  const onMouseMove = (ev: MouseEvent) => {
    const currentMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const offsetX = Math.abs(currentMousePosition.x - initialMousePosition.x);
    const offsetY = Math.abs(currentMousePosition.y - initialMousePosition.y);
    if (offsetX <= DRAG_THRESHOLD && offsetY <= DRAG_THRESHOLD) {
      return;
    }
    const { scrollX, scrollY } = viewStore.activeSheetScrollInfo;
    const figurePosition = clampFigurePosition(
      {
        x: currentMousePosition.x - halfWidth,
        y: currentMousePosition.y - halfHeight,
      },
      { scrollX, scrollY }
    );
    if (container === null) {
      container = document.createElement("div");
      container.className = "o-chart-drag-preview os-theme-dependant position-fixed border pe-none";
      container.style.width = `${figureSize.width}px`;
      container.style.height = `${figureSize.height}px`;
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
      destroyChart = drawChartOnCanvas(
        canvas,
        runtime,
        { width: figureSize.width, height: figureSize.height },
        definition.type,
        zoom
      );
    }

    container.style.left = `${figurePosition.x}px`;
    container.style.top = `${figurePosition.y}px`;

    const position = getGridPosition(figurePosition.x, figurePosition.y, { scrollX, scrollY });
    let overlappedFigure: FigureUI | undefined = undefined;
    if (position) {
      const figureUI = {
        tag: "chart",
        ...position,
        width: figureSize.width,
        height: figureSize.height,
      };
      overlappedFigure = getOverlappedFigure(figureUI, otherFigures, ["carousel", "chart"]);
    }
    container.style.opacity = overlappedFigure?.id ? "0.6" : "0.9";
    chartDragStore.setHighlightedFigure(overlappedFigure?.id);
  };

  const onMouseUp = (ev: MouseEvent) => {
    const currentMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const offsetX = Math.abs(currentMousePosition.x - initialMousePosition.x);
    const offsetY = Math.abs(currentMousePosition.y - initialMousePosition.y);
    chartDragStore.setHighlightedFigure(undefined);
    if (container !== null) {
      spreadsheet.removeChild(container);
      container = null;
    }
    destroyChart?.();
    document.body.style.cursor = previousCursor;

    const { scrollX, scrollY } = viewStore.activeSheetScrollInfo;
    const figurePosition = clampFigurePosition(
      { x: currentMousePosition.x - halfWidth, y: currentMousePosition.y - halfHeight },
      { scrollX, scrollY }
    );
    let position = getGridPosition(figurePosition.x, figurePosition.y, { scrollX, scrollY });
    if (offsetX <= DRAG_THRESHOLD && offsetY <= DRAG_THRESHOLD) {
      position = { x: 0, y: 0 };
    } else if (!position || position.x + halfWidth > gridWidth + scrollX) {
      return;
    }

    const { col, row, offset } = viewStore.viewports.getPositionAnchorOffset(sheetId, position);
    const payload = {
      chartId: UuidGenerator.smallUuid(),
      figureId: UuidGenerator.smallUuid(),
      sheetId,
      size: { width: figureSize.width, height: figureSize.height },
      definition,
      col,
      row,
      offset,
    };
    const figureUI = {
      tag: "chart",
      ...position,
      width: figureSize.width,
      height: figureSize.height,
    };
    const overlappedFigure = getOverlappedFigure(figureUI, otherFigures, ["carousel", "chart"]);
    if (overlappedFigure?.tag === "carousel") {
      env.model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
        sheetId,
        figureId: overlappedFigure.id,
        newChartId: UuidGenerator.smallUuid(),
        chartDefinition: definition,
      });
    } else if (overlappedFigure?.tag === "chart") {
      env.model.dispatch("CREATE_CHART_AND_MERGE_INTO_CAROUSEL", {
        chartId: payload.chartId,
        figureId: payload.figureId,
        sheetId: payload.sheetId,
        definition: payload.definition,
        baseFigureId: overlappedFigure.id,
      });
    } else {
      env.model.dispatch("CREATE_CHART", payload);
    }
  };

  startDnd(onMouseMove, onMouseUp);
}
