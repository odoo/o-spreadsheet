import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
  DRAG_THRESHOLD,
} from "../../constants";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { drawChartOnCanvas } from "../../helpers/figures/charts/chart_ui_common";
import { centerFigurePosition } from "../../helpers/figures/figure/figure";
import { clip } from "../../helpers/misc";
import { UuidGenerator } from "../../helpers/uuid";
import { ChartDragStore } from "../../stores/chart_drag_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { ZoomStore } from "../../stores/zoom_store";
import { ChartDefinition } from "../../types/chart/chart";
import { DispatchResult } from "../../types/commands";
import { AnchorOffset, FigureSize, FigureUI } from "../../types/figure";
import { PixelPosition } from "../../types/misc";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";
import { gridOverlayPosition } from "./dom_helpers";
import { startDnd } from "./drag_and_drop";
import { getSheetEndCoordinates } from "./figure_drag_helper";

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
  env: SpreadsheetActionEnv,
  definition: ChartDefinition,
  ev: PointerEvent
) {
  if (ev.button !== 0) {
    return;
  }
  const getters = env.model().getters;
  const viewStore = env.getStore(ViewportsStore);
  const sheetId = getters.getActiveSheetId();
  const zoom = env.getStore(ZoomStore).zoomLevel;
  const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
  const maxDimensions = getSheetEndCoordinates(sheetId, getters);
  const gridRect = gridOverlayPosition();
  const gridLeft = gridRect.x / zoom;
  const gridTop = gridRect.y / zoom;
  const gridWidth = gridRect.width / zoom;
  const gridHeight = gridRect.height / zoom;
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
  const chartId = UuidGenerator.smallUuid();

  const getDragInfo = (ev: PointerEvent) => {
    const mouseX = ev.clientX / zoom;
    const mouseY = ev.clientY / zoom;
    if (
      Math.abs(mouseX - initialMousePosition.x) <= DRAG_THRESHOLD &&
      Math.abs(mouseY - initialMousePosition.y) <= DRAG_THRESHOLD
    ) {
      return undefined;
    }
    const figurePosition = {
      x: Math.max(gridLeft, mouseX - halfWidth),
      y: clip(mouseY - halfHeight, gridTop, gridTop + gridHeight - figureSize.height),
    };
    if (figurePosition.x > gridLeft + gridWidth || figurePosition.y > gridTop + gridHeight) {
      return { figurePosition };
    }
    const { scrollX, scrollY } = viewStore.activeSheetScrollInfo;
    const position: PixelPosition = {
      x: Math.max(0, figurePosition.x - gridLeft + scrollX),
      y: Math.max(0, figurePosition.y - gridTop + scrollY),
    };
    const overlappedFigure = getOverlappedFigure(
      { tag: "chart", ...position, ...figureSize },
      otherFigures,
      ["carousel", "chart"]
    );
    return { figurePosition, position, overlappedFigure };
  };

  const onPointerMove = (ev: PointerEvent) => {
    const dragInfo = getDragInfo(ev);
    if (!dragInfo) {
      return;
    }
    const { figurePosition, overlappedFigure } = dragInfo;
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
      destroyChart = drawChartOnCanvas(canvas, runtime, figureSize, definition.type, zoom);
    }

    container.style.left = `${figurePosition.x}px`;
    container.style.top = `${figurePosition.y}px`;
    container.style.opacity = overlappedFigure ? "0.6" : "0.9";
    chartDragStore.setHighlightedFigure(overlappedFigure?.id);
  };

  const createChart = (anchor: AnchorOffset) =>
    env.model().dispatch("CREATE_CHART", {
      chartId,
      figureId: UuidGenerator.smallUuid(),
      sheetId,
      size: figureSize,
      definition,
      ...anchor,
    });

  const dropChart = (ev: PointerEvent): DispatchResult | undefined => {
    const dragInfo = getDragInfo(ev);
    if (!dragInfo) {
      return createChart(centerFigurePosition(env, figureSize));
    }
    const { position, overlappedFigure } = dragInfo;
    const { scrollX } = viewStore.activeSheetScrollInfo;
    if (!position || position.x + halfWidth > Math.min(gridWidth + scrollX, maxDimensions.maxX)) {
      return undefined;
    }
    switch (overlappedFigure?.tag) {
      case "carousel":
        return env.model().dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
          sheetId,
          figureId: overlappedFigure.id,
          newChartId: chartId,
          chartDefinition: definition,
        });
      case "chart":
        return env.model().dispatch("CREATE_CHART_AND_MERGE_INTO_CAROUSEL", {
          chartId,
          figureId: UuidGenerator.smallUuid(),
          sheetId,
          definition,
          baseFigureId: overlappedFigure.id,
        });
      default:
        const clampedPosition = {
          x: Math.min(position.x, maxDimensions.maxX - figureSize.width),
          y: Math.min(position.y, maxDimensions.maxY - figureSize.height),
        };
        return createChart(viewStore.viewports.getPositionAnchorOffset(sheetId, clampedPosition));
    }
  };

  const onPointerUp = (ev: PointerEvent) => {
    chartDragStore.setHighlightedFigure(undefined);
    container?.remove();
    container = null;
    destroyChart?.();
    document.body.style.cursor = previousCursor;

    if (dropChart(ev)?.isSuccessful) {
      const figureId = getters.getFigureIdFromChartId(chartId);
      env.model().dispatch("SELECT_FIGURE", { figureId });
    }
  };

  startDnd(onPointerMove, onPointerUp);
}
