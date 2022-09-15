import { Component, useState } from "@odoo/owl";
import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import { LineChartDefinition } from "../../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../../types/chart/pie_chart";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";

interface Props {
  figureId: UID;
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition;
  updateChart: (
    definition: Partial<LineChartDefinition | BarChartDefinition | PieChartDefinition>
  ) => DispatchResult;
}

interface ChartPanelState {
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
}

export class LineBarPieConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LineBarPieConfigPanel";
  static components = { SelectionInput };

  private state: ChartPanelState = useState({
    datasetDispatchResult: undefined,
    labelsDispatchResult: undefined,
  });

  private dataSeriesRanges: string[] = [];
  private labelRange: string | undefined;

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

  get isLabelInvalid(): boolean {
    return !!this.state.labelsDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  onUpdateDataSetsHaveTitle(ev) {
    this.props.updateChart({
      dataSetsHaveTitle: ev.target.checked,
    });
  }

  /**
   * Change the local dataSeriesRanges. The model should be updated when the
   * button "confirm" is clicked
   */
  onDataSeriesRangesChanged(ranges: string[]) {
    this.dataSeriesRanges = ranges;
  }

  onDataSeriesConfirmed() {
    this.state.datasetDispatchResult = this.props.updateChart({
      dataSets: this.dataSeriesRanges,
    });
  }

  /**
   * Change the local labelRange. The model should be updated when the
   * button "confirm" is clicked
   */
  onLabelRangeChanged(ranges: string[]) {
    this.labelRange = ranges[0];
  }

  onLabelRangeConfirmed() {
    this.state.labelsDispatchResult = this.props.updateChart({
      labelRange: this.labelRange,
    });
  }
}

LineBarPieConfigPanel.props = {
  figureId: String,
  definition: Object,
  updateChart: Function,
};
