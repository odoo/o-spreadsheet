import { Component, useState } from "@odoo/owl";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";

interface Props {
  figureId: UID;
  definition: ScorecardChartDefinition;
  updateChart: (definition: Partial<ScorecardChartDefinition>) => DispatchResult;
}

interface PanelState {
  keyValueDispatchResult?: DispatchResult;
  baselineDispatchResult?: DispatchResult;
}

export class ScorecardChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChartConfigPanel";
  static components = { SelectionInput };

  private state: PanelState = useState({
    keyValueDispatchResult: undefined,
    baselineDispatchResult: undefined,
  });

  private keyValue: string | undefined = this.props.definition.keyValue;
  private baseline: string | undefined = this.props.definition.baseline;

  get errorMessages(): string[] {
    const cancelledReasons = [
      ...(this.state.keyValueDispatchResult?.reasons || []),
      ...(this.state.baselineDispatchResult?.reasons || []),
    ];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isKeyValueInvalid(): boolean {
    return !!(
      this.state.keyValueDispatchResult?.isCancelledBecause(CommandResult.EmptyScorecardKeyValue) ||
      this.state.keyValueDispatchResult?.isCancelledBecause(CommandResult.InvalidScorecardKeyValue)
    );
  }

  get isBaselineInvalid(): boolean {
    return !!this.state.keyValueDispatchResult?.isCancelledBecause(
      CommandResult.InvalidScorecardBaseline
    );
  }

  onKeyValueRangeChanged(ranges: string[]) {
    this.keyValue = ranges[0];
  }

  updateKeyValueRange() {
    this.state.keyValueDispatchResult = this.props.updateChart({
      keyValue: this.keyValue,
    });
  }

  onBaselineRangeChanged(ranges: string[]) {
    this.baseline = ranges[0];
  }

  updateBaselineRange() {
    this.state.baselineDispatchResult = this.props.updateChart({
      baseline: this.baseline,
    });
  }
}
