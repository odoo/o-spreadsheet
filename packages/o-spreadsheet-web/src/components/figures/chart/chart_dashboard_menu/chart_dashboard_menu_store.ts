import { ChartDefinition, ChartType, UID } from "../../../..";
import { chartRegistry, chartSubtypeRegistry } from "../../../../registries/chart_types";
import { Get } from "../../../../store_engine";
import { SpreadsheetStore } from "../../../../stores";

export class ChartDashboardMenuStore extends SpreadsheetStore {
  mutators = ["reset"] as const;
  private originalChartDefinition: ChartDefinition;
  constructor(get: Get, private chartId: UID) {
    super(get);
    this.originalChartDefinition = this.getters.getChartDefinition(this.chartId);
  }

  get changeChartTypeMenuItems() {
    const definition = this.getters.getChartDefinition(this.chartId);
    if (!["line", "bar", "pie"].includes(definition.type)) {
      return [];
    }

    return ["column", "line", "pie"].map((type) => {
      const item = chartSubtypeRegistry.get(type);
      return {
        id: item.chartType,
        label: item.displayName,
        onClick: () => this.updateType(item.chartType),
        isSelected: item.chartType === this.getters.getChartDefinition(this.chartId).type,
        iconClass: this.getIconClasses(item.chartType),
      };
    });
  }

  reset(chartId: UID) {
    this.chartId = chartId;
    this.originalChartDefinition = this.getters.getChartDefinition(chartId);
  }

  private updateType(type: ChartType) {
    const chartId = this.chartId;
    const currentDefinition = this.getters.getChartDefinition(chartId);
    if (currentDefinition?.type === type) {
      return;
    }

    let definition: ChartDefinition;
    if (this.originalChartDefinition.type === type) {
      definition = this.originalChartDefinition;
    } else {
      const newChartInfo = chartSubtypeRegistry.get(type);
      const ChartClass = chartRegistry.get(newChartInfo.chartType);
      const chartCreationContext = this.getters.getContextCreationChart(chartId);
      if (!chartCreationContext) return;
      definition = {
        ...ChartClass.getChartDefinitionFromContextCreation(chartCreationContext),
        ...newChartInfo.subtypeDefinition,
      } as ChartDefinition;
    }

    this.model.dispatch("UPDATE_CHART", {
      definition,
      chartId,
      figureId: this.getters.getFigureIdFromChartId(chartId),
      sheetId: this.getters.getActiveSheetId(),
    });
  }

  private getIconClasses(type: ChartType) {
    if (type.includes("bar")) {
      return "fa fa-bar-chart";
    }
    if (type.includes("line")) {
      return "fa fa-line-chart";
    }
    if (type.includes("pie")) {
      return "fa fa-pie-chart";
    }
    return "";
  }
}
