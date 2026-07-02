import { proxy } from "@odoo/owl";
import { Select } from "../../../components/select/select";
import {
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_KEY_VALUE_FONT_SIZE,
  DEFAULT_SCORECARD_WIDTH,
  SCORECARD_CHART_TITLE_FONT_SIZE,
} from "../../../constants";
import { StatSection } from "../../../helpers/data_statistics/statistics_items";
import { SpreadsheetChart } from "../../../helpers/figures/chart";
import { drawScoreChart } from "../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../helpers/figures/charts/scorecard_chart_config_builder";
import { UuidGenerator } from "../../../helpers/uuid";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { CellValue } from "../../../types/cells";
import { ScorecardChartRuntime } from "../../../types/chart/scorecard_chart";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Section } from "../components/section/section";
import { DataAnalysisStore } from "./data_analysis_store";

export class DataStatistics extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataStatistics";
  static components = {
    Section,
    Select,
  };

  store!: Store<DataAnalysisStore>;
  selectedCol = proxy({ index: 0 });
  openDescriptionKey = proxy({ value: "" });

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get activeColSection(): StatSection | undefined {
    return this.store.section;
  }

  toggleDescription(key: string) {
    this.openDescriptionKey.value = this.openDescriptionKey.value === key ? "" : key;
  }

  startDragAndDrop(stat: { name: string; formula: string }, _ev: MouseEvent) {
    const zoom = this.env.model.getters.getViewportZoomLevel();
    const dpr = typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;
    const startX = _ev.clientX / zoom;
    const startY = _ev.clientY / zoom;
    const gridOverlay = document.querySelector(".o-grid-overlay") as HTMLElement | null;
    if (!gridOverlay) {
      return;
    }

    const spreadsheet = document.querySelector(".o-spreadsheet") as HTMLElement | null;
    if (!spreadsheet) {
      return;
    }

    const label = document.createElement("div");
    label.className = "o-stat-dragged";
    label.style.width = `${(DEFAULT_SCORECARD_WIDTH * zoom) / dpr}px`;
    label.style.height = `${(DEFAULT_SCORECARD_HEIGHT * zoom) / dpr}px`;
    label.style.display = "none";
    const canvas = document.createElement("canvas");
    canvas.id = "canvas-id";
    label.appendChild(canvas);
    spreadsheet.appendChild(label);

    const scorecardDefinition = {
      title: { text: stat.name },
      type: "scorecard" as const,
      keyValueType: "formula" as const,
      keyValue: stat.formula,
      humanize: true,
      baselineMode: "text" as const,
      baselineColorUp: "#0F0",
      baselineColorDown: "#F00",
    };
    const getters = this.env.model.getters;
    const chart = SpreadsheetChart.fromStrDefinition(getters, getters.getActiveSheetId(), {
      ...scorecardDefinition,
      title: {
        text: stat.name,
        fontSize: (SCORECARD_CHART_TITLE_FONT_SIZE * zoom) / dpr,
      },
      keyDescr: {
        text: "",
        fontSize: (DEFAULT_SCORECARD_KEY_VALUE_FONT_SIZE * zoom) / dpr,
      },
    });
    const runtime = chart.getRuntime(getters, "myChart");
    const config = getScorecardConfiguration(
      {
        width: (DEFAULT_SCORECARD_WIDTH * zoom) / dpr,
        height: (DEFAULT_SCORECARD_HEIGHT * zoom) / dpr,
      },
      runtime as ScorecardChartRuntime
    );
    drawScoreChart(config, canvas);

    const onMouseMove = (e: MouseEvent) => {
      label.style.left = `${e.clientX}px`;
      label.style.top = `${e.clientY}px`;
      if (
        label.style.display === "none" &&
        (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5)
      ) {
        label.style.display = "block";
      }
    };

    const onMouseUp = (mouseEvent: MouseEvent) => {
      const gridOverlay = document.querySelector(".o-grid-overlay") as HTMLElement | null;
      if (!gridOverlay) {
        return;
      }
      const gridRect = gridOverlay.getBoundingClientRect();
      if (
        mouseEvent.clientX > gridRect.left &&
        mouseEvent.clientX < gridRect.right &&
        mouseEvent.clientY > gridRect.top &&
        mouseEvent.clientY < gridRect.bottom
      ) {
        const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
        const x = (mouseEvent.clientX - gridRect.left) / zoom + scrollX;
        const y = (mouseEvent.clientY - gridRect.top) / zoom + scrollY;
        const { col, row, offset } = this.env.model.getters.getPositionAnchorOffset({ x, y });
        this.env.model.dispatch("CREATE_CHART", {
          chartId: UuidGenerator.smallUuid(),
          figureId: UuidGenerator.smallUuid(),
          sheetId: this.env.model.getters.getActiveSheetId(),
          size: { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT },
          definition: scorecardDefinition,
          col,
          row,
          offset,
        });
      }
      spreadsheet.removeChild(label);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  async copyFormulaToClipboard(formula: string) {
    const value = this.env.model.getters.evaluateFormula(
      this.env.model.getters.getActiveSheetId(),
      formula
    ) as CellValue;
    this.env.model.dispatch("COPY_TO_CLIPBOARD", { data: { formula, value } });
    const osContent = await this.env.model.getters.getClipboardTextAndImageContent();
    await this.env.clipboard.write(osContent);
  }
}
