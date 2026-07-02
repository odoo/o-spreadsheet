import { proxy } from "@odoo/owl";
import { CellValue } from "../../..";
import { Select } from "../../../components/select/select";
import { DEFAULT_SCORECARD_HEIGHT, DEFAULT_SCORECARD_WIDTH } from "../../../constants";
import {
  DATE_GRANULARITY_LABELS,
  DateGranularity,
} from "../../../helpers/data_statistics/dates_statistics";
import { StatSection } from "../../../helpers/data_statistics/statistics_items";
import { baseStatGroups } from "../../../helpers/data_statistics/statistics_suggestion";
import { SpreadsheetChart } from "../../../helpers/figures/chart";
import { drawScoreChart } from "../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../helpers/figures/charts/scorecard_chart_config_builder";
import { UuidGenerator } from "../../../helpers/uuid";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ScorecardChartRuntime } from "../../../types/chart/scorecard_chart";
import { ValueAndLabel } from "../../../types/misc";
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
  dateGranularityByCol = proxy<Record<number, DateGranularity>>({});

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get activeColIndex(): number {
    const sections = this.store.perColSections;
    if (!sections.length) {
      return 0;
    }
    return Math.min(this.selectedCol.index, sections.length - 1);
  }

  get activeColSection(): StatSection | undefined {
    const sections = this.store.perColSections;
    if (!sections.length) {
      return undefined;
    }
    const section = sections[this.activeColIndex];
    const col = this.store.perColAnalysis[this.activeColIndex];
    if (!col || col.type !== "date") {
      return section;
    }
    // baseStatGroups always returns a single group for a date column; any extra groups in
    // `section.groups` come from a cross-column pattern (e.g. Date vs Number) and must be kept.
    const [ownGroup] = baseStatGroups(
      this.env.model.getters,
      this.env.model.getters.getActiveSheetId(),
      col,
      section.range,
      this.selectedDateGranularity
    );
    return {
      ...section,
      groups: [ownGroup, ...section.groups.slice(1)],
    };
  }

  get showDateGranularitySelector(): boolean {
    return this.store.perColAnalysis[this.activeColIndex]?.type === "date";
  }

  get selectedDateGranularity(): DateGranularity {
    return this.dateGranularityByCol[this.activeColIndex] ?? "date";
  }

  get dateGranularityOptions(): ValueAndLabel[] {
    return Object.entries(DATE_GRANULARITY_LABELS).map(([value, label]) => ({ value, label }));
  }

  onDateGranularityChange(value: string) {
    this.dateGranularityByCol[this.activeColIndex] = value as DateGranularity;
  }

  get selectedColValue(): string {
    return String(this.activeColIndex);
  }

  onColChange(value: string) {
    this.selectedCol.index = Number(value);
    this.openDescriptionKey.value = "";
  }

  toggleDescription(key: string) {
    this.openDescriptionKey.value = this.openDescriptionKey.value === key ? "" : key;
  }

  startDragAndDrop(stat: { name: string; formula: string }, _ev: MouseEvent) {
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

    const label = document.createElement("div");
    label.className = "o-stat-dragged";
    label.style.width = `${DEFAULT_SCORECARD_WIDTH}px`;
    label.style.height = `${DEFAULT_SCORECARD_HEIGHT}px`;
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
    //@ts-ignore
    const getters = this.env.model.getters;
    const chart = SpreadsheetChart.fromStrDefinition(
      getters,
      getters.getActiveSheetId(),
      scorecardDefinition
    );
    const runtime = chart.getRuntime(getters, "myChart");
    const config = getScorecardConfiguration(
      { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT },
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
        const x = mouseEvent.clientX - gridRect.left + scrollX;
        const y = mouseEvent.clientY - gridRect.top + scrollY;
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
