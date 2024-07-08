import { Component, useState } from "@odoo/owl";
import { createValidRange, spreadRange } from "../../../../../helpers";
import { createDataSets } from "../../../../../helpers/figures/charts";
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

  private state: ChartPanelState = useState({
    datasetDispatchResult: undefined,
    labelsDispatchResult: undefined,
  });

  private dataSeriesRanges: CustomizedDataSet[] = [];
  private labelRange: string | undefined;

  protected chartTerms = ChartTerms;

  setup() {
    this.dataSeriesRanges = this.props.definition.dataSets;
    this.labelRange = this.props.definition.labelRange;
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
    return _t("Use row %s as headers", this.calculateHeaderPosition() || "");
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

  /**
   * Change the local dataSeriesRanges. The model should be updated when the
   * button "confirm" is clicked
   */
  onDataSeriesRangesChanged(ranges: string[]) {
    let yAxisId: string | undefined = undefined;
    if (this.dataSeriesRanges.length) {
      if (this.dataSeriesRanges.every((ds) => ds.yAxisId === "y")) {
        yAxisId = "y";
      } else if (this.dataSeriesRanges.every((ds) => ds.yAxisId === "y1")) {
        yAxisId = "y1";
      }
    }
    this.dataSeriesRanges = ranges.map((dataRange, i) => ({
      yAxisId,
      ...this.dataSeriesRanges?.[i],
      dataRange,
    }));
    this.state.datasetDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      dataSets: this.dataSeriesRanges,
    });
  }

  onDataSeriesConfirmed() {
    this.dataSeriesRanges = spreadRange(this.env.model.getters, this.dataSeriesRanges);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
      dataSets: this.dataSeriesRanges,
    });
  }

  getDataSeriesRanges() {
    return this.dataSeriesRanges;
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
      this.dataSeriesRanges,
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
