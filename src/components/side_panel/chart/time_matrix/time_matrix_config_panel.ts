import { Component, useState } from "@odoo/owl";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types";
import { TimeMatrixChartDefinition } from "../../../../types/chart/time_matrix_chart";
import { ChartTerms } from "../../../translations_terms";
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
}

export class TimeMatrixChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TimeMatrixConfigPanel";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
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
