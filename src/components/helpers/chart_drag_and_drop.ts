import { onMounted, onWillDestroy, signal, types, usePlugin, useProps, xml } from "@odoo/owl";
import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
} from "../../constants";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { drawChartOnCanvas } from "../../helpers/figures/charts/chart_ui_common";
import { UuidGenerator } from "../../helpers/uuid";
import { ModelPlugin } from "../../owl_plugins/model_owl_plugin";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { ChartDefinition } from "../../types/chart/chart";
import { Figure, FigureSize, FigureUI } from "../../types/figure";
import { UID } from "../../types/misc";
import {
  DraggedFigurePlugin,
  FAKE_DRAGGED_FIGURE_ID,
} from "../figures/figure_dnd_container/figure_dnd_owl_plugin";
import { OSComponent } from "../os_component";
import { cssPropertiesToCss, rectToCss } from "./css";
import { getElBoundingRect } from "./dom_helpers";
import { useSpreadsheetRect } from "./position_hook";

export function getDefaultChartFigureSize(type: ChartDefinition["type"]): FigureSize {
  if (type === "scorecard") {
    return { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT };
  }
  return { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
}

export function useChartDragAndDrop() {
  const draggedFigurePlugin = usePlugin(DraggedFigurePlugin);
  const zoomPlugin = usePlugin(ZoomPlugin);
  const model = usePlugin(ModelPlugin).model();
  const spreadsheetRect = useSpreadsheetRect();

  const startChartDragAndDrop = (ev: PointerEvent, definition: ChartDefinition) => {
    const dragContainerRect = draggedFigurePlugin.containerRect;
    const startX = ev.clientX / zoomPlugin.zoomLevel() - dragContainerRect.x - spreadsheetRect.x;
    const startY = ev.clientY / zoomPlugin.zoomLevel() - dragContainerRect.y - spreadsheetRect.y;
    const { width, height } = getDefaultChartFigureSize(definition.type);
    const figuresToDrag: FigureUI = {
      id: FAKE_DRAGGED_FIGURE_ID,
      col: 0,
      row: 0,
      offset: { x: 0, y: 0 },
      tag: "chart",
      width,
      height,
      x: startX - width / 2,
      y: startY - height / 2,
    };

    const onDragEnd = (
      ev: MouseEvent,
      droppedFigures: Figure[],
      overlappingFigureId: UID | undefined
    ) => {
      const droppedFigure = droppedFigures[0];
      if (!droppedFigure || (!overlappingFigureId && isMouseEventInPanel(ev))) {
        return;
      }
      const sheetId = model.getters.getActiveSheetId();
      const overlappingFigure = overlappingFigureId
        ? model.getters.getFigure(sheetId, overlappingFigureId)
        : undefined;
      let dropFigureId: UID | undefined = undefined;
      if (overlappingFigure?.tag === "carousel") {
        dropFigureId = dropFigureId = overlappingFigure.id;
        model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
          sheetId,
          figureId: overlappingFigure.id,
          newChartId: UuidGenerator.smallUuid(),
          chartDefinition: definition,
        });
      } else if (overlappingFigure?.tag === "chart") {
        dropFigureId = UuidGenerator.smallUuid();
        model.dispatch("CREATE_CHART_AND_MERGE_INTO_CAROUSEL", {
          chartId: UuidGenerator.smallUuid(),
          figureId: dropFigureId,
          sheetId,
          definition,
          baseFigureId: overlappingFigure.id,
        });
      } else {
        dropFigureId = UuidGenerator.smallUuid();
        model.dispatch("CREATE_CHART", {
          chartId: UuidGenerator.smallUuid(),
          figureId: dropFigureId,
          sheetId,
          size: { width, height },
          definition,
          col: droppedFigure.col,
          row: droppedFigure.row,
          offset: droppedFigure.offset,
        });
      }

      if (dropFigureId) {
        model.dispatch("SELECT_FIGURE", { figureId: dropFigureId });
      }
    };

    draggedFigurePlugin.startDraggingFigure(ev, {
      draggedFigureId: figuresToDrag.id,
      figuresToDrag: [figuresToDrag],
      callbacks: { onDragEnd },
      component: SimpleChartCanvas,
      componentProps: { definition },
    });
  };

  return { startChartDragAndDrop };
}

function isMouseEventInPanel(ev: MouseEvent) {
  const panelRect = getElBoundingRect((ev.target as HTMLElement)?.closest(".o-sidePanel") || null);
  return (
    ev.clientX >= panelRect.x &&
    ev.clientX <= panelRect.x + panelRect.width &&
    ev.clientY >= panelRect.y &&
    ev.clientY <= panelRect.y + panelRect.height
  );
}

class SimpleChartCanvas extends OSComponent {
  static template = xml/*xml*/ `<canvas class="position-absolute border os-theme-dependant" t-att-style="this.style" t-ref="this.canvasRef"/>`;

  canvasRef = signal.ref(HTMLCanvasElement);
  private zoomPlugin = usePlugin(ZoomPlugin);

  private props = useProps({
    definition: types.object<ChartDefinition>(),
    figureUI: types.object<FigureUI>(),
    style: types.string(),
  });

  setup() {
    let cleanupChart: (() => void) | undefined = undefined;
    onMounted(() => {
      const canvas = this.canvasRef();
      if (!canvas) {
        return;
      }

      const sheetId = this.model().getters.getActiveSheetId();
      const definition = this.props.definition;
      const getters = this.model().getters;
      const runtime = SpreadsheetChart.fromStrDefinition(getters, sheetId, definition).getRuntime(
        getters,
        "newChart",
        getters.getSpreadsheetTheme().colorThemeName
      );
      if ("chartJsConfig" in runtime && runtime.chartJsConfig.options) {
        runtime.chartJsConfig.options.responsive = false;
      }

      const zoom = this.zoomPlugin.zoomLevel();
      const { width, height } = this.props.figureUI;
      cleanupChart = drawChartOnCanvas(canvas, runtime, { width, height }, definition.type, zoom);
    });
    onWillDestroy(() => cleanupChart?.());
  }

  get style() {
    return (this.props.style || "") + ";" + cssPropertiesToCss(rectToCss(this.props.figureUI));
  }
}
