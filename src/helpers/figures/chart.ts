import {
  ChartDataSourceBuilder,
  chartDataSourceRegistry,
} from "../../registries/chart_data_source_registry";
import {
  ChartJsEventHandlers,
  ChartTypeBuilder,
  chartTypeRegistry,
} from "../../registries/chart_registry";
import { CellValue } from "../../types/cells";
import {
  ChartCreationContext,
  ChartData,
  ChartDataSource,
  ChartDefinition,
  ChartType,
} from "../../types/chart/chart";
import { CoreGetters } from "../../types/core_getters";
import { FormulaOwnerId, makeFormulaOwnerId } from "../../types/formula_owner";
import { Getters } from "../../types/getters";
import { Matrix, RangeAdapterFunctions, UID, isMatrix } from "../../types/misc";
import { Range } from "../../types/range";
import { Validator } from "../../types/validator";

/**
 * Formula manager owner id for a chart's formula-valued `title.text`.
 * Shared with `ChartPlugin.getFormulaOwners`.
 */
export function getChartTitleFormulaOwnerId(chartId: UID): FormulaOwnerId {
  return makeFormulaOwnerId("chart", chartId, "title");
}

function formatChartTitleValue(value: CellValue | Matrix<CellValue> | undefined): string {
  if (value === undefined) {
    return "";
  }
  const scalar = isMatrix(value) ? value[0]?.[0] : value;
  return scalar === null || scalar === undefined ? "" : String(scalar);
}

export class SpreadsheetChart {
  private readonly dataSource: ChartDataSource<Range> | undefined;
  private titleFormulaOwnerIdComputed = false;
  private titleFormulaOwnerId: FormulaOwnerId | undefined;

  private constructor(
    private readonly getters: CoreGetters,
    readonly sheetId: UID,
    private readonly definition: ChartDefinition<Range>,
    private readonly chartTypeBuilder: ChartTypeBuilder<ChartType>, // e.g., BarChart, LineChart
    private readonly dataSourceBuilder: ChartDataSourceBuilder<unknown, unknown> // data comes from ranges, or a database
  ) {
    this.dataSource = definition.dataSource;
  }

  static fromStrDefinition(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartDefinition<string>
  ) {
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSource = dataSourceBuilder.fromExternalDefinition(
      definition.dataSource ?? { type: "none" },
      sheetId,
      getters
    );
    const rangeDefinition = {
      ...chartTypeBuilder.fromStrDefinition(definition, sheetId, getters),
      dataSource,
    } as ChartDefinition<Range>;
    return new SpreadsheetChart(
      getters,
      sheetId,
      SpreadsheetChart.deleteInvalidKeys(rangeDefinition),
      chartTypeBuilder,
      dataSourceBuilder
    );
  }

  static fromDefinition(getters: CoreGetters, sheetId: UID, definition: ChartDefinition<Range>) {
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    return new SpreadsheetChart(getters, sheetId, definition, chartTypeBuilder, dataSourceBuilder);
  }

  static validate(validator: Validator, definition: ChartDefinition<string>) {
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
    return validator.batchValidations(
      () => chartTypeBuilder.validateDefinition(validator, definition),
      () => dataSourceBuilder.validate(definition.dataSource ?? { type: "none" }, validator)
    )(undefined); // Typescript requires a parameter but we don't use it (`definition` is captured by closure)
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ChartDefinition<string>,
    rangeAdapters: RangeAdapterFunctions
  ) {
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    if (!definition.dataSource) {
      return chartTypeBuilder.transformDefinition(definition, chartSheetId, rangeAdapters);
    }
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
    const newDataSource = dataSourceBuilder.transform(
      definition.dataSource,
      chartSheetId,
      rangeAdapters
    );
    return {
      ...chartTypeBuilder.transformDefinition(definition, chartSheetId, rangeAdapters),
      dataSource: newDataSource,
    } as ChartDefinition<string>;
  }

  getRangeDefinition(): ChartDefinition<Range> {
    return {
      ...this.definition,
      dataSource: this.dataSource,
    } as ChartDefinition<Range>;
  }

  getDefinition(): ChartDefinition<string> {
    return {
      ...this.chartTypeBuilder.toStrDefinition(this.definition, this.sheetId, this.getters),
      dataSource:
        this.dataSource &&
        this.dataSourceBuilder.getDefinition(this.dataSource, this.sheetId, this.getters),
    } as ChartDefinition<string>;
  }

  updateRanges(rangeAdapters: RangeAdapterFunctions): ChartDefinition<Range> {
    return {
      ...this.chartTypeBuilder.updateRanges(this.definition, rangeAdapters, this.sheetId),
      dataSource:
        this.dataSource && this.dataSourceBuilder.adaptRanges(this.dataSource, rangeAdapters),
    } as ChartDefinition<Range>;
  }

  duplicateInDuplicatedSheet(sheetIdFrom: UID, sheetIdTo: UID): ChartDefinition<string> {
    const newDataSource =
      this.dataSource &&
      this.dataSourceBuilder.duplicateInDuplicatedSheet(
        this.dataSource,
        sheetIdFrom,
        sheetIdTo,
        this.getters
      );
    const newChartTypeDef = this.chartTypeBuilder.duplicateInDuplicatedSheet(
      this.definition,
      sheetIdFrom,
      sheetIdTo,
      this.getters
    );
    const definition = {
      ...newChartTypeDef,
      dataSource: newDataSource,
    } as ChartDefinition<Range>;
    return SpreadsheetChart.fromDefinition(this.getters, sheetIdTo, definition).getDefinition();
  }

  copyInSheetId(sheetIdTo: UID): ChartDefinition<Range> {
    const newChartTypeDef = this.chartTypeBuilder.copyInSheetId(
      this.definition,
      this.sheetId,
      sheetIdTo,
      this.getters
    );
    return {
      ...newChartTypeDef,
      dataSource: this.dataSource,
    } as ChartDefinition<Range>;
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...this.dataSourceBuilder.getContextCreation(definition.dataSource ?? { type: "none" }),
      ...this.chartTypeBuilder.getContextCreation(
        definition,
        this.dataSourceBuilder,
        definition.dataSource
      ),
    };
  }

  getDefinitionForExcel(getters: Getters) {
    const definition = this.definition;
    const excelDataSets = this.dataSourceBuilder.toExcelDataSets(
      this.dataSource,
      "dataSetStyles" in definition ? definition.dataSetStyles : {},
      getters
    );
    if (excelDataSets === undefined) {
      return undefined;
    }
    return this.chartTypeBuilder.getDefinitionForExcel(getters, definition, excelDataSets);
  }

  getData(getters: Getters, chartId: UID): ChartData {
    const dataSource = this.dataSource;
    return dataSource
      ? this.dataSourceBuilder.extractData(dataSource, chartId, getters)
      : { dataSetsValues: [], labelValues: [] };
  }

  getRuntime(getters: Getters, chartId: UID) {
    const dataSource = this.dataSource;
    const dataExtractors = dataSource
      ? {
          extractData: () => this.dataSourceBuilder.extractData(dataSource, chartId, getters),
          extractHierarchicalData: () =>
            this.dataSourceBuilder.extractHierarchicalData(dataSource, chartId, getters),
        }
      : {
          extractData: () => ({ dataSetsValues: [], labelValues: [] }),
          extractHierarchicalData: () => ({ dataSetsValues: [], labelValues: [] }),
        };
    const eventHandlers: ChartJsEventHandlers = {
      onClick: (event, items, chartJsChart) => {
        return this.dataSourceBuilder.onDataSetClick?.(
          this.definition.type,
          chartId,
          event,
          items,
          chartJsChart,
          getters
        );
      },
      onHover: (event, items, chartJsChart) =>
        this.dataSourceBuilder.onDataSetHover?.(
          this.definition.type,
          chartId,
          event,
          items,
          chartJsChart
        ),
    };
    return this.chartTypeBuilder.getRuntime(
      getters,
      this.getResolvedDefinition(getters, chartId),
      dataExtractors,
      this.sheetId,
      eventHandlers
    );
  }

  /**
   * The formula owner id for this chart's title, if `title.text` is a
   * formula (starts with "="); `undefined` for a literal title. Computed
   * once and memoized for this instance's lifetime — `SpreadsheetChart`
   * instances are already reconstructed wholesale on every relevant
   * definition change, so this naturally stays correct without needing to
   * re-derive the id from `chartId` on every call.
   */
  getTitleFormulaOwnerId(chartId: UID): FormulaOwnerId | undefined {
    if (!this.titleFormulaOwnerIdComputed) {
      this.titleFormulaOwnerId = this.computeTitleFormulaOwnerId(chartId);
      this.titleFormulaOwnerIdComputed = true;
    }
    return this.titleFormulaOwnerId;
  }

  private computeTitleFormulaOwnerId(chartId: UID): FormulaOwnerId | undefined {
    const text = this.definition.title?.text;
    return text?.startsWith("=") ? getChartTitleFormulaOwnerId(chartId) : undefined;
  }

  /**
   * If `title.text` is a formula, resolve it to its evaluated value through
   * the formula manager and return a definition with `title.text` replaced
   * by that computed string. Every chart type builder downstream keeps
   * treating `title.text` as a plain string, unaware of whether it came
   * from a literal or a formula.
   */
  private getResolvedDefinition(getters: Getters, chartId: UID): ChartDefinition<Range> {
    const id = this.getTitleFormulaOwnerId(chartId);
    if (!id) {
      return this.definition;
    }
    const value = getters.getFormulaOwnerValue(id);
    return {
      ...this.definition,
      title: { ...this.definition.title, text: formatChartTitleValue(value) },
    };
  }

  static deleteInvalidKeys(definition: ChartDefinition<any>) {
    definition = { ...definition };
    const keys = new Set(chartTypeRegistry.get(definition.type).allowedDefinitionKeys);
    for (const key of Object.keys(definition)) {
      if (!keys.has(key)) {
        delete definition[key];
      }
    }
    return definition;
  }
}
