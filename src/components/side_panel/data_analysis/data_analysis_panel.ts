import { onMounted, signal, usePlugin, useProps, xml } from "@odoo/owl";
import { SpreadsheetChart } from "../../../helpers/figures/chart";
import { drawChartOnCanvas } from "../../../helpers/figures/charts/chart_ui_common";
import { UuidGenerator } from "../../../helpers/uuid";
import { useLocalStore, useStore } from "../../../store_engine/store_hooks";
import { ViewportsStore } from "../../../stores/viewports_store";
import { ZoomStore } from "../../../stores/zoom_store";
import { ChartDefinition } from "../../../types/chart/chart";
import { Figure, FigureUI } from "../../../types/figure";
import { UID } from "../../../types/misc";
import { Store } from "../../../types/store_engine";
import {
  DraggedFigurePlugin,
  FAKE_DRAGGED_FIGURE_ID,
} from "../../figures/figure_dnd_container/figure_dnd_owl_plugin";
import { getDefaultChartFigureSize } from "../../helpers/chart_drag_and_drop";
import { cssPropertiesToCss, rectToCss } from "../../helpers/css";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";

export class DataAnalysisPanel extends OSComponent {
  static template = "o-spreadsheet-DataAnalysisPanel";
  static components = {
    Section,
    ChartSuggestionPreview,
  };

  store!: Store<DataAnalysisStore>;
  private draggedFigurePlugin = usePlugin(DraggedFigurePlugin);
  private zoomStore = useStore(ZoomStore);
  private viewStore = useStore(ViewportsStore);

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, ev: MouseEvent) {
    const dragContainerRect = this.draggedFigurePlugin.containerRect;
    const startX = ev.clientX / this.zoomStore.zoomLevel - dragContainerRect.x;
    const startY = ev.clientY / this.zoomStore.zoomLevel - dragContainerRect.y;
    const { width, height } = getDefaultChartFigureSize(definition.type);
    const figureWidth = width;
    const figureHeight = height;
    const figuresToDrag: FigureUI = {
      id: FAKE_DRAGGED_FIGURE_ID,
      col: 0,
      row: 0,
      offset: { x: 0, y: 0 },
      tag: "chart",
      width: figureWidth,
      height: figureHeight,
      x: startX - figureWidth / 2,
      y: startY - figureHeight / 2,
    };

    const onDragEnd = (droppedFigures: Figure[], overlappingFigureId: UID | undefined) => {
      const droppedFigure = droppedFigures[0];
      if (
        !droppedFigure ||
        (!overlappingFigureId && this.isDroppedFigureRightOfViewport(droppedFigure))
      ) {
        return;
      }
      const sheetId = this.model().getters.getActiveSheetId();
      const overlappingFigure = overlappingFigureId
        ? this.model().getters.getFigure(sheetId, overlappingFigureId)
        : undefined;
      const payload = {
        chartId: UuidGenerator.smallUuid(),
        figureId: UuidGenerator.smallUuid(),
        sheetId,
        size: { width, height },
        definition,
        col: droppedFigure.col,
        row: droppedFigure.row,
        offset: droppedFigure.offset,
      };
      if (overlappingFigure?.tag === "carousel") {
        this.model().dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
          sheetId,
          figureId: overlappingFigure.id,
          newChartId: UuidGenerator.smallUuid(),
          chartDefinition: definition,
        });
      } else if (overlappingFigure?.tag === "chart") {
        this.model().dispatch("CREATE_CHART_AND_MERGE_INTO_CAROUSEL", {
          chartId: payload.chartId,
          figureId: payload.figureId,
          sheetId: payload.sheetId,
          definition: payload.definition,
          baseFigureId: overlappingFigure.id,
        });
      } else {
        this.model().dispatch("CREATE_CHART", payload);
      }
    };

    this.draggedFigurePlugin.startDraggingFigure(ev, {
      draggedFigureId: figuresToDrag.id,
      figuresToDrag: [figuresToDrag],
      callbacks: { onDragEnd },
      component: SimpleChartCanvas,
      componentProps: { definition },
    });
  }

  private isDroppedFigureRightOfViewport(figure: Figure) {
    const sheetId = this.model().getters.getActiveSheetId();
    const figureUI = this.model().getters.getFigureUI(sheetId, figure);
    const middleOfFigureX = figureUI.x + figureUI.width / 2;
    const viewportX = this.viewStore.mainViewportCoordinates.x;
    const viewportWidth = this.viewStore.sheetViewDimension.width;
    const scrollX = this.viewStore.activeSheetScrollInfo.scrollX;
    const r = middleOfFigureX >= viewportX + viewportWidth + scrollX;

    return r;
  }
}

class SimpleChartCanvas extends OSComponent {
  static template = xml/*xml*/ `<canvas class="position-absolute border os-theme-dependant" t-att-style="this.style" t-ref="this.canvasRef"/>`;

  canvasRef = signal.ref(HTMLCanvasElement);
  private zoomStore = useStore(ZoomStore);

  private props = useProps({
    definition: types.object<ChartDefinition>(),
    figureUI: types.object<FigureUI>(),
    style: types.string(),
  });

  setup() {
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

      const zoom = this.zoomStore.zoomLevel;
      const { width, height } = this.props.figureUI;
      drawChartOnCanvas(canvas, runtime, { width, height }, definition.type, zoom);
    });
  }

  get style() {
    return (this.props.style || "") + ";" + cssPropertiesToCss(rectToCss(this.props.figureUI));
  }
}
