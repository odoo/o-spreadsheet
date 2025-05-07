import { Component, useState } from "@odoo/owl";
import { createValidRange, spreadRange } from "../../../../../helpers";
import { createDataSets } from "../../../../../helpers/figures/charts";
import { getChartColorsGenerator } from "../../../../../helpers/figures/charts/runtime";
import { _t } from "../../../../../translation";
import {
  ChartWithDataSetDefinition,
  CommandResult,
  CustomizedDataSet,
  DispatchResult,
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

  protected chartTerms = ChartTerms;

  setup() {
    this.dataSets = this.props.definition.dataSets;
    this.labelRange = this.props.definition.labelRange;
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
    return _t("Use row %s as headers", this.calculateHeaderPosition() || "");
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
    this.props.updateChart(this.props.figureId, {
      dataSetsHaveTitle,
    });
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
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
      dataSets: this.dataSets,
    });
  }

  onDataSeriesConfirmed() {
    this.dataSets = spreadRange(this.env.model.getters, this.dataSets);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
      dataSets: this.dataSets,
    });
    if (this.state.datasetDispatchResult.isSuccessful) {
      this.dataSets = (
        this.env.model.getters.getChartDefinition(this.props.figureId) as ChartWithDataSetDefinition
      ).dataSets;
    }
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
      return dataSets[0].dataRange.zone.top + 1;
    } else if (labelRange) {
      return labelRange.zone.top + 1;
    }
    return undefined;
  }
}
