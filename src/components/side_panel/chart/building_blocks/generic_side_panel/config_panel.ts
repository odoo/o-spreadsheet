import { Component, useState } from "@odoo/owl";
import {
  createValidRange,
  isDefined,
  isXcRepresentation,
  mergeContiguousZones,
  numberToLetters,
  splitReference,
  spreadRange,
  toUnboundedZone,
  toZone,
  zoneToXc,
} from "../../../../../helpers";
import { createDataSets } from "../../../../../helpers/figures/charts";
import { getChartColorsGenerator } from "../../../../../helpers/figures/charts/runtime";
import { _t } from "../../../../../translation";
import {
  ChartWithDataSetDefinition,
  CommandResult,
  CustomizedDataSet,
  DataStructure,
  DispatchResult,
  Getters,
  SpreadsheetChildEnv,
  UID,
} from "../../../../../types";
import { ChartTerms } from "../../../../translations_terms";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { ChartDataSeries } from "../data_series/data_series";
import { ChartErrorSection } from "../error_section/error_section";
import { ChartLabelRange } from "../label_range/label_range";

interface Props {
  figureId: UID;
  definition: ChartWithDataSetDefinition;
  canUpdateChart: (
    figureId: UID,
    definition: Partial<ChartWithDataSetDefinition>
  ) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

interface ChartPanelState {
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
}

export class GenericChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GenericChartConfigPanel";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
    Section,
    Checkbox,
    ChartErrorSection,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  protected state: ChartPanelState = useState({
    datasetDispatchResult: undefined,
    labelsDispatchResult: undefined,
  });

  protected dataSets: CustomizedDataSet[] = [];
  private labelRange: string | undefined;
  private dataStructure: DataStructure | undefined = undefined;

  protected chartTerms = ChartTerms;

  setup() {
    this.dataSets = this.props.definition.dataSets;
    this.labelRange = this.props.definition.labelRange;
    let anyRow = false;
    let anyColumn = false;
    for (const dataSet of this.dataSets) {
      if (!isXcRepresentation(dataSet.dataRange)) {
        return;
      }
      const zone = toUnboundedZone(dataSet.dataRange);
      if (zone.bottom === undefined || zone.right === undefined) {
        return;
      }
      if (zone.top === zone.bottom) {
        anyRow = true;
      }
      if (zone.left === zone.right) {
        anyColumn = true;
      }
    }
    if (anyRow && !anyColumn) {
      this.dataStructure = "asRows";
    } else if (!anyRow && anyColumn) {
      this.dataStructure = "asColumns";
    }
  }

  get errorMessages(): string[] {
    const cancelledReasons = [
      ...(this.state.datasetDispatchResult?.reasons || []),
      ...(this.state.labelsDispatchResult?.reasons || []),
    ];
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
    return this.dataStructure
      ? _t("Use col %s as headers", numberToLetters(this.calculateHeaderPosition() || 0))
      : _t("Use row %s as headers", this.calculateHeaderPosition() || "");
  }

  get canChangeDataStructure(): boolean {
    for (const dataSet of this.dataSets) {
      if (!isXcRepresentation(dataSet.dataRange)) {
        return false;
      }
      const zone = toUnboundedZone(dataSet.dataRange);
      if (zone.bottom === undefined || zone.right === undefined) {
        return false;
      }
    }
    if (this.labelRange && isXcRepresentation(this.labelRange)) {
      const zone = toUnboundedZone(this.labelRange);
      if (zone.bottom === undefined || zone.right === undefined) {
        return false;
      }
    } else {
      return false;
    }
    return true;
  }

  getLabelRangeOptions() {
    return [
      {
        name: "aggregated",
        label: this.chartTerms.AggregatedChart,
        value: this.props.definition.aggregated ?? false,
        onChange: this.onUpdateAggregated.bind(this),
      },
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: this.props.definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  onUpdateDataSetsHaveTitle(dataSetsHaveTitle: boolean) {
    this.props.updateChart(this.props.figureId, {
      dataSetsHaveTitle,
    });
  }

  get datasetStructures() {
    return [
      { value: "asColumns", label: _t("As Columns") },
      { value: "asRows", label: _t("As Rows") },
    ];
  }

  setDatasetStructure(dataStructure: DataStructure) {
    const oldDataSets = this.props.definition.dataSets;
    const dataRanges = oldDataSets.map((d) => d.dataRange);
    const dataSets = this.transposeDataSet(
      this.env.model.getters,
      [this.props.definition.labelRange, ...dataRanges],
      dataStructure,
      this.props.figureId
    );
    if (dataSets.length === 0) {
      return;
    }
    const labelRange = dataSets.shift()!.dataRange;

    this.props.updateChart(this.props.figureId, {
      labelRange,
      dataSets,
    });
    this.dataSets = dataSets;
    this.labelRange = labelRange;
    this.dataStructure = dataStructure;
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
    this.dataStructure = undefined;
    this.state.datasetDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      dataSets: this.dataSets,
    });
  }

  onDataSeriesReordered(indexes: number[]) {
    const colorGenerator = getChartColorsGenerator(
      { dataSets: this.dataSets },
      this.dataSets.length
    );
    const colors = this.dataSets.map((ds) => colorGenerator.next());
    this.dataSets = indexes.map((i) => ({
      backgroundColor: colors[i],
      ...this.dataSets[i],
    }));
    this.dataStructure = undefined;
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
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
    this.dataStructure = undefined;
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
      dataSets: this.dataSets,
    });
  }

  onDataSeriesConfirmed() {
    this.dataSets = this.transposeDataSet(
      this.env.model.getters,
      this.dataSets.map((ds) => ds.dataRange),
      this.dataStructure,
      this.props.figureId
    ).map((dataRange, i) => ({
      ...this.dataSets?.[i],
      ...dataRange,
    }));
    this.dataSets = spreadRange(this.env.model.getters, this.dataSets);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
      dataSets: this.dataSets,
    });
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
    this.state.labelsDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      labelRange: this.labelRange,
    });
  }

  onLabelRangeConfirmed() {
    this.state.labelsDispatchResult = this.props.updateChart(this.props.figureId, {
      labelRange: this.labelRange,
    });
  }

  getLabelRange(): string {
    return this.labelRange || "";
  }

  onUpdateAggregated(aggregated: boolean) {
    this.props.updateChart(this.props.figureId, {
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
      return this.dataStructure === "asColumns"
        ? dataSets[0].dataRange.zone.left
        : dataSets[0].dataRange.zone.top + 1;
    } else if (labelRange) {
      return labelRange.zone.top + 1;
    }
    return undefined;
  }

  private transposeDataSet(
    getters: Getters,
    dataRanges: (string | undefined)[],
    dataStructure: DataStructure | undefined,
    figureId: UID
  ): { dataRange: string }[] {
    if (dataStructure === undefined) {
      return dataRanges.filter(isDefined).map((dataRange) => ({ dataRange }));
    }
    const zonesBySheetName = {};
    const transposedDatasets: { dataRange: string }[] = [];
    const figureSheetId = getters.getFigureSheetId(figureId);
    let name = getters.getActiveSheet().name;
    if (figureSheetId) {
      name = getters.getSheet(figureSheetId).name;
    }
    for (const dataRange of dataRanges) {
      if (!dataRange) {
        continue;
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
      if (dataStructure === "asColumns") {
        for (const zone of contiguousZones) {
          for (let col = zone.left; col <= zone.right; col++) {
            const newRange = `${sheetName}!${zoneToXc({ ...zone, left: col, right: col })}`;
            transposedDatasets.push({ dataRange: newRange });
          }
        }
      } else {
        for (const zone of contiguousZones) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            const newRange = `${sheetName}!${zoneToXc({ ...zone, top: row, bottom: row })}`;
            transposedDatasets.push({ dataRange: newRange });
          }
        }
      }
    }
    return transposedDatasets;
  }
}
