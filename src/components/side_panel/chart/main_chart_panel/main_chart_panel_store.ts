import { chartRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
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
    // TODO FIXME: we probably shouldn't compare ids.
    if (
      newRanges?.every((range, i) =>
        deepEquals(range, savedCreationContext.dataSource?.dataSets?.[i])
      )
    ) {
      newRanges = Object.assign(
        [],
        savedCreationContext.dataSource?.dataSets,
        currentCreationContext?.dataSource?.dataSets
      );
    }

    this.creationContexts[chartId] = {
      ...savedCreationContext,
      ...currentCreationContext,
      dataSource: { dataSets: newRanges ?? [] },
      // dataSets: newRanges,
    };
    const figureId = this.getters.getFigureIdFromChartId(chartId);
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!sheetId) {
      return;
    }
    const definition = this.getChartDefinitionFromContextCreation(chartId, newDisplayType);
    this.model.dispatch("UPDATE_CHART", {
      definition,
      chartId,
      figureId,
      sheetId,
    });
  }

  private getChartDefinitionFromContextCreation(
    chartId: UID,
    newDisplayType: string
  ): ChartDefinition {
    const newChartInfo = chartSubtypeRegistry.get(newDisplayType);
    const ChartClass = chartRegistry.get(newChartInfo.chartType);
    return {
      ...ChartClass.getChartDefinitionFromContextCreation(this.creationContexts[chartId]),
      ...newChartInfo.subtypeDefinition,
    } as ChartDefinition;
  }
}
