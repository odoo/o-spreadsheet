import { MyChart } from "@odoo/o-spreadsheet-engine/helpers/figures/chart";
import { chartDataSourceRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import { chartTypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { chartSubtypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_subtype_registry";
import { deepEquals } from "../../../../helpers";
import { SpreadsheetStore } from "../../../../stores";
import { ChartCreationContext, ChartDataSource, ChartDefinition, UID } from "../../../../types";

export class MainChartPanelStore extends SpreadsheetStore {
  mutators = ["activatePanel", "changeChartType"] as const;
  panel: "configuration" | "design" = "configuration";
  private creationContexts: Record<UID, ChartCreationContext> = {};

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }

  changeChartType(chartId: UID, newDisplayType: string) {
    const currentCreationContext = this.getters.getContextCreationChart(chartId);
    const savedCreationContext = this.creationContexts[chartId] || {};

    let dataSetStyles = savedCreationContext.dataSetStyles ?? currentCreationContext?.dataSetStyles;
    let dataSource = {
      ...savedCreationContext.dataSource,
      ...currentCreationContext?.dataSource,
    };
    const currentContextDataSource = currentCreationContext?.dataSource;
    const savedContextDataSource = savedCreationContext.dataSource;
    if (
      (!currentContextDataSource || currentContextDataSource?.type === "range") &&
      (!savedContextDataSource || savedContextDataSource?.type === "range")
    ) {
      let newRanges = currentContextDataSource?.dataSets;
      const savedDataSets = savedContextDataSource?.dataSets;
      const currentDataSets = currentContextDataSource?.dataSets;
      if (
        savedDataSets &&
        currentDataSets &&
        currentDataSets.every((range, i) => deepEquals(range.dataRange, savedDataSets[i].dataRange))
      ) {
        newRanges = [];
        dataSetStyles = {};
        for (let i = 0; i < savedDataSets.length; i++) {
          const ds = currentDataSets[i] ?? savedDataSets[i];
          const style =
            currentCreationContext?.dataSetStyles?.[ds.dataSetId] ??
            savedCreationContext.dataSetStyles?.[ds.dataSetId];
          const newId = i.toString();
          newRanges.push({ ...ds, dataSetId: newId });
          if (style) {
            dataSetStyles[newId] = style;
          }
        }
      }
      dataSource = {
        type: "range",
        dataSetsHaveTitle: false,
        ...savedCreationContext.dataSource,
        ...currentCreationContext?.dataSource,
        dataSets: newRanges ?? [],
      };
    }

    this.creationContexts[chartId] = {
      ...savedCreationContext,
      ...currentCreationContext,
      dataSource: dataSource as ChartDataSource<string>,
      dataSetStyles,
    };
    const figureId = this.getters.getFigureIdFromChartId(chartId);
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!sheetId) {
      return;
    }
    const definition = this.getDefinitionFromContextCreation(chartId, newDisplayType);
    this.model.dispatch("UPDATE_CHART", {
      definition,
      chartId,
      figureId,
      sheetId,
    });
  }

  private getDefinitionFromContextCreation(chartId: UID, newDisplayType: string): ChartDefinition {
    const newChartInfo = chartSubtypeRegistry.get(newDisplayType);
    const creationContext = this.creationContexts[chartId];
    const ChartTypeBuilder = chartTypeRegistry.get(newChartInfo.chartType);
    const DataSourceBuilder = chartDataSourceRegistry.get(
      creationContext.dataSource?.type ?? "range"
    );
    const definition = {
      ...ChartTypeBuilder.getDefinitionFromContextCreation(creationContext, DataSourceBuilder),
      ...newChartInfo.subtypeDefinition,
    } as ChartDefinition;
    return MyChart.deleteInvalidKeys(definition);
  }
}
