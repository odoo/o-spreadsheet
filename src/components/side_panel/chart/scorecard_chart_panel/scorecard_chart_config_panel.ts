import { proxy } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { BaselineMode, ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { CommandResult, DispatchResult, ValueAndLabel } from "../../../../types/index";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Select } from "../../../select/select";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

interface PanelState {
  keyValueDispatchResult?: DispatchResult;
  baselineDispatchResult?: DispatchResult;
}

export class ScorecardChartConfigPanel extends Component<
  ChartSidePanelProps<ScorecardChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ScorecardChartConfigPanel";
  static components = { SelectionInput, ChartErrorSection, Section, Select };
  static props = ChartSidePanelPropsObject;

  private state: PanelState = proxy({
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

  updateBaselineMode(baselineMode: BaselineMode) {
    this.props.updateChart(this.props.chartId, { baselineMode });
  }

  get baselineModeOptions(): ValueAndLabel[] {
    return [
      { value: "text", label: _t("Absolute value") },
      { value: "difference", label: _t("Value change from key value") },
      { value: "percentage", label: _t("Percentage change from key value") },
      { value: "progress", label: _t("Progress bar") },
    ];
  }
}
