import { Component, useState } from "@odoo/owl";
import { _t } from "../../../../translation";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types";
import {
  TimeMatrixChartDefinition,
  TimeMatrixGroupBy,
} from "../../../../types/chart/time_matrix_chart";
import { ChartTerms } from "../../../translations_terms";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { Section } from "../../components/section/section";
import { ChartDataSeries } from "../building_blocks/data_series/data_series";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartLabelRange } from "../building_blocks/label_range/label_range";

interface Props {
  figureId: UID;
  definition: TimeMatrixChartDefinition;
  canUpdateChart: (figureId: UID, definition: Partial<TimeMatrixChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<TimeMatrixChartDefinition>) => DispatchResult;
}

interface ChartPanelState {
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
  currentAxis: "x" | "y";
}

export class TimeMatrixChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TimeMatrixConfigPanel";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
    ChartErrorSection,
    RadioSelection,
    BadgeSelection,
    Section,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  groupByChoices = [
    { value: "weekday", label: _t("Weekday") },
    { value: "hour", label: _t("Hour of Day") },
    { value: "monthday", label: _t("Day of Month") },
    { value: "month", label: _t("Month") },
    { value: "year", label: _t("Year") },
    { value: "date", label: _t("Date") },
  ];

  badgeAxes = [
    { value: "x", label: _t("Horizontal axis") },
    { value: "y", label: _t("Vertical axis") },
  ];

  protected state: ChartPanelState = useState({
    datasetDispatchResult: undefined,
    labelsDispatchResult: undefined,
    currentAxis: "x",
  });

  protected dataRange: string | undefined;
  private labelRange: string | undefined;

  protected chartTerms = ChartTerms;

  setup() {
    this.dataRange = this.props.definition.dataRange;
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

  getLabelRangeOptions() {
    return [];
  }

  getGroupByType(currentAxis: "x" | "y"): TimeMatrixGroupBy {
    return this.props.definition[`${currentAxis}Stamp`] || "year";
  }

  updateGroupBy(currentAxis: "x" | "y", value: TimeMatrixGroupBy) {
    this.props.updateChart(this.props.figureId, {
      [`${currentAxis}Stamp`]: value,
    });
  }

  /**
   * Change the local dataSeriesRanges. The model should be updated when the
   * button "confirm" is clicked
   */
  onDataSeriesRangesChanged(ranges: string[]) {
    this.dataRange = ranges[0];
    this.state.datasetDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      dataRange: this.dataRange,
    });
  }

  onDataSeriesConfirmed() {
    this.state.datasetDispatchResult = this.props.updateChart(this.props.figureId, {
      dataRange: this.dataRange,
    });
  }

  getDataSeriesRanges() {
    return [
      {
        dataRange: this.dataRange,
      },
    ];
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

  get maxNumberOfUsedRanges(): number | undefined {
    return 1;
  }
}
