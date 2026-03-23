import { deepEquals } from "../../../../helpers";
import { SpreadsheetChart } from "../../../../helpers/figures/chart";
import { chartDataSourceRegistry } from "../../../../registries/chart_data_source_registry";
import { chartTypeRegistry } from "../../../../registries/chart_registry";
import { chartSubtypeRegistry } from "../../../../registries/chart_subtype_registry";
import { SpreadsheetStore } from "../../../../stores";
import {
  ChartCreationContext,
  ChartDataSource,
  ChartDefinition,
  ChartRangeDataSource,
  CustomizedDataSet,
  DataSetStyle,
  UID,
} from "../../../../types";

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
        currentDataSets &&
        savedDataSets &&
        this.dataSetsStartWithSameRanges(
          currentDataSets,
          savedDataSets,
          currentCreationContext?.dataSetStyles,
          savedCreationContext.dataSetStyles
        )
      ) {
        const merged = this.mergeDataSetStyles(
          currentDataSets,
          savedDataSets,
          currentCreationContext?.dataSetStyles,
          savedCreationContext.dataSetStyles
        );
        newRanges = merged.dataSets;
        dataSetStyles = merged.dataSetStyles;
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

  /**
   * Check that each range in `currentDataSets` matches the corresponding range
   * in `savedDataSets`. `savedDataSets` may be longer (e.g. when the current
   * chart type supports fewer datasets than the previous one), but the
   * overlapping portion must match.
   */
  private dataSetsStartWithSameRanges(
    currentDataSets: ChartRangeDataSource<string>["dataSets"],
    savedDataSets: ChartRangeDataSource<string>["dataSets"],
    currentStyles: DataSetStyle | undefined,
    savedStyles: DataSetStyle | undefined
  ): boolean {
    return currentDataSets.every((ds, i) => {
      const savedDs = savedDataSets[i];
      return (
        deepEquals(ds.dataRange, savedDs.dataRange) &&
        deepEquals(currentStyles?.[ds.dataSetId], savedStyles?.[savedDs.dataSetId])
      );
    });
  }

  /**
   * When dataset ranges are unchanged across a type switch, merge the styling
   * information (trend lines, colors, …) from both the current and the
   * previously saved creation contexts, and normalize dataset ids.
   */
  private mergeDataSetStyles(
    currentDataSets: ChartRangeDataSource<string>["dataSets"],
    savedDataSets: ChartRangeDataSource<string>["dataSets"],
    currentStyles: DataSetStyle | undefined,
    savedStyles: DataSetStyle | undefined
  ): {
    dataSets: { dataSetId: string; dataRange: string }[];
    dataSetStyles: Record<string, CustomizedDataSet>;
  } {
    const dataSets: { dataSetId: string; dataRange: string }[] = [];
    const dataSetStyles: Record<string, CustomizedDataSet> = {};
    for (let i = 0; i < savedDataSets.length; i++) {
      const ds = currentDataSets[i] ?? savedDataSets[i];
      const style = currentStyles?.[ds.dataSetId] ?? savedStyles?.[ds.dataSetId];
      const newId = i.toString();
      dataSets.push({ ...ds, dataSetId: newId });
      if (style) {
        dataSetStyles[newId] = style;
      }
    }
    return { dataSets, dataSetStyles };
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
    return SpreadsheetChart.deleteInvalidKeys(definition);
  }
}
