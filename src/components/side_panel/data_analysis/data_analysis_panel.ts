import { props, proxy, types } from "@odoo/owl";
import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
} from "../../../constants";
import { SpreadsheetChart } from "../../../helpers/figures/chart";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { drawGaugeChart } from "../../../helpers/figures/charts/gauge_chart_rendering";
import { drawScoreChart } from "../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../helpers/figures/charts/scorecard_chart_config_builder";
import { UuidGenerator } from "../../../helpers/uuid";
import { toZone } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ChartDefinition } from "../../../types/chart/chart";
import { GaugeChartRuntime } from "../../../types/chart/gauge_chart";
import { ScorecardChartRuntime } from "../../../types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { getCarouselOverlappingChart } from "../../figures/figure_container/figure_container";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = props({ onCloseSidePanel: types.function() });
  static components = {
    Section,
    ChartSuggestionPreview,
  };

  store!: Store<DataAnalysisStore>;
  selectedCol = proxy({ index: 0 });
  openDescriptionKey = proxy({ value: "" });

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get chartSuggestions(): ChartSuggestion[] {
    return getChartSuggestions(
      this.store.ranges?.map((range) => toZone(range)) ?? [],
      this.env.model.getters
    );
  }

  onStartChartSuggestionDrag(definition: ChartDefinition, _ev: MouseEvent) {
    const startX = _ev.clientX;
    const startY = _ev.clientY;
    const gridOverlay = document.querySelector(".o-grid-overlay") as HTMLElement | null;
    if (!gridOverlay) {
      return;
    }

    const spreadsheet = document.querySelector(".o-spreadsheet") as HTMLElement | null;
    if (!spreadsheet) {
      return;
    }

    const getters = this.env.model.getters;
    const activeSheetId = getters.getActiveSheetId();
    const runtime = SpreadsheetChart.fromStrDefinition(
      getters,
      activeSheetId,
      definition
    ).getRuntime(getters, "newChart");

    const label = document.createElement("div");
    label.className = "o-stat-dragged";
    const canvas = document.createElement("canvas");
    label.appendChild(canvas);
    spreadsheet.appendChild(label);
    let chart: any = undefined;
    let height = DEFAULT_FIGURE_HEIGHT;
    let width = DEFAULT_FIGURE_WIDTH;
    switch (definition.type) {
      case "scorecard": {
        height = DEFAULT_SCORECARD_HEIGHT;
        width = DEFAULT_SCORECARD_WIDTH;
        const design = getScorecardConfiguration(
          { width, height },
          runtime as ScorecardChartRuntime
        );
        drawScoreChart(design, canvas);
        break;
      }
      case "gauge": {
        drawGaugeChart(canvas, runtime as GaugeChartRuntime, 1, { width, height });
        break;
      }
      default: {
        chart = new globalThis.Chart!(canvas.getContext("2d")!, (runtime as any).chartJsConfig);
        break;
      }
    }
    label.style.width = `${width}px`;
    label.style.height = `${height}px`;
    label.style.display = "none";

    let highlightedCarouselEl: Element | null = null;
    const highlightCarousel = (figureId: string | undefined) => {
      if (highlightedCarouselEl) {
        highlightedCarouselEl.classList.remove("o-add-to-carousel");
        highlightedCarouselEl = null;
      }
      if (figureId) {
        const el = document.querySelector(`[data-id="${figureId}"].o-figure`);
        if (el) {
          el.classList.add("o-add-to-carousel");
          highlightedCarouselEl = el;
        }
      }
    };

    const getOverlappingCarousel = (clientX: number, clientY: number) => {
      const gridRect = gridOverlay.getBoundingClientRect();
      if (
        clientX < gridRect.left ||
        clientX > gridRect.right ||
        clientY < gridRect.top ||
        clientY > gridRect.bottom
      ) {
        return undefined;
      }
      const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
      const x = clientX - gridRect.left + scrollX;
      const y = clientY - gridRect.top + scrollY;
      return getCarouselOverlappingChart(
        { tag: "chart", x, y, width, height },
        this.env.model.getters.getVisibleFigures()
      );
    };

    const onMouseMove = (e: MouseEvent) => {
      label.style.left = `${e.clientX}px`;
      label.style.top = `${e.clientY}px`;
      if (
        label.style.display === "none" &&
        (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5)
      ) {
        label.style.display = "block";
      }
      const overlappingCarousel = getOverlappingCarousel(e.clientX, e.clientY);
      highlightCarousel(overlappingCarousel?.id);
    };

    const onMouseUp = (mouseEvent: MouseEvent) => {
      highlightCarousel(undefined);
      spreadsheet.removeChild(label);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      chart?.destroy();

      const gridRect = gridOverlay.getBoundingClientRect();
      if (
        mouseEvent.clientX < gridRect.left ||
        mouseEvent.clientX > gridRect.right ||
        mouseEvent.clientY < gridRect.top ||
        mouseEvent.clientY > gridRect.bottom
      ) {
        return;
      }

      const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
      const x = mouseEvent.clientX - gridRect.left + scrollX;
      const y = mouseEvent.clientY - gridRect.top + scrollY;
      const { col, row, offset } = this.env.model.getters.getPositionAnchorOffset({ x, y });
      const sheetId = this.env.model.getters.getActiveSheetId();
      const figureId = UuidGenerator.smallUuid();

      this.env.model.dispatch("CREATE_CHART", {
        chartId: UuidGenerator.smallUuid(),
        figureId,
        sheetId,
        size: { width, height },
        definition,
        col,
        row,
        offset,
      });

      const overlappingCarousel = getOverlappingCarousel(mouseEvent.clientX, mouseEvent.clientY);
      if (overlappingCarousel) {
        this.env.model.dispatch("ADD_FIGURES_CHART_TO_CAROUSEL", {
          sheetId,
          carouselFigureId: overlappingCarousel.id,
          chartFigureIds: [figureId],
        });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }
}
