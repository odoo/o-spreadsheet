import { markup, proxy } from "@odoo/owl";
import { CellValue } from "../../..";
import { DEFAULT_SCORECARD_HEIGHT, DEFAULT_SCORECARD_WIDTH } from "../../../constants";
import { drawScoreChart, ScorecardChart } from "../../../helpers/figures/charts/scorecard_chart";
import { getScorecardConfiguration } from "../../../helpers/figures/charts/scorecard_chart_config_builder";
import { UuidGenerator } from "../../../helpers/uuid";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ScorecardChartRuntime } from "../../../types/chart/scorecard_chart";
import { ValueAndLabel } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Select } from "../../select/select";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore, StatSection } from "./data_analysis_store";

export class DataStatistics extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataStatistics";
  static components = {
    Section,
    ChartSuggestionPreview,
    Select,
  };

  store!: Store<DataAnalysisStore>;
  selectedCol = proxy({ index: 0 });
  openDescriptionKey = proxy({ value: "" });

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get columnSelectOptions(): ValueAndLabel[] {
    return this.store.perColSections.map((s, i) => ({
      value: String(i),
      label: markup(
        `${s.title}&nbsp;<span class="text-muted fw-normal small">(${s.range})</span>`
      ) as unknown as string,
    }));
  }

  get activeColSection(): StatSection | undefined {
    const sections = this.store.perColSections;
    if (!sections.length) {
      return undefined;
    }
    return sections[Math.min(this.selectedCol.index, sections.length - 1)];
  }

  get selectedColValue(): string {
    const sections = this.store.perColSections;
    if (!sections.length) {
      return "0";
    }
    return String(Math.min(this.selectedCol.index, sections.length - 1));
  }

  onColChange(value: string) {
    this.selectedCol.index = Number(value);
    this.openDescriptionKey.value = "";
  }

  toggleDescription(key: string) {
    this.openDescriptionKey.value = this.openDescriptionKey.value === key ? "" : key;
  }

  startDragAndDrop(stat: { name: string; formula: string }, _ev: MouseEvent) {
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
    const runtime = ScorecardChart.getRuntime(
      this.env.model.getters,
      scorecardDefinition,
      this.env.model.getters.getActiveSheetId(),
      undefined
    ) as ScorecardChartRuntime;
    const design = getScorecardConfiguration(
      { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT },
      runtime
    );
    drawScoreChart(design, canvas);

    const onMouseMove = (e: MouseEvent) => {
      label.style.left = `${e.clientX}px`;
      label.style.top = `${e.clientY}px`;
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
