import { Component, useState } from "@odoo/owl";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";

interface Props {
  chartId: UID;
  definition: ScorecardChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
}

interface PanelState {
  keyValueDispatchResult?: DispatchResult;
  baselineDispatchResult?: DispatchResult;
}

export class ScorecardChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChartConfigPanel";
  static components = { SelectionInput, ChartErrorSection, Section };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

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
    ].filter((reason) => reason !== CommandResult.NoChanges);
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isKeyValueInvalid(): boolean {
    return !!this.state.keyValueDispatchResult?.isCancelledBecause(
      CommandResult.InvalidScorecardKeyValue
    );
  }

  get isBaselineInvalid(): boolean {
    return !!this.state.keyValueDispatchResult?.isCancelledBecause(
      CommandResult.InvalidScorecardBaseline
    );
  }

  onKeyValueRangeChanged(ranges: string[]) {
    this.keyValue = ranges[0];
    this.state.keyValueDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      keyValue: this.keyValue,
    });
  }

  updateKeyValueRange() {
    this.state.keyValueDispatchResult = this.props.updateChart(this.props.chartId, {
      keyValue: this.keyValue,
    });
  }

  getKeyValueRange(): string {
    return this.keyValue || "";
  }

  onBaselineRangeChanged(ranges: string[]) {
    this.baseline = ranges[0];
    this.state.baselineDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      baseline: this.baseline,
    });
  }

  updateBaselineRange() {
    this.state.baselineDispatchResult = this.props.updateChart(this.props.chartId, {
      baseline: this.baseline,
    });
  }

  getBaselineRange(): string {
    return this.baseline || "";
  }

  updateBaselineMode(ev) {
    this.props.updateChart(this.props.chartId, { baselineMode: ev.target.value });
  }
}
