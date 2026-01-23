import { CellErrorType, CoreGetters, RangeAdapterFunctions, UID, Validator } from "../../..";
import {
  ChartDataSourceHandler,
  chartDataSourceRegistry,
} from "../../../registries/chart_data_source_registry";
import {
  ChartCreationContext,
  ChartDataSource,
  ChartRangeDataSource,
  DataSet,
  DataSetStyle,
  ExcelChartDataset,
} from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { Range } from "../../../types/range";
import { createValidRange } from "../../range";
import { getZoneArea } from "../../zones";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
  updateChartRangesWithDataSets,
} from "./chart_common";

export class ChartRangeDataSourceHandler implements ChartDataSourceHandler {
  private constructor(readonly dataSource: ChartRangeDataSource<Range>) {}

  static fromRanges(dataSource: ChartRangeDataSource<Range>) {
    return new ChartRangeDataSourceHandler(dataSource);
  }

  static fromRangeStr(
    getters: CoreGetters,
    defaultSheetId: UID,
    dataSource: ChartRangeDataSource<string>
  ): ChartRangeDataSourceHandler {
    const dataSets = createDataSets(getters, defaultSheetId, dataSource);
    const labelRange = createValidRange(getters, defaultSheetId, dataSource.labelRange);
    return new ChartRangeDataSourceHandler({ ...dataSource, dataSets, labelRange });
  }

  static fromContextCreation(context: ChartCreationContext): ChartRangeDataSource<string> {
    return {
      type: "range",
      dataSets: [],
      dataSetsHaveTitle: false,
      labelRange: context.auxiliaryRange,
      ...context.dataSource,
    };
  }

  static validate(validator: Validator, dataSource: ChartRangeDataSource<string>) {
    return validator.checkValidations(dataSource, checkDataset, checkLabelRange);
  }

  adaptRanges(rangeAdapters: RangeAdapterFunctions) {
    return updateChartRangesWithDataSets(rangeAdapters, this.dataSource);
  }

  getDefinition(getters: CoreGetters, defaultSheetId: UID): ChartDataSource<string> {
    return {
      labelRange: this.dataSource.labelRange
        ? getters.getRangeString(this.dataSource.labelRange, defaultSheetId)
        : undefined,
      type: "range",
      dataSets: this.dataSource.dataSets.map((dataSet) => ({
        dataSetId: dataSet.dataSetId,
        dataRange: getters.getRangeString(dataSet.dataRange, defaultSheetId),
      })),
      dataSetsHaveTitle: this.dataSource.dataSetsHaveTitle,
    };
  }

  duplicateInDuplicatedSheet(
    getters: CoreGetters,
    sheetIdFrom: UID,
    sheetIdTo: UID
  ): ChartRangeDataSource {
    return duplicateDataSourceInDuplicatedSheet(getters, sheetIdFrom, sheetIdTo, this.dataSource);
  }

  getContextCreation(dataSource: ChartRangeDataSource<string>): ChartCreationContext {
    return { auxiliaryRange: dataSource.labelRange };
  }

  getHierarchicalContextCreation(dataSource: ChartRangeDataSource<string>): ChartCreationContext {
    const leafRange = dataSource.dataSets.at(-1)?.dataRange;
    const dataSetsHaveTitle = dataSource.dataSetsHaveTitle;
    return {
      auxiliaryRange: leafRange,
      hierarchicalDataSource: dataSource,
      dataSource: dataSource.labelRange
        ? {
            type: "range",
            dataSets: [{ dataRange: dataSource.labelRange, dataSetId: "0" }],
            dataSetsHaveTitle,
          }
        : { type: "range", dataSets: [], dataSetsHaveTitle },
    };
  }

  toExcelDataSets(getters: CoreGetters, dataSetStyles: DataSetStyle) {
    const dataSets = this.dataSource.dataSets;
    const labelRange = this.dataSource.labelRange;
    const excelDataSets: ExcelChartDataset[] = dataSets
      .map((ds: DataSet) => toExcelDataset(getters, dataSetStyles, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
    const datasetLength = dataSets[0] ? getZoneArea(dataSets[0].dataRange.zone) : undefined;
    const labelLength = labelRange ? getZoneArea(labelRange.zone) : 0;
    const _shouldRemoveFirstLabel = shouldRemoveFirstLabel(
      labelLength,
      datasetLength,
      this.dataSource.dataSetsHaveTitle
    );
    const excelLabelRange = toExcelLabelRange(getters, labelRange, _shouldRemoveFirstLabel);
    return {
      dataSets: excelDataSets,
      labelRange: excelLabelRange,
    };
  }
}

class ChartNeverDataSourceHandler implements ChartDataSourceHandler {
  constructor(readonly dataSource: { type: "never" } = { type: "never" }) {}

  static fromRangeStr(): ChartNeverDataSourceHandler {
    return new ChartNeverDataSourceHandler();
  }

  static fromRanges() {
    return new ChartNeverDataSourceHandler();
  }

  static validate() {
    return CommandResult.Success;
  }

  adaptRanges() {
    return this.dataSource;
  }

  getDefinition(): ChartDataSource<string> {
    return this.dataSource;
  }

  duplicateInDuplicatedSheet(): ChartDataSource<Range> {
    return this.dataSource;
  }

  getContextCreation(): ChartCreationContext {
    return {};
  }

  getHierarchicalContextCreation(dataSource: ChartDataSource<string>): ChartCreationContext {
    return {};
  }

  toExcelDataSets() {
    return { dataSets: [], labelRange: "" };
  }
}

chartDataSourceRegistry.add("range", ChartRangeDataSourceHandler);
chartDataSourceRegistry.add("never", ChartNeverDataSourceHandler);
// allowedKeys: ["type", "dataSets", "dataSetsHaveTitle", "labelRange"],
