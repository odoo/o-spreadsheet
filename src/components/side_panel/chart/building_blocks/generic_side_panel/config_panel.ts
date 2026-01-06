import { ChartTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { chartRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import {
  createValidRange,
  isDefined,
  isXcRepresentation,
  mergeContiguousZones,
  numberToLetters,
  splitReference,
  toUnboundedZone,
  toZone,
  zoneToXc,
} from "../../../../../helpers";
import { createDataSets } from "../../../../../helpers/figures/charts";
import { getChartColorsGenerator } from "../../../../../helpers/figures/charts/runtime";
import {
  ChartDatasetOrientation,
  ChartRangeDataSource,
  ChartWithDataSetDefinition,
  CommandResult,
  DataSetStyle,
  DispatchResult,
  UID,
  Zone,
} from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";
import { ChartDataSeries } from "../data_series/data_series";
import { ChartErrorSection } from "../error_section/error_section";
import { ChartLabelRange } from "../label_range/label_range";

interface ChartPanelState {
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
}

export class GenericChartConfigPanel<
  P extends ChartSidePanelProps<ChartWithDataSetDefinition> = ChartSidePanelProps<ChartWithDataSetDefinition>
> extends Component<P, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GenericChartConfigPanel";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
    Section,
    Checkbox,
    ChartErrorSection,
  };
  static props = ChartSidePanelPropsObject;

  protected state: ChartPanelState = useState({
    datasetDispatchResult: undefined,
    labelsDispatchResult: undefined,
  });

  protected dataSets: ChartRangeDataSource["dataSets"] = [];
  private labelRange: string | undefined;
  private datasetOrientation: ChartDatasetOrientation | undefined = undefined;

  protected chartTerms = ChartTerms;

  setup() {
    this.dataSets = this.props.definition.dataSource.dataSets;
    this.labelRange = this.props.definition.dataSource.labelRange;
    this.datasetOrientation = this.computeDatasetOrientation();
  }

  get errorMessages(): string[] {
    const cancelledReasons = [
      ...(this.state.datasetDispatchResult?.reasons || []),
      ...(this.state.labelsDispatchResult?.reasons || []),
    ].filter((reason) => reason !== CommandResult.NoChanges);
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isDatasetInvalid(): boolean {
    return !!this.state.datasetDispatchResult?.isCancelledBecause(CommandResult.InvalidDataSet);
  }

  get isLabelInvalid(): boolean {
    return !!this.state.labelsDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  get dataSetsHaveTitleLabel(): string {
    return this.datasetOrientation === "rows"
      ? _t("Use col %(column_name)s as headers", {
          column_name: numberToLetters(this.calculateHeaderPosition() || 0),
        })
      : _t("Use row %(row_position)s as headers", {
          row_position: this.calculateHeaderPosition() || "",
        });
  }

  getLabelRangeOptions() {
    const definition = this.props.definition;
    return [
      {
        name: "aggregated",
        label: this.chartTerms.AggregatedChart,
        value: ("aggregated" in definition ? definition.aggregated : false) ?? false,
        onChange: this.onUpdateAggregated.bind(this),
      },
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: definition.dataSource.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  onUpdateDataSetsHaveTitle(dataSetsHaveTitle: boolean) {
    this.props.updateChart(this.props.chartId, {
      dataSource: { ...this.props.definition.dataSource, dataSetsHaveTitle },
    });
  }

  get canChangeDatasetOrientation(): boolean {
    const sheetNames = new Set<string>();
    const datasetZones: Zone[] = [];
    const currentSheetName = this.env.model.getters.getActiveSheetName();
    const ranges = this.dataSets.map((ds) => ds.dataRange);
    if (this.labelRange) {
      ranges.push(this.labelRange);
    }
    for (const range of ranges) {
      if (!isXcRepresentation(range)) {
        return false;
      }
      const reference = splitReference(range);
      const zone = toUnboundedZone(reference.xc);
      if (zone.bottom === undefined || zone.right === undefined) {
        return false;
      }
      datasetZones.push(zone as Zone);
      sheetNames.add(reference.sheetName || currentSheetName);
      if (sheetNames.size > 1) {
        return false;
      }
    }
    const mergedZones = mergeContiguousZones(datasetZones);
    if (mergedZones.length !== 1) {
      return false;
    }
    const { left, right, top, bottom } = mergedZones[0];
    if (
      datasetZones.some(
        (zone) =>
          (zone.top !== top || zone.bottom !== bottom) &&
          (zone.left !== left || zone.right !== right)
      )
    ) {
      return false;
    }
    return true;
  }

  private computeDatasetOrientation(): ChartDatasetOrientation | undefined {
    let anyRow = false;
    let anyColumn = false;
    for (const dataSet of this.dataSets) {
      if (!isXcRepresentation(dataSet.dataRange)) {
        return undefined;
      }
      const zone = toUnboundedZone(dataSet.dataRange);
      if (zone.bottom === undefined || zone.right === undefined) {
        return undefined;
      }
      if (zone.top === zone.bottom) {
        anyRow = true;
      }
      if (zone.left === zone.right) {
        anyColumn = true;
      }
    }
    if (anyRow && !anyColumn) {
      return "rows";
    } else if (!anyRow && anyColumn) {
      return "columns";
    }
    return undefined;
  }

  setDatasetOrientation(datasetOrientation: ChartDatasetOrientation) {
    const dataSource = this.props.definition.dataSource;
    const oldDataSets = dataSource.dataSets;
    const dataRanges = oldDataSets.map((d) => d.dataRange);
    const dataSets = this.transposeDataSet(
      [dataSource.labelRange, ...dataRanges],
      datasetOrientation
    );
    // TODO: kill design
    if (dataSets.length === 0) {
      return;
    }
    const labelRange = dataSets.length > 1 ? dataSets.shift()!.dataRange : "";

    this.props.updateChart(this.props.chartId, {
      dataSource: { ...dataSource, labelRange, dataSets },
    });
    this.dataSets = dataSets;
    this.labelRange = labelRange;
    this.datasetOrientation = datasetOrientation;
  }

  /**
   * Change the local dataSeriesRanges. The model should be updated when the
   * button "confirm" is clicked
   */
  onDataSeriesRangesChanged(ranges: string[]) {
    this.dataSets = ranges.map((dataRange, i) => ({
      dataSetId: this.dataSets?.[i]?.dataSetId ?? this.env.model.uuidGenerator.smallUuid(),
      dataRange,
    }));
    this.state.datasetDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      dataSource: { ...this.props.definition.dataSource, dataSets: this.dataSets },
    });
  }

  onDataSeriesReordered(indexes: number[]) {
    const colorGenerator = getChartColorsGenerator(
      {
        dataSetStyles: this.props.definition.dataSetStyles,
        dataSource: { ...this.props.definition.dataSource, dataSets: this.dataSets },
      },
      this.dataSets.length
    );
    this.datasetOrientation = undefined;
    const dataSetStyles = this.props.definition.dataSetStyles;
    for (const ds of this.dataSets) {
      const color = colorGenerator.next();
      dataSetStyles[ds.dataSetId] = { backgroundColor: color, ...dataSetStyles[ds.dataSetId] };
    }
    this.dataSets = indexes.map((i) => this.dataSets[i]);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSource: { ...this.props.definition.dataSource, dataSets: this.dataSets },
      dataSetStyles,
    });
  }

  onDataSeriesRemoved(index: number) {
    const colorGenerator = getChartColorsGenerator(
      {
        dataSetStyles: this.props.definition.dataSetStyles,
        dataSource: { ...this.props.definition.dataSource, dataSets: this.dataSets },
      },
      this.dataSets.length
    );
    const dataSetStyles = this.props.definition.dataSetStyles;
    for (const ds of this.dataSets) {
      const color = colorGenerator.next();
      dataSetStyles[ds.dataSetId] = { backgroundColor: color, ...dataSetStyles[ds.dataSetId] };
    }
    const removedDataSetId = this.dataSets[index].dataSetId;
    delete dataSetStyles[removedDataSetId];
    this.dataSets = this.dataSets.filter((_, i) => i !== index);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSource: { ...this.props.definition.dataSource, dataSets: this.dataSets },
      dataSetStyles,
    });
  }

  onDataSeriesConfirmed() {
    const { dataSets, dataSetStyles } = this.splitRanges();
    this.dataSets = dataSets;
    this.datasetOrientation = this.computeDatasetOrientation();
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSource: { ...this.props.definition.dataSource, dataSets: this.dataSets },
      dataSetStyles,
    });
    if (this.state.datasetDispatchResult.isSuccessful) {
      this.dataSets = (
        this.env.model.getters.getChartDefinition(this.props.chartId) as ChartWithDataSetDefinition
      ).dataSource.dataSets;
    }
  }

  splitRanges() {
    const postProcessedRanges: ChartRangeDataSource["dataSets"] = [];
    const postProcessedStyles: DataSetStyle = {};
    const dataSetStyles = this.props.definition.dataSetStyles;
    for (const dataSet of this.dataSets) {
      const range = dataSet.dataRange;
      if (!this.env.model.getters.isRangeValid(range)) {
        postProcessedRanges.push(dataSet); // ignore invalid range
        continue;
      }

      const { sheetName } = splitReference(range);
      const sheetPrefix = sheetName ? `${sheetName}!` : "";
      const zone = toUnboundedZone(range);
      if (zone.bottom !== zone.top && zone.left !== zone.right) {
        if (this.datasetOrientation !== "rows") {
          if (zone.right !== undefined) {
            for (let j = zone.left; j <= zone.right; ++j) {
              const newDataSetId = dataSet.dataSetId + "_split" + j;
              const datasetOptions =
                j === zone.left
                  ? dataSetStyles[dataSet.dataSetId]
                  : { yAxisId: dataSetStyles[dataSet.dataSetId]?.yAxisId };
              postProcessedStyles[newDataSetId] = datasetOptions;
              postProcessedRanges.push({
                dataSetId: newDataSetId,
                dataRange: `${sheetPrefix}${zoneToXc({
                  left: j,
                  right: j,
                  top: zone.top,
                  bottom: zone.bottom,
                })}`,
              });
            }
          } else if (zone.bottom !== undefined) {
            for (let j = zone.top; j <= zone.bottom; ++j) {
              const newDataSetId = dataSet.dataSetId + "_split" + j;
              const datasetOptions =
                j === zone.top
                  ? dataSetStyles[dataSet.dataSetId]
                  : { yAxisId: dataSetStyles[dataSet.dataSetId]?.yAxisId };
              postProcessedStyles[newDataSetId] = datasetOptions;
              postProcessedRanges.push({
                dataSetId: newDataSetId,
                dataRange: `${sheetPrefix}${zoneToXc({
                  left: zone.left,
                  right: zone.right,
                  top: j,
                  bottom: j,
                })}`,
              });
            }
          }
        } else {
          if (zone.bottom !== undefined) {
            for (let j = zone.top; j <= zone.bottom; ++j) {
              const newDataSetId = dataSet.dataSetId + "_split" + j;
              const datasetOptions =
                j === zone.top
                  ? dataSetStyles[dataSet.dataSetId]
                  : { yAxisId: dataSetStyles[dataSet.dataSetId]?.yAxisId };
              postProcessedStyles[newDataSetId] = datasetOptions;
              postProcessedRanges.push({
                dataSetId: newDataSetId,
                dataRange: `${sheetPrefix}${zoneToXc({
                  left: zone.left,
                  right: zone.right,
                  top: j,
                  bottom: j,
                })}`,
              });
            }
          } else if (zone.right !== undefined) {
            for (let j = zone.left; j <= zone.right; ++j) {
              const newDataSetId = dataSet.dataSetId + "_split" + j;
              const datasetOptions =
                j === zone.left
                  ? dataSetStyles[dataSet.dataSetId]
                  : { yAxisId: dataSetStyles[dataSet.dataSetId]?.yAxisId };
              postProcessedStyles[newDataSetId] = datasetOptions;
              postProcessedRanges.push({
                dataSetId: newDataSetId,
                dataRange: `${sheetPrefix}${zoneToXc({
                  left: j,
                  right: j,
                  top: zone.top,
                  bottom: zone.bottom,
                })}`,
              });
            }
          }
        }
      } else {
        postProcessedRanges.push(dataSet);
        postProcessedStyles[dataSet.dataSetId] = dataSetStyles[dataSet.dataSetId];
      }
    }
    return {
      dataSets: postProcessedRanges,
      dataSetStyles: postProcessedStyles,
    };
  }

  getDataSeriesRanges() {
    return this.dataSets;
  }

  /**
   * Change the local labelRange. The model should be updated when the
   * button "confirm" is clicked
   */
  onLabelRangeChanged(ranges: string[]) {
    this.labelRange = ranges[0];
    this.state.labelsDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      dataSource: { ...this.props.definition.dataSource, labelRange: this.labelRange },
    });
  }

  onLabelRangeConfirmed() {
    this.state.labelsDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSource: { ...this.props.definition.dataSource, labelRange: this.labelRange },
    });
  }

  getLabelRange(): string {
    return this.labelRange || "";
  }

  onUpdateAggregated(aggregated: boolean) {
    this.props.updateChart(this.props.chartId, {
      aggregated,
    });
  }

  calculateHeaderPosition(): number | undefined {
    if (this.isDatasetInvalid || this.isLabelInvalid) {
      return undefined;
    }
    const getters = this.env.model.getters;
    const sheetId = getters.getActiveSheetId();
    const labelRange = createValidRange(getters, sheetId, this.labelRange);
    // const dataSets = createDataSets(
    //   getters,
    //   this.dataSets,
    //   sheetId,
    //   this.props.definition.dataSource.dataSetsHaveTitle
    // );
    const dataSets = createDataSets(
      getters,
      sheetId, // TODO check: this was using this.dataSets before
      this.props.definition.dataSource
    );
    if (dataSets.length) {
      return this.datasetOrientation === "rows"
        ? dataSets[0].dataRange.zone.left
        : dataSets[0].dataRange.zone.top + 1;
    } else if (labelRange) {
      return labelRange.zone.top + 1;
    }
    return undefined;
  }

  get maxNumberOfUsedRanges(): number | undefined {
    return chartRegistry.get(this.props.definition.type).dataSeriesLimit;
  }

  private transposeDataSet(
    dataRanges: (string | undefined)[],
    datasetOrientation: ChartDatasetOrientation | undefined
  ): { dataRange: string; dataSetId: UID }[] {
    const getters = this.env.model.getters;
    const uuidGenerator = this.env.model.uuidGenerator;
    const smallUuid = uuidGenerator.smallUuid.bind(uuidGenerator); // TODO refactor uuidGenerator to avoid binding
    if (datasetOrientation === undefined) {
      return dataRanges
        .filter(isDefined)
        .map((dataRange) => ({ dataRange, dataSetId: smallUuid() }));
    }
    const zonesBySheetName = {};
    const transposedDatasets: ChartRangeDataSource["dataSets"] = [];
    const figureId = getters.getFigureIdFromChartId(this.props.chartId);
    const figureSheetId = getters.getFigureSheetId(figureId);
    let name = getters.getActiveSheet().name;
    if (figureSheetId) {
      name = getters.getSheet(figureSheetId).name;
    }
    for (const dataRange of dataRanges) {
      if (!dataRange) {
        continue;
      }
      if (!isXcRepresentation(dataRange)) {
        return dataRanges
          .filter(isDefined)
          .map((dataRange) => ({ dataRange, dataSetId: smallUuid() }));
      }
      let { sheetName, xc } = splitReference(dataRange);
      sheetName = sheetName ?? name;
      if (!zonesBySheetName[sheetName]) {
        zonesBySheetName[sheetName] = [];
      }
      zonesBySheetName[sheetName].push(toZone(xc));
    }
    for (const sheetName in zonesBySheetName) {
      const zones = zonesBySheetName[sheetName];
      const contiguousZones = mergeContiguousZones(zones);
      if (datasetOrientation === "columns") {
        for (const zone of contiguousZones) {
          for (let col = zone.left; col <= zone.right; col++) {
            const dataRange = `${sheetName === name ? "" : sheetName + "!"}${zoneToXc({
              ...zone,
              left: col,
              right: col,
            })}`;
            transposedDatasets.push({ dataRange, dataSetId: smallUuid() });
          }
        }
      } else {
        for (const zone of contiguousZones) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            const dataRange = `${sheetName === name ? "" : sheetName + "!"}${zoneToXc({
              ...zone,
              top: row,
              bottom: row,
            })}`;
            transposedDatasets.push({ dataRange, dataSetId: smallUuid() });
          }
        }
      }
    }
    return transposedDatasets;
  }
}
