import { chartTypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { chartSubtypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_subtype_registry";
import { deepEquals } from "../../../../helpers";
import { SpreadsheetStore } from "../../../../stores";
import { ChartCreationContext, ChartDefinition, UID } from "../../../../types";

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

    let newRanges = currentCreationContext?.dataSource?.dataSets;
    let dataSetStyles = savedCreationContext.dataSetStyles ?? currentCreationContext?.dataSetStyles;
    const savedDataSets = savedCreationContext.dataSource?.dataSets;
    const currentDataSets = currentCreationContext?.dataSource?.dataSets;
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

    this.creationContexts[chartId] = {
      ...savedCreationContext,
      ...currentCreationContext,
      dataSource: {
        dataSetsHaveTitle: false,
        ...savedCreationContext.dataSource,
        ...currentCreationContext?.dataSource,
        dataSets: newRanges ?? [],
      },
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
    const ChartClass = chartTypeRegistry.get(newChartInfo.chartType);
    return {
      ...ChartClass.getDefinitionFromContextCreation(this.creationContexts[chartId]),
      ...newChartInfo.subtypeDefinition,
    } as ChartDefinition;
  }
}
