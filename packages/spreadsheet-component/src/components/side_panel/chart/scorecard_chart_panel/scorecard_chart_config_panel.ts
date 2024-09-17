import { Component, useState } from "@odoo/owl";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";

interface Props {
  figureId: UID;
  definition: ScorecardChartDefinition;
  canUpdateChart: (figureId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
}

interface PanelState {
  keyValueDispatchResult?: DispatchResult;
  baselineDispatchResult?: DispatchResult;
}

export class ScorecardChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChartConfigPanel";
  static components = { SelectionInput, ChartErrorSection, Section };
  static props = {
    figureId: String,
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
    ];
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
    this.state.keyValueDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      keyValue: this.keyValue,
    });
  }

  updateKeyValueRange() {
    this.state.keyValueDispatchResult = this.props.updateChart(this.props.figureId, {
      keyValue: this.keyValue,
    });
  }

  getKeyValueRange(): string {
    return this.keyValue || "";
  }

  onBaselineRangeChanged(ranges: string[]) {
    this.baseline = ranges[0];
    this.state.baselineDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      baseline: this.baseline,
    });
  }

  updateBaselineRange() {
    this.state.baselineDispatchResult = this.props.updateChart(this.props.figureId, {
      baseline: this.baseline,
    });
  }

  getBaselineRange(): string {
    return this.baseline || "";
  }

  updateBaselineMode(ev) {
    this.props.updateChart(this.props.figureId, { baselineMode: ev.target.value });
  }
}
