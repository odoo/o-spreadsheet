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
import { chartRegistry } from "../../../../../registries/chart_types";
import { _t } from "../../../../../translation";
import {
  ChartDatasetOrientation,
  ChartWithDataSetDefinition,
  CommandResult,
  CustomizedDataSet,
  DispatchResult,
  SpreadsheetChildEnv,
  Zone,
} from "../../../../../types";
import { ChartTerms } from "../../../../translations_terms";
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

  protected dataSets: CustomizedDataSet[] = [];
  private labelRange: string | undefined;
  private datasetOrientation: ChartDatasetOrientation | undefined = undefined;

  protected chartTerms = ChartTerms;

  setup() {
    this.dataSets = this.props.definition.dataSets;
    this.labelRange = this.props.definition.labelRange;
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
        value: definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  onUpdateDataSetsHaveTitle(dataSetsHaveTitle: boolean) {
    this.props.updateChart(this.props.chartId, {
      dataSetsHaveTitle,
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
    const oldDataSets = this.props.definition.dataSets;
    const dataRanges = oldDataSets.map((d) => d.dataRange);
    const dataSets = this.transposeDataSet(
      [this.props.definition.labelRange, ...dataRanges],
      datasetOrientation
    );
    if (dataSets.length === 0) {
      return;
    }
    const labelRange = dataSets.length > 1 ? dataSets.shift()!.dataRange : "";

    this.props.updateChart(this.props.chartId, {
      labelRange,
      dataSets,
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
      ...this.dataSets?.[i],
      dataRange,
    }));
    this.state.datasetDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
  }

  onDataSeriesReordered(indexes: number[]) {
    const colorGenerator = getChartColorsGenerator(
      { dataSets: this.dataSets },
      this.dataSets.length
    );
    this.datasetOrientation = undefined;
    const colors = this.dataSets.map((ds) => colorGenerator.next());
    this.dataSets = indexes.map((i) => ({
      backgroundColor: colors[i],
      ...this.dataSets[i],
    }));
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
  }

  onDataSeriesRemoved(index: number) {
    const colorGenerator = getChartColorsGenerator(
      { dataSets: this.dataSets },
      this.dataSets.length
    );
    const colors = this.dataSets.map((ds) => colorGenerator.next());
    this.dataSets = this.dataSets
      .map((ds, i) => ({
        backgroundColor: colors[i],
        ...ds,
      }))
      .filter((_, i) => i !== index);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
  }

  onDataSeriesConfirmed() {
    this.dataSets = this.splitRanges;
    this.datasetOrientation = this.computeDatasetOrientation();
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    if (this.state.datasetDispatchResult.isSuccessful) {
      this.dataSets = (
        this.env.model.getters.getChartDefinition(this.props.chartId) as ChartWithDataSetDefinition
      ).dataSets;
    }
  }

  get splitRanges(): CustomizedDataSet[] {
    const postProcessedRanges: CustomizedDataSet[] = [];
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
              const datasetOptions = j === zone.left ? dataSet : { yAxisId: dataSet.yAxisId };
              postProcessedRanges.push({
                ...datasetOptions,
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
              const datasetOptions = j === zone.top ? dataSet : { yAxisId: dataSet.yAxisId };
              postProcessedRanges.push({
                ...datasetOptions,
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
              const datasetOptions = j === zone.top ? dataSet : { yAxisId: dataSet.yAxisId };
              postProcessedRanges.push({
                ...datasetOptions,
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
              const datasetOptions = j === zone.left ? dataSet : { yAxisId: dataSet.yAxisId };
              postProcessedRanges.push({
                ...datasetOptions,
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
      }
    }
    return postProcessedRanges;
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
      labelRange: this.labelRange,
    });
  }

  onLabelRangeConfirmed() {
    this.state.labelsDispatchResult = this.props.updateChart(this.props.chartId, {
      labelRange: this.labelRange,
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
    const dataSets = createDataSets(
      getters,
      this.dataSets,
      sheetId,
      this.props.definition.dataSetsHaveTitle
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
  ): { dataRange: string }[] {
    const getters = this.env.model.getters;
    if (datasetOrientation === undefined) {
      return dataRanges.filter(isDefined).map((dataRange) => ({ dataRange }));
    }
    const zonesBySheetName = {};
    const transposedDatasets: { dataRange: string }[] = [];
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
        return dataRanges.filter(isDefined).map((dataRange) => ({ dataRange }));
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
            transposedDatasets.push({ dataRange });
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
            transposedDatasets.push({ dataRange });
          }
        }
      }
    }
    return transposedDatasets;
  }
}
